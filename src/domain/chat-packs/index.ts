import { LANGUAGES } from "@/lib/i18n/languages";
import { enPack } from "./en";
import type { ChatPack } from "./types";
import { viPack } from "./vi";

/** Mã các ngôn ngữ cho phép làm ngôn ngữ trả lời của chatbot (đăng ký ở lib/i18n/languages.ts) */
export type ChatLanguage = Extract<(typeof LANGUAGES)[number], { chat: true }>["code"];

/**
 * Gói câu chữ chatbot theo ngôn ngữ. Khai báo kiểu Record<ChatLanguage, …> nên khi đăng ký thêm ngôn ngữ có `chat: true`,
 * TypeScript báo lỗi tới khi gói của ngôn ngữ đó được thêm vào đây.
 */
export const CHAT_PACKS: Record<ChatLanguage, ChatPack> = { vi: viPack, en: enPack };

export type { ChatPack, TemplateCtx } from "./types";
