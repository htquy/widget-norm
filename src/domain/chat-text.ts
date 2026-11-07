import { LANGUAGES, languageEnglish } from "@/lib/i18n/languages";
import type { TemplateKind, HandoffReason } from "./decision";
import { CHAT_PACKS, type ChatLanguage, type ChatPack, type TemplateCtx } from "./chat-packs";

/**
 * Ngôn ngữ trả lời của chatbot (cài đặt theo từng bot, khác với ngôn ngữ giao diện của người dùng admin).
 * Danh sách ngôn ngữ nằm ở lib/i18n/languages.ts; câu chữ của từng ngôn ngữ nằm trong chat-packs/<mã>.ts.
 * File này chỉ giữ các hàm/hằng cũ (tra theo ngôn ngữ) để nơi gọi không phải đổi.
 */
export type ChatLang = ChatLanguage;
export const CHAT_LANGS = LANGUAGES.filter((l) => l.chat).map((l) => l.code) as readonly ChatLang[];
export const isChatLang = (v: unknown): v is ChatLang => (CHAT_LANGS as readonly unknown[]).includes(v);
export const CHAT_LANG_LABELS = Object.fromEntries(LANGUAGES.filter((l) => l.chat).map((l) => [l.code, l.name])) as Record<ChatLang, string>;

const packOf = (lang: ChatLang): ChatPack => CHAT_PACKS[lang];
const byLang = <T>(pick: (p: ChatPack) => T) => Object.fromEntries(CHAT_LANGS.map((l) => [l, pick(CHAT_PACKS[l])])) as Record<ChatLang, T>;

export const WEEKDAYS = byLang((p) => p.weekdays);
export const CLOSED_WORD = byLang((p) => p.closedWord);
/** Câu bot không giải quyết được (chuyển nhân viên / xin SĐT) — dùng nhận diện "chưa giải quyết" cho báo cáo */
export const UNRESOLVED = byLang((p) => p.unresolved);
export const SAFE_TEXTS = byLang((p) => p.safeText);
/** Bot đang chạy chế độ luật (chưa có AI) ở ngôn ngữ chưa có kịch bản theo ngành: trả lời trung thực */
export const RULES_FALLBACK = byLang((p) => p.rulesFallback);
export const RECAP_LABELS = byLang((p) => p.recap);

/**
 * Chỉ thị ngôn ngữ đặt ở ĐẦU và CUỐI system prompt (các phần ngành còn viết bằng tiếng Việt).
 * Ngôn ngữ chưa có chỉ thị riêng dùng mẫu chung theo tên tiếng Anh của ngôn ngữ.
 */
export const LANGUAGE_DIRECTIVE = byLang((p) => p.directive);
export function directiveFor(lang: ChatLang): string {
  const own = packOf(lang).directive;
  if (own || lang === "vi") return own;
  const name = languageEnglish(lang);
  return `LANGUAGE: Reply to the customer ONLY in ${name}, even if the customer writes in another language — the chatbot language is fixed to ${name} by the shop owner. Product data and shop information may be in Vietnamese: translate naturally (keep product names and SKUs; keep prices in VND with the ₫ symbol). Never mix Vietnamese words into your reply.`;
}

export type { TemplateCtx };
export const templateFor = (lang: ChatLang, kind: TemplateKind, c: TemplateCtx): string => packOf(lang).template(kind, c);
export const handoffFor = (lang: ChatLang, reason: HandoffReason, open: boolean, liveChat: boolean): string => packOf(lang).handoff(reason, open, liveChat);
/** Mặc định theo ngôn ngữ khi tạo bot mới hoặc khi đổi ngôn ngữ và chọn "đặt lại lời chào" */
export const defaultTexts = (lang: ChatLang, shopName: string) => packOf(lang).defaultTexts(shopName);
/** Chữ hiển thị trên widget do theme quyết định (tên trợ lý, phụ đề, nhãn nút mở chat) theo ngôn ngữ */
export const themeTexts = (lang: ChatLang, shopName: string) => packOf(lang).themeTexts(shopName);
