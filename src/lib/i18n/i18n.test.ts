import { describe, expect, it } from "vitest";
import { CHAT_PACKS } from "@/domain/chat-packs";
import { CHAT_LANGS, directiveFor, templateFor } from "@/domain/chat-text";
import { LOCALES, localeFromAcceptLanguage } from "./config";
import { allKeys, languageStatuses, missingKeys } from "./coverage";
import { BASE_LANGUAGE, FALLBACK_LANGUAGE, LANGUAGES } from "./languages";
import { lookup } from "./lookup";
import { DICTIONARIES } from "./messages";
import { makeT } from "./translate";
import { WIDGET_DICTIONARIES } from "./widget";

describe("đăng ký ngôn ngữ tập trung", () => {
  it("mỗi ngôn ngữ giao diện (trừ ngôn ngữ gốc) có từ điển giao diện + widget; ngôn ngữ chatbot có gói câu mẫu", () => {
    for (const l of LANGUAGES) {
      if (l.code !== BASE_LANGUAGE && l.ui) {
        expect(DICTIONARIES[l.code], `thiếu messages/${l.code}`).toBeDefined();
        expect(WIDGET_DICTIONARIES[l.code], `thiếu widget/${l.code}`).toBeDefined();
      }
      if (l.chat) expect(CHAT_PACKS[l.code as keyof typeof CHAT_PACKS], `thiếu chat-packs/${l.code}`).toBeDefined();
    }
    expect(LOCALES).toEqual(LANGUAGES.filter((l) => l.ui).map((l) => l.code));
    expect(CHAT_LANGS).toEqual(LANGUAGES.filter((l) => l.chat).map((l) => l.code));
  });

  it("tra bản dịch: ngôn ngữ đó → tiếng Anh → câu gốc; biến {n} được thay", () => {
    const dicts = { en: { "Xin chào": "Hello" }, ja: { "Xin chào": "こんにちは" } };
    expect(lookup(dicts, "ja", "Xin chào")).toBe("こんにちは");
    expect(lookup(dicts, "fr", "Xin chào")).toBe("Hello");
    expect(lookup(dicts, "fr", "Chưa dịch")).toBe("Chưa dịch");
    expect(lookup(dicts, BASE_LANGUAGE, "Xin chào")).toBe("Xin chào");
    expect(makeT("en")("Câu chưa từng có {n}", { n: 3 })).toBe("Câu chưa từng có 3");
  });

  it("Accept-Language xét theo thứ tự ưu tiên và mã vùng", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("fr-FR,vi;q=0.8")).toBe("vi");
    expect(localeFromAcceptLanguage("de,fr")).toBe("vi");
    expect(localeFromAcceptLanguage(null)).toBe("vi");
  });

  it("thống kê mức dịch: tiếng Anh đủ so với hợp khoá; thiếu thì liệt kê đúng câu", () => {
    const en = languageStatuses().find((l) => l.code === FALLBACK_LANGUAGE)!;
    expect(en.uiTotal).toBeGreaterThan(300);
    expect(en.uiDone).toBe(en.uiTotal);
    expect(missingKeys("ui", "en")).toEqual([]);
    expect(missingKeys("ui", "vi")).toEqual([]);
    expect(allKeys("widget").length).toBeGreaterThan(40);
  });

  it("gói chatbot hoàn chỉnh cho mọi ngôn ngữ chat; chỉ thị ngôn ngữ chỉ cần cho ngôn ngữ khác tiếng Việt", () => {
    for (const l of CHAT_LANGS) {
      const text = templateFor(l, "greeting", { botName: "Bot", shopName: "Shop", address: "", phone: "", email: "", hours: "" });
      expect(text.length).toBeGreaterThan(10);
      if (l !== BASE_LANGUAGE) expect(directiveFor(l)).toMatch(/ONLY in/);
    }
    expect(directiveFor("vi")).toBe("");
  });
});
