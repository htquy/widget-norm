import type { ChatTool, LlmGateway, LlmTurnResult } from "@/application/ports";
import { fold, keywords } from "@/domain/text";

/** Đoạn kiến thức shop khớp câu hỏi nhất (theo số từ khoá trùng) — trả nguyên văn, không bịa */
export function bestKnowledgeParagraph(knowledge: string, question: string): string | null {
  const words = keywords(question).filter((w) => w.length >= 3);
  if (!knowledge.trim() || words.length === 0) return null;
  // Ưu tiên tách theo mục (dòng trống) để giữ tiêu đề cùng nội dung; không có dòng trống thì tách từng dòng
  let paras = knowledge
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (paras.length === 1) paras = paras[0].split("\n").map((p) => p.trim()).filter(Boolean);
  let best: { p: string; s: number } | null = null;
  for (const p of paras) {
    const f = fold(p);
    const s = words.filter((w) => f.includes(w)).length;
    if (s > 0 && (!best || s > best.s)) best = { p, s };
  }
  return best && best.s >= Math.min(2, words.length) ? best.p.slice(0, 600) : null;
}

/**
 * Bot theo luật — trả lời khi LLM lỗi/hết hạn mức hoặc chưa có API key.
 * Hiểu: đặt lịch, tìm sản phẩm theo từ khoá, chính sách (tra đoạn trong Kiến thức cửa hàng), muốn gặp nhân viên.
 */
export class RuleBasedLlmGateway implements LlmGateway {
  readonly id = "rules";

  describe() {
    return { simple: "rules", complex: "rules" };
  }

  async respond({ system, history, user, tools }: { system: string; history: unknown[]; user: { text: string }; tools: ChatTool[] }): Promise<LlmTurnResult> {
    const t = fold(user.text);
    const tool = (n: string) => tools.find((x) => x.name === n);
    const knowledge = /<shop_knowledge>\n([\s\S]*?)\n<\/shop_knowledge>/.exec(system)?.[1] ?? "";
    let text: string;

    if (/(dat lich|dat hen|lich hen|book|giu cho|lich trong)/.test(t) && tool("open_booking_form")) {
      await tool("open_booking_form")!.run({});
      text = "Bạn chọn dịch vụ và khung giờ ở form bên dưới giúp mình nhé.";
    } else if (/(nhan vien|nguoi that|goi lai|khieu nai|phan nan)/.test(t) && tool("request_human")) {
      await tool("request_human")!.run({ reason: "customer_request" });
      text = "Mình đã báo nhân viên hỗ trợ bạn. Bạn để lại số điện thoại để được gọi lại sớm nhất nhé.";
    } else {
      const para = bestKnowledgeParagraph(knowledge, user.text);
      if (para && !/(\bgia\b|bao nhieu|san pham|\bmua\b)/.test(t)) {
        text = `Theo thông tin của shop:\n${para}`;
      } else {
        const found = (await tool("search_products")?.run({ query: user.text })) as { name: string; price: string }[] | { results: [] } | undefined;
        const list = Array.isArray(found) ? found : [];
        text = list.length
          ? `Mình tìm được ${list.length} sản phẩm phù hợp ở dưới (${list.map((p) => `${p.name} — ${p.price}`).join("; ")}). Bạn muốn xem chi tiết mẫu nào ạ?`
          : para
            ? `Theo thông tin của shop:\n${para}`
            : "Mình chưa có thông tin cho câu này. Bạn có thể hỏi về sản phẩm, đặt lịch, hoặc để lại số điện thoại để nhân viên tư vấn nhé.";
      }
    }
    return { text, history: [...history, { user: user.text, assistant: text }] };
  }
}
