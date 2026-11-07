import { describe, expect, it } from "vitest";
import { buildRecap, buildSystemPrompt, handoffText, templateText } from "@/application/use-cases/chat";
import { describeHours } from "@/domain/booking";
import { UNRESOLVED, defaultTexts, isChatLang } from "@/domain/chat-text";
import { defaultSettings, normalizeSettings, type Tenant } from "@/domain/tenant";
import { makeT } from "@/lib/i18n/translate";
import { localeFromAcceptLanguage } from "@/lib/i18n/config";

const tenant = (language: "vi" | "en"): Tenant => ({
  id: "t",
  accountId: "a",
  kind: "store",
  slug: "s",
  name: "Shop",
  status: "active",
  settings: { ...defaultSettings("Cozy Shop", language), phone: "0901", address: "1 Main St" },
  createdAt: new Date(),
});

describe("ngôn ngữ chatbot", () => {
  it("mặc định tiếng Việt; bot mới tiếng Anh có lời chào + nút gợi ý tiếng Anh", () => {
    expect(defaultSettings("X").language).toBe("vi");
    const en = defaultSettings("Cozy Shop", "en");
    expect(en.greeting).toContain("Cozy Shop");
    expect(en.greeting).toMatch(/^Hi!/);
    expect(en.quickReplies).toEqual(defaultTexts("en", "Cozy Shop").quickReplies);
    expect(en.quickReplies).toContain("Book an appointment");
  });

  it("cài đặt cũ trong DB (thiếu language) vẫn đọc được và là tiếng Việt; giá trị lạ → tiếng Việt", () => {
    expect(normalizeSettings({ shopName: "A" }).language).toBe("vi");
    expect(normalizeSettings({ shopName: "A", language: "fr" as never }).language).toBe("vi");
    expect(normalizeSettings({ shopName: "A", language: "en" }).language).toBe("en");
    expect(isChatLang("en")).toBe(true);
    expect(isChatLang("de")).toBe(false);
  });

  it("system prompt tiếng Anh: chỉ thị trả lời tiếng Anh ở đầu và cuối, giờ mở cửa tiếng Anh", () => {
    const p = buildSystemPrompt(tenant("en"), ["- Module line"]).split("\n");
    expect(p[0]).toMatch(/^LANGUAGE: Reply to the customer ONLY in English/);
    expect(p.at(-1)).toMatch(/^LANGUAGE: Reply/);
    expect(p.join("\n")).toContain("Monday: ");
    expect(p.join("\n")).toContain("- Module line");
    const vi = buildSystemPrompt(tenant("vi"));
    expect(vi).toContain("Nguyên tắc dữ liệu");
    expect(vi).not.toContain("LANGUAGE:");
  });

  it("câu mẫu, chuyển nhân viên và tóm tắt theo ngôn ngữ của bot", () => {
    expect(templateText("greeting", tenant("en"))).toContain("I'm");
    expect(templateText("greeting", tenant("vi"))).toContain("Chào bạn");
    expect(templateText("ask_contact", tenant("en"))).toContain("Opening hours");
    expect(handoffText(tenant("en"), "customer_request", new Date("2026-11-09T05:00:00Z"))).toContain("staff");
    expect(handoffText(tenant("vi"), "customer_request")).toContain("nhân viên");
    const turns = [{ id: "1", at: "", role: "user" as const, text: "hello" }, { id: "2", at: "", role: "assistant" as const, text: "hi" }];
    expect(buildRecap(turns, "en")).toContain("Customer: hello");
    expect(buildRecap(turns, "vi")).toContain("Khách: hello");
  });

  it("nhận diện câu 'chưa giải quyết' bằng cả hai ngôn ngữ", () => {
    expect(UNRESOLVED.en.test("Sorry, I don't have that information. Please leave your phone number.")).toBe(true);
    expect(UNRESOLVED.en.test("The sofa costs 10,000,000 ₫.")).toBe(false);
    expect(UNRESOLVED.vi.test("Mình chưa có thông tin này")).toBe(true);
  });

  it("giờ mở cửa hai ngôn ngữ", () => {
    const h = defaultSettings("A").hours;
    expect(describeHours(h, "en")).toMatch(/Monday: \d\d:\d\d–\d\d:\d\d/);
    expect(describeHours(h)).toMatch(/Thứ 2: /);
  });
});

describe("giao diện hai ngôn ngữ", () => {
  it("t() lấy bản dịch, thiếu thì trả câu gốc, hỗ trợ biến", () => {
    const en = makeT("en");
    const vi = makeT("vi");
    expect(en("Bảng giá")).toBe("Pricing");
    expect(vi("Bảng giá")).toBe("Bảng giá");
    expect(en("Câu chưa có bản dịch")).toBe("Câu chưa có bản dịch");
    expect(en("Quản lý chatbot ({n})", { n: 4 })).toBe("Manage chatbots (4)");
    expect(vi("Quản lý chatbot ({n})", { n: 4 })).toBe("Quản lý chatbot (4)");
  });
  it("chọn ngôn ngữ theo Accept-Language, mặc định tiếng Việt", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(localeFromAcceptLanguage("vi-VN,vi;q=0.9")).toBe("vi");
    expect(localeFromAcceptLanguage("fr-FR")).toBe("vi");
    expect(localeFromAcceptLanguage(null)).toBe("vi");
  });
});
