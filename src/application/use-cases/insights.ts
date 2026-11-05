import { DECISION_LABEL_TEXT, type DecisionLabel } from "@/domain/decision";
import { keywords } from "@/domain/product";
import type { DateRange, HandledBy, InsightRepository, LlmGateway } from "../ports";

export const HANDLED_BY_LABELS: Record<HandledBy, string> = {
  template: "Trả lời mẫu (không gọi LLM)",
  llm_simple: "LLM rẻ",
  llm_complex: "LLM mạnh",
  handoff: "Chuyển nhân viên",
  fallback_rules: "Bot theo luật (LLM lỗi)",
  human: "Nhân viên trả lời",
};

export interface InsightReport {
  total: number;
  unansweredCount: number;
  byLabel: { label: DecisionLabel; text: string; count: number }[];
  topics: { topic: string; count: number; unanswered: number; negative: number }[];
  sentiment: { sentiment: string; count: number }[];
  handledBy: { handledBy: HandledBy; text: string; count: number }[];
  daily: { day: string; total: number; unanswered: number }[];
  unanswered: { text: string; topic: string; at: Date; conversationId: string }[];
  /** Từ khoá xuất hiện nhiều trong nhu cầu khách */
  keywords: { word: string; count: number }[];
}

export interface NeedsSummary {
  source: "llm" | "keywords";
  model?: string;
  text: string;
  generatedAt: string;
}

const cache = new Map<string, { at: number; value: NeedsSummary }>();

export function makeInsights(deps: { insights: InsightRepository; llm: LlmGateway }) {
  return {
    async report(tenantId: string, range: DateRange): Promise<InsightReport> {
      const [byLabel, topics, sentiment, handledBy, daily, unanswered, needs] = await Promise.all([
        deps.insights.byLabel(tenantId, range),
        deps.insights.topTopics(tenantId, range, 15),
        deps.insights.sentiment(tenantId, range),
        deps.insights.handledBy(tenantId, range),
        deps.insights.daily(tenantId, range),
        deps.insights.unanswered(tenantId, range, 30),
        deps.insights.recentNeeds(tenantId, range, 400),
      ]);
      const freq = new Map<string, number>();
      for (const n of needs) for (const w of keywords(`${n.need} ${n.topic}`)) if (w.length >= 3) freq.set(w, (freq.get(w) ?? 0) + 1);
      return {
        total: byLabel.reduce((a, r) => a + r.count, 0),
        unansweredCount: daily.reduce((a, r) => a + r.unanswered, 0),
        byLabel: byLabel.map((r) => ({ ...r, text: DECISION_LABEL_TEXT[r.label] ?? r.label })),
        topics,
        sentiment,
        handledBy: handledBy.map((r) => ({ ...r, text: HANDLED_BY_LABELS[r.handledBy] ?? r.handledBy })),
        daily,
        unanswered,
        keywords: [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word, count]) => ({ word, count })),
      };
    },

    /**
     * Tóm tắt nhu cầu khách bằng LLM (gọi khi admin bấm nút, cache 10 phút).
     * Không có LLM → báo cáo từ khoá.
     */
    async summarizeNeeds(tenantId: string, range: DateRange, shopName: string): Promise<NeedsSummary> {
      const key = `${tenantId}:${range.from.toISOString().slice(0, 10)}:${range.to.toISOString().slice(0, 13)}`;
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < 10 * 60_000) return hit.value;

      const [needs, unanswered, topics] = await Promise.all([
        deps.insights.recentNeeds(tenantId, range, 200),
        deps.insights.unanswered(tenantId, range, 40),
        deps.insights.topTopics(tenantId, range, 20),
      ]);
      let value: NeedsSummary;
      if (needs.length === 0) {
        value = { source: "keywords", text: "Chưa có câu hỏi nào trong khoảng thời gian này.", generatedAt: new Date().toISOString() };
      } else if (deps.llm.complete) {
        const user = [
          `Cửa hàng: ${shopName}. Dưới đây là dữ liệu câu hỏi của khách qua chatbot.`,
          `Chủ đề (số lượt / chưa trả lời được / tiêu cực):`,
          ...topics.map((t) => `- ${t.topic}: ${t.count} / ${t.unanswered} / ${t.negative}`),
          `Nhu cầu khách (mẫu ${needs.length} câu gần nhất):`,
          ...needs.slice(0, 150).map((n) => `- [${n.label}] ${n.need}`),
          `Câu hỏi bot CHƯA trả lời được:`,
          ...unanswered.map((u) => `- ${u.text.slice(0, 160)}`),
        ].join("\n");
        try {
          const r = await deps.llm.complete({
            system:
              "Bạn là chuyên viên phân tích khách hàng. Viết báo cáo tiếng Việt ngắn gọn cho chủ cửa hàng, dạng gạch đầu dòng, gồm 4 mục: (1) 3–5 nhu cầu nổi bật nhất kèm ước lượng tỉ lệ, (2) sản phẩm/dịch vụ khách hỏi mà shop có thể đang thiếu, (3) câu hỏi nên bổ sung vào phần Kiến thức cửa hàng, (4) 2–3 hành động cụ thể nên làm tuần này. Chỉ dựa vào dữ liệu được cung cấp, không bịa số liệu.",
            user,
            tier: "simple",
            maxTokens: 900,
          });
          value = { source: "llm", model: r.usage.model, text: r.text, generatedAt: new Date().toISOString() };
        } catch (e) {
          console.warn("[insights] LLM tóm tắt lỗi", e);
          value = keywordSummary(needs, unanswered);
        }
      } else {
        value = keywordSummary(needs, unanswered);
      }
      cache.set(key, { at: Date.now(), value });
      return value;
    },
  };
}

function keywordSummary(needs: { need: string; topic: string }[], unanswered: { text: string }[]): NeedsSummary {
  const freq = new Map<string, number>();
  for (const n of needs) freq.set(n.topic, (freq.get(n.topic) ?? 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const text = [
    "Nhu cầu nổi bật (theo chủ đề):",
    ...top.map(([t, c]) => `- ${t}: ${c} lượt (${Math.round((c / needs.length) * 100)}%)`),
    unanswered.length ? `\nCó ${unanswered.length} câu bot chưa trả lời được — xem danh sách bên dưới và bổ sung vào Kiến thức cửa hàng.` : "",
  ].join("\n");
  return { source: "keywords", text, generatedAt: new Date().toISOString() };
}

export type Insights = ReturnType<typeof makeInsights>;
