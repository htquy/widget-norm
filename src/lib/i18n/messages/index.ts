import type { LangCode } from "../languages";
import { en } from "./en";

export type Dictionary = Record<string, string>;

/**
 * Từ điển giao diện website + admin theo ngôn ngữ. Tiếng Việt (ngôn ngữ gốc) không cần: câu gốc chính là khoá.
 * Thêm ngôn ngữ: tạo `./ja/index.ts` export một Dictionary rồi thêm vào đây (xem lib/i18n/languages.ts).
 */
export const DICTIONARIES: Partial<Record<LangCode, Dictionary>> = { en };
