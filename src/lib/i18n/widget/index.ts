import type { LangCode } from "../languages";
import { widgetEn } from "./en";

/**
 * Từ điển chữ trong widget chat theo ngôn ngữ của chatbot (tách khỏi từ điển admin để widget nhúng nhẹ).
 * Thêm ngôn ngữ: tạo `./ja.ts` rồi thêm vào đây.
 */
export const WIDGET_DICTIONARIES: Partial<Record<LangCode, Record<string, string>>> = { en: widgetEn };
