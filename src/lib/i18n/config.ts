import { BASE_LANGUAGE, LANGUAGES, intlLocale, languageName, type LangCode } from "./languages";

/** Ngôn ngữ giao diện website + admin (lấy từ đăng ký ngôn ngữ) */
export const LOCALES = LANGUAGES.filter((l) => l.ui).map((l) => l.code) as readonly LangCode[];
export type Locale = LangCode;
export const DEFAULT_LOCALE: Locale = BASE_LANGUAGE;
/** Cùng tên cookie với hub (skill-pages) để chọn ngôn ngữ một lần dùng cho cả hai (khi cùng domain) */
export const LOCALE_COOKIE = "locale";
export const LOCALE_LABELS: Record<string, string> = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.name]));
export { intlLocale, languageName };

export const isLocale = (v: unknown): v is Locale => typeof v === "string" && (LOCALES as readonly string[]).includes(v);

/** Ngôn ngữ từ header Accept-Language (xét lần lượt theo thứ tự ưu tiên); không rõ → mặc định */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale {
  for (const part of (header ?? "").toLowerCase().split(",")) {
    const tag = part.split(";")[0]?.trim() ?? "";
    if (!tag) continue;
    const hit = LOCALES.find((c) => tag === c || tag.startsWith(`${c}-`));
    if (hit) return hit;
  }
  return DEFAULT_LOCALE;
}

/** "Còn {n} ngày" + { n: 3 } → "Còn 3 ngày" */
export function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
