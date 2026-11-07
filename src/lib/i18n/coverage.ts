import { CHAT_PACKS } from "@/domain/chat-packs";
import { BASE_LANGUAGE, LANGUAGES, type LangCode } from "./languages";
import { DICTIONARIES } from "./messages";
import { WIDGET_DICTIONARIES } from "./widget";

export type Scope = "ui" | "widget";
type Dicts = Partial<Record<LangCode, Record<string, string>>>;
const SOURCES: Record<Scope, Dicts> = { ui: DICTIONARIES, widget: WIDGET_DICTIONARIES };

/** Mọi câu gốc (tiếng Việt) đã biết trong một phạm vi = hợp khoá của tất cả từ điển */
export function allKeys(scope: Scope): string[] {
  const set = new Set<string>();
  for (const d of Object.values(SOURCES[scope])) for (const k of Object.keys(d ?? {})) set.add(k);
  return [...set].sort((a, b) => a.localeCompare(b, "vi"));
}

/** Các câu chưa có bản dịch cho `lang` (rỗng cũng tính là thiếu) — để gửi cho người dịch */
export function missingKeys(scope: Scope, lang: LangCode): string[] {
  if (lang === BASE_LANGUAGE) return [];
  const dict = SOURCES[scope][lang] ?? {};
  return allKeys(scope).filter((k) => !dict[k]?.trim());
}

export interface LanguageStatus {
  code: LangCode;
  name: string;
  english: string;
  ui: boolean;
  chat: boolean;
  base: boolean;
  uiDone: number;
  uiTotal: number;
  widgetDone: number;
  widgetTotal: number;
  /** Đã có gói câu chữ chatbot (câu mẫu, chuyển nhân viên, chỉ thị ngôn ngữ…) */
  chatPack: boolean;
}

export function languageStatuses(): LanguageStatus[] {
  const uiTotal = allKeys("ui").length;
  const widgetTotal = allKeys("widget").length;
  return LANGUAGES.map((l) => {
    const base = l.code === BASE_LANGUAGE;
    return {
      code: l.code,
      name: l.name,
      english: l.english,
      ui: l.ui,
      chat: l.chat,
      base,
      uiTotal,
      widgetTotal,
      uiDone: base ? uiTotal : uiTotal - missingKeys("ui", l.code).length,
      widgetDone: base ? widgetTotal : widgetTotal - missingKeys("widget", l.code).length,
      chatPack: base || l.code in CHAT_PACKS,
    };
  });
}
