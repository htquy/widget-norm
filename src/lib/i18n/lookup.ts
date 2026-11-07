import { BASE_LANGUAGE, FALLBACK_LANGUAGE } from "./languages";

/** Tra bản dịch theo chuỗi ưu tiên: ngôn ngữ đó → tiếng Anh → câu gốc (tiếng Việt). Không phụ thuộc từ điển nào cụ thể. */
export function lookup(dicts: Partial<Record<string, Record<string, string>>>, lang: string, vi: string): string {
  if (lang === BASE_LANGUAGE) return vi;
  return dicts[lang]?.[vi] ?? dicts[FALLBACK_LANGUAGE]?.[vi] ?? vi;
}
