import Link from "next/link";
import { notFound } from "next/navigation";
import { DECISION_LABEL_TEXT, HANDOFF_REASON_LABELS, type DecisionLabel } from "@/domain/decision";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { AgentReplyForm } from "@/components/admin/AgentReplyForm";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { Badge, Card, PageHeader, btnPrimary, btnSecondary, fmtDateTime, fmtTime } from "@/components/admin/ui";
import { resolveAction, takeOverAction } from "../../../actions";

const ROUTE_TEXT = (r?: string) => {
  if (!r) return null;
  if (r.startsWith("template")) return "trả lời mẫu";
  if (r.startsWith("handoff")) return "chuyển nhân viên";
  if (r === "llm_simple") return "LLM rẻ";
  if (r === "llm_complex") return "LLM mạnh";
  return r;
};

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;
  const c = await app();
  const conv = await c.chat.get(s.tenantId, id);
  if (!conv) notFound();
  const leads = await c.leads.list(s.tenantId, {});
  const related = leads.filter((l) => l.conversationId === conv.id);

  return (
    <>
      <AutoRefresh seconds={5} />
      <PageHeader
        title="Chi tiết hội thoại"
        subtitle={`Khách ${conv.visitorId.slice(0, 8)} · bắt đầu ${fmtDateTime(conv.createdAt)}`}
        actions={
          <Link href="/admin/conversations" className={btnSecondary}>
            ← Danh sách
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Nội dung">
          <ol className="space-y-3">
            {conv.transcript.map((e) =>
              e.role === "system" ? (
                <li key={e.id} className="text-center text-[12.5px] text-[var(--fg-muted)]">
                  {e.text} · {fmtTime(new Date(e.at))}
                </li>
              ) : (
                <li key={e.id} className={`flex ${e.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[14px] ${e.role === "user" ? "bg-[var(--surface-2)]" : e.role === "agent" ? "bg-violet-50 ring-1 ring-violet-200" : "bg-blue-50 ring-1 ring-blue-100"}`}>
                    <p className="mb-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--fg-muted)]">
                      <b className="text-[var(--fg)]">{e.role === "user" ? "Khách" : e.role === "agent" ? (e.agentName ?? "Nhân viên") : "Bot"}</b>
                      {fmtTime(new Date(e.at))}
                      {e.role === "user" && e.meta?.label && (
                        <Badge tone={e.meta.sentiment === "negative" ? "red" : "gray"}>
                          {DECISION_LABEL_TEXT[e.meta.label as DecisionLabel] ?? e.meta.label}
                          {e.meta.confidence != null ? ` ${Math.round(e.meta.confidence * 100)}%` : ""}
                        </Badge>
                      )}
                      {e.role === "assistant" && e.meta?.route && <Badge tone="gray">{ROUTE_TEXT(e.meta.route)}</Badge>}
                      {e.meta?.unresolved && <Badge tone="amber">chưa giải quyết</Badge>}
                      {e.feedback === 1 && <Badge tone="green">👍 khách thấy hữu ích</Badge>}
                      {e.feedback === -1 && <Badge tone="red">👎 khách chưa hài lòng</Badge>}
                    </p>
                    <p className="whitespace-pre-wrap">{e.text}</p>
                    {e.meta?.model && <p className="mt-1 font-mono text-[11px] text-[var(--fg-muted)]">{e.meta.model}</p>}
                  </div>
                </li>
              ),
            )}
          </ol>
        </Card>

        <div className="space-y-4">
          <Card title="Hỗ trợ trực tiếp">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {conv.mode === "human" ? <Badge tone="violet">Nhân viên đang chat — bot tạm dừng</Badge> : <Badge tone="blue">Bot đang trả lời</Badge>}
              {conv.handoffStatus === "open" && <Badge tone="red">Cần hỗ trợ{conv.handoffReason ? `: ${HANDOFF_REASON_LABELS[conv.handoffReason]}` : ""}</Badge>}
              {conv.handoffStatus === "resolved" && <Badge tone="green">Đã xử lý</Badge>}
              {conv.rating && <Badge tone="amber">Khách đánh giá {conv.rating}★</Badge>}
            </div>
            <AgentReplyForm id={conv.id} />
            <div className="mt-3 flex flex-wrap gap-2">
              {conv.mode !== "human" && (
                <form action={takeOverAction}>
                  <input type="hidden" name="id" value={conv.id} />
                  <button className={btnPrimary}>Nhận cuộc chat</button>
                </form>
              )}
              {(conv.mode === "human" || conv.handoffStatus === "open") && (
                <form action={resolveAction}>
                  <input type="hidden" name="id" value={conv.id} />
                  <button className={btnSecondary}>Đã xử lý · trả lại cho bot</button>
                </form>
              )}
            </div>
            <p className="mt-3 text-[12.5px] text-[var(--fg-muted)]">Tin bạn gửi hiện ngay trong widget của khách (khách đang mở cửa sổ chat). Bot tự dừng khi bạn trả lời.</p>
          </Card>
          <Card title="Liên hệ khách để lại">
            {related.length === 0 ? (
              <p className="text-[14px] text-[var(--fg-muted)]">Khách chưa để lại số điện thoại.</p>
            ) : (
              <ul className="space-y-2 text-[14px]">
                {related.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`} className="font-medium underline">
                      {l.name} — {l.phone}
                    </Link>
                    {l.note && <p className="text-[13px] text-[var(--fg-muted)]">{l.note}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
