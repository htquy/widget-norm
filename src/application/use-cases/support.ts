import { newEntry, type Conversation, type TranscriptEntry } from "@/domain/conversation";
import { HANDOFF_REASON_LABELS, type HandoffReason } from "@/domain/decision";
import { DomainError } from "@/domain/errors";
import type { Tenant } from "@/domain/tenant";
import { withLock } from "../locks";
import type { ConversationRepository, DateRange, EventRepository, Notifier } from "../ports";
import type { Leads } from "./leads";

/**
 * Chuyển nhân viên (handoff) + live chat:
 * - Bot hoặc khách mở yêu cầu hỗ trợ → hội thoại vào hộp "Cần hỗ trợ", báo webhook.
 * - Nhân viên "nhận chat" → bot tạm dừng (mode = human), tin nhân viên hiện ngay trong widget (widget hỏi tin mới mỗi vài giây).
 * - "Trả lại cho bot" / "Đã xử lý" → bot trả lời tiếp.
 */
export function makeSupport(deps: { conversations: ConversationRepository; events: EventRepository; notifier: Notifier; leads: Leads; baseUrl: string }) {
  async function mutate(tenantId: string, id: string, fn: (c: Conversation) => void): Promise<Conversation> {
    return withLock(`conv:${id}`, async () => {
      const c = await deps.conversations.findById(tenantId, id);
      if (!c) throw new DomainError("CONVERSATION_NOT_FOUND", "Không tìm thấy hội thoại");
      fn(c);
      c.updatedAt = new Date();
      await deps.conversations.save(c);
      return c;
    });
  }

  return {
    /** Đánh dấu hội thoại cần nhân viên (gọi từ chat khi tầng quyết định chọn handoff, hoặc khách bấm nút) */
    async openHandoff(tenant: Tenant, conv: Conversation, reason: HandoffReason, visitorId: string) {
      if (conv.handoffStatus === "open") return;
      conv.handoffStatus = "open";
      conv.handoffReason = reason;
      await deps.events.record({ tenantId: tenant.id, visitorId, type: "handoff_requested", conversationId: conv.id });
      const last = [...conv.transcript].reverse().find((e) => e.role === "user")?.text ?? "";
      const text = [`Khách cần hỗ trợ — ${tenant.settings.shopName}`, `Lý do: ${HANDOFF_REASON_LABELS[reason]}`, last && `Câu hỏi: ${last.slice(0, 300)}`, `${deps.baseUrl}/admin/conversations/${conv.id}`]
        .filter(Boolean)
        .join("\n");
      deps.notifier.notify(tenant, "handoff", text, { conversationId: conv.id, reason }).catch((e) => console.error("notify failed", e));
    },

    /** Khách để lại SĐT trong thẻ "gặp nhân viên" */
    async requestCallback(input: { tenant: Tenant; visitorId: string; conversationId: string; name: string; phone: string; note: string }) {
      const lead = await deps.leads.capture({ ...input, source: "handoff" });
      await mutate(input.tenant.id, input.conversationId, (c) => {
        c.handoffStatus = "open";
        c.handoffReason ??= "customer_request";
        c.transcript = [...c.transcript, newEntry({ role: "system", internal: true, text: `Khách để lại số ${lead.phone} và chờ nhân viên gọi lại.` })];
      });
      const text = [`Khách xin gọi lại — ${input.tenant.settings.shopName}`, `${lead.name} — ${lead.phone}`, lead.note && `Nội dung: ${lead.note}`, `${deps.baseUrl}/admin/conversations/${input.conversationId}`]
        .filter(Boolean)
        .join("\n");
      deps.notifier.notify(input.tenant, "handoff", text, { lead, conversationId: input.conversationId }).catch((e) => console.error("notify failed", e));
      return lead;
    },

    /** Nhân viên nhận cuộc chat: bot dừng trả lời */
    takeOver: (tenantId: string, id: string, agentName: string) =>
      mutate(tenantId, id, (c) => {
        if (c.mode === "human") return;
        c.mode = "human";
        c.handoffStatus = "open";
        c.transcript = [...c.transcript, newEntry({ role: "system", text: `${agentName} đã tham gia cuộc trò chuyện.` })];
      }),

    agentReply: (tenantId: string, id: string, agentName: string, text: string) => {
      const t = text.trim().slice(0, 2000);
      if (!t) throw new DomainError("EMPTY", "Tin nhắn trống");
      return mutate(tenantId, id, (c) => {
        if (c.mode !== "human") {
          c.mode = "human";
          c.handoffStatus = "open";
          c.transcript = [...c.transcript, newEntry({ role: "system", text: `${agentName} đã tham gia cuộc trò chuyện.` })];
        }
        c.transcript = [...c.transcript, newEntry({ role: "agent", text: t, agentName })];
      });
    },

    /** Kết thúc hỗ trợ, bot trả lời tiếp */
    resolve: (tenantId: string, id: string) =>
      mutate(tenantId, id, (c) => {
        const wasHuman = c.mode === "human";
        c.mode = "bot";
        c.handoffStatus = "resolved";
        if (wasHuman) c.transcript = [...c.transcript, newEntry({ role: "system", text: "Nhân viên đã rời cuộc trò chuyện. Trợ lý tự động sẽ tiếp tục hỗ trợ bạn." })];
      }),

    /** Khách chấm từng câu trả lời 👍/👎 */
    feedback: (tenantId: string, id: string, entryId: string, value: 1 | -1) =>
      mutate(tenantId, id, (c) => {
        c.transcript = c.transcript.map((e) => (e.id === entryId && (e.role === "assistant" || e.role === "agent") ? { ...e, feedback: value } : e));
      }),

    /** Đánh giá chung 1–5 sao */
    rate: (tenantId: string, id: string, rating: number) => {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new DomainError("BAD_RATING", "Đánh giá từ 1 đến 5");
      return mutate(tenantId, id, (c) => {
        c.rating = rating;
      });
    },

    /** Tin nhắn mới sau một mốc (widget poll khi nhân viên đang chat) */
    async since(tenantId: string, id: string, afterId: string | null): Promise<{ entries: TranscriptEntry[]; mode: Conversation["mode"] }> {
      const c = await deps.conversations.findById(tenantId, id);
      if (!c) throw new DomainError("CONVERSATION_NOT_FOUND", "Không tìm thấy hội thoại");
      const idx = afterId ? c.transcript.findIndex((e) => e.id === afterId) : -1;
      return { entries: c.transcript.slice(idx + 1).filter((e) => e.role !== "user" && !e.internal), mode: c.mode };
    },

    counts: (tenantId: string) => deps.conversations.countByHandoff(tenantId),
    ratings: (tenantId: string, range: DateRange) => deps.conversations.ratingStats(tenantId, range),
  };
}

export type Support = ReturnType<typeof makeSupport>;
