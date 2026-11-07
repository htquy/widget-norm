import type { TemplateKind, HandoffReason } from "../decision";

export interface TemplateCtx {
  botName: string;
  shopName: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
}

/**
 * Gói câu chữ của chatbot cho MỘT ngôn ngữ trả lời. Thêm ngôn ngữ = viết một gói mới (TypeScript báo thiếu trường nào)
 * rồi đăng ký ở chat-packs/index.ts (xem lib/i18n/languages.ts).
 */
export interface ChatPack {
  weekdays: readonly string[];
  closedWord: string;
  /** Nhận diện câu bot không giải quyết được (báo cáo "chưa trả lời được") */
  unresolved: RegExp;
  /** Câu an toàn khi bộ kiểm tra chống bịa chặn câu trả lời */
  safeText: string;
  /** Chế độ luật (chưa có AI) khi không có kịch bản theo ngành bằng ngôn ngữ này; rỗng = dùng kịch bản tiếng Việt */
  rulesFallback: string;
  recap: { customer: string; agent: string; assistant: string; head: string; end: string };
  /** Chỉ thị ngôn ngữ đặt ở đầu/cuối system prompt; rỗng nếu ngôn ngữ đó là ngôn ngữ viết prompt ngành (tiếng Việt) */
  directive: string;
  template(kind: TemplateKind, c: TemplateCtx): string;
  handoff(reason: HandoffReason, open: boolean, liveChat: boolean): string;
  defaultTexts(shopName: string): { greeting: string; quickReplies: string[] };
  themeTexts(shopName: string): { botName: string; headerSubtitle: string; launcherLabel: string };
}
