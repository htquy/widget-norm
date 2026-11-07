import { interpolate, type Locale } from "./config";
import { lookup } from "./lookup";
import { DICTIONARIES } from "./messages";

/**
 * t("Câu tiếng Việt gốc", { n: 3 }): tiếng Việt là khoá và là bản gốc. Ngôn ngữ khác tra từ điển của nó,
 * thiếu thì rơi về tiếng Anh, thiếu nữa thì hiện câu gốc (không vỡ giao diện). Biến dạng {n}.
 */
export type Translate = (vi: string, vars?: Record<string, string | number>) => string;

export function makeT(locale: Locale): Translate {
  return (vi, vars) => interpolate(lookup(DICTIONARIES, locale, vi), vars);
}
