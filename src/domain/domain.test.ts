import { describe, expect, it } from "vitest";
import { atLocal, computeSlots, defaultBookingSettings, defaultHours, isOpenAt, localDate, localTime } from "./booking";
import { planRoute, type Decision } from "./decision";
import { normalizeVnPhone } from "./lead";
import { contrastRatio, sanitizeTheme, textOn } from "./theme";
import { normalizeSettings } from "./tenant";

describe("giờ Việt Nam", () => {
  it("quy đổi ngày giờ địa phương <-> UTC", () => {
    const d = atLocal("2026-11-06", "09:30");
    expect(d.toISOString()).toBe("2026-11-06T02:30:00.000Z");
    expect(localDate(new Date("2026-11-05T18:00:00Z"))).toBe("2026-11-06");
    expect(localTime(d)).toBe("09:30");
  });
});

describe("computeSlots", () => {
  const settings = { ...defaultBookingSettings(), capacity: 1, slotStepMin: 30, minLeadMin: 60 };
  const hours = defaultHours(); // Thứ 6: 08:00–20:00
  const now = atLocal("2026-11-06", "07:00"); // Thứ 6

  it("chỉ trả khung nằm trọn trong giờ mở cửa và sau thời gian đặt trước tối thiểu", () => {
    const slots = computeSlots({ date: "2026-11-06", hours, settings, durationMin: 60, existing: [], now });
    expect(slots[0].time).toBe("08:00");
    expect(slots.at(-1)!.time).toBe("19:00");
    const later = computeSlots({ date: "2026-11-06", hours, settings, durationMin: 60, existing: [], now: atLocal("2026-11-06", "10:10") });
    expect(later[0].time).toBe("11:30");
  });

  it("bỏ khung đã kín theo sức chứa, kể cả chồng lấn một phần", () => {
    const existing = [{ startAt: atLocal("2026-11-06", "09:00"), endAt: atLocal("2026-11-06", "10:00"), status: "confirmed" as const }];
    const times = computeSlots({ date: "2026-11-06", hours, settings, durationMin: 60, existing, now }).map((s) => s.time);
    expect(times).not.toContain("08:30");
    expect(times).not.toContain("09:00");
    expect(times).not.toContain("09:30");
    expect(times).toContain("08:00");
    expect(times).toContain("10:00");
    // lịch đã huỷ không giữ chỗ
    const cancelled = [{ ...existing[0], status: "cancelled" as const }];
    expect(computeSlots({ date: "2026-11-06", hours, settings, durationMin: 60, existing: cancelled, now }).map((s) => s.time)).toContain("09:00");
  });

  it("ngày nghỉ, ngày quá khứ, quá xa → không có khung", () => {
    expect(computeSlots({ date: "2026-11-06", hours, settings: { ...settings, closedDates: ["2026-11-06"] }, durationMin: 30, existing: [], now })).toEqual([]);
    expect(computeSlots({ date: "2026-11-05", hours, settings, durationMin: 30, existing: [], now })).toEqual([]);
    expect(computeSlots({ date: "2027-01-30", hours, settings, durationMin: 30, existing: [], now })).toEqual([]);
    expect(computeSlots({ date: "2026-11-06", hours: { ...hours, 5: null }, settings, durationMin: 30, existing: [], now })).toEqual([]);
  });

  it("isOpenAt", () => {
    expect(isOpenAt(hours, [], atLocal("2026-11-06", "08:00"))).toBe(true);
    expect(isOpenAt(hours, [], atLocal("2026-11-06", "20:00"))).toBe(false);
  });
});

describe("planRoute (tầng quyết định jev)", () => {
  const ctx = { bookingEnabled: true, handoffEnabled: true, unresolvedStreak: 0, negativeStreak: 0, escalateAfter: 2 };
  const d = (label: Decision["label"], confidence = 0.9, extra: Partial<Decision> = {}): Decision => ({ label, confidence, difficulty: "simple", topic: "x", sentiment: "neutral", need: "", source: "test", ...extra });

  it("vi phạm / ngoài phạm vi → câu mẫu, không gọi LLM", () => {
    expect(planRoute(d("injection"), ctx)).toEqual({ kind: "template", template: "refuse_injection" });
    expect(planRoute(d("off_topic"), ctx)).toEqual({ kind: "template", template: "refuse_off_topic" });
    expect(planRoute(d("abuse"), ctx)).toEqual({ kind: "template", template: "refuse_abuse" });
  });
  it("trả lời ngay không cần LLM", () => {
    expect(planRoute(d("greeting"), ctx).kind).toBe("template");
    expect(planRoute(d("ask_contact"), ctx)).toEqual({ kind: "template", template: "ask_contact" });
    expect(planRoute(d("booking"), ctx)).toEqual({ kind: "template", template: "booking" });
    expect(planRoute(d("booking"), { ...ctx, bookingEnabled: false }).kind).toBe("llm");
  });
  it("ngoài dữ liệu / muốn gặp người / phàn nàn → chuyển nhân viên", () => {
    expect(planRoute(d("not_in_data"), ctx)).toEqual({ kind: "handoff", reason: "not_in_data" });
    expect(planRoute(d("human_request"), ctx)).toEqual({ kind: "handoff", reason: "customer_request" });
    expect(planRoute(d("complaint"), ctx)).toEqual({ kind: "handoff", reason: "complaint" });
    expect(planRoute(d("complaint"), { ...ctx, handoffEnabled: false }).kind).toBe("llm");
  });
  it("bot nhiều lần chưa giải quyết / khách bực liên tiếp → chuyển nhân viên", () => {
    expect(planRoute(d("product_query"), { ...ctx, unresolvedStreak: 2 })).toEqual({ kind: "handoff", reason: "repeated_unresolved" });
    expect(planRoute(d("greeting"), { ...ctx, unresolvedStreak: 5 }).kind).toBe("template");
    expect(planRoute(d("product_query", 0.9, { sentiment: "negative" }), { ...ctx, negativeStreak: 2 })).toEqual({ kind: "handoff", reason: "negative_sentiment" });
  });
  it("cần tư vấn → LLM theo độ khó; tin cậy thấp / không có quyết định → LLM mạnh", () => {
    expect(planRoute(d("needs_consult", 0.9, { difficulty: "simple" }), ctx)).toMatchObject({ kind: "llm", tier: "simple" });
    expect(planRoute(d("needs_consult", 0.9, { difficulty: "complex" }), ctx)).toMatchObject({ kind: "llm", tier: "complex" });
    expect(planRoute(d("off_topic", 0.4), ctx)).toMatchObject({ kind: "llm", tier: "complex", why: "low_confidence" });
    expect(planRoute(null, ctx)).toMatchObject({ kind: "llm", tier: "complex" });
  });
});

describe("theme", () => {
  it("chữ trên nút luôn đủ tương phản", () => {
    for (const c of ["#be185d", "#2563eb", "#fde047", "#111827", "#22c55e"]) {
      const t = sanitizeTheme({ primaryColor: c }, "X");
      expect(contrastRatio(t.primaryColor, textOn(t))).toBeGreaterThanOrEqual(4.5 - 1.6); // vàng/xanh lá sáng chỉ đạt ~3:1 với trắng → chọn đen
      expect(textOn(t)).toBe(contrastRatio(c, "#ffffff") >= contrastRatio(c, "#111111") ? "#ffffff" : "#111111");
    }
    expect(textOn(sanitizeTheme({ primaryColor: "#fde047" }, "X"))).toBe("#111111");
  });
  it("làm sạch dữ liệu bẩn", () => {
    const t = sanitizeTheme({ primaryColor: "red", position: "top" as never, autoOpenSeconds: 9999, avatarUrl: "javascript:alert(1)" }, "Shop");
    expect(t.primaryColor).toBe("#2563eb");
    expect(t.position).toBe("right");
    expect(t.autoOpenSeconds).toBe(120);
    expect(t.avatarUrl).toBe("");
  });
  it("cài đặt cũ thiếu trường mới vẫn dùng được", () => {
    const s = normalizeSettings({ shopName: "Cũ" } as never);
    expect(s.booking.enabled).toBe(true);
    expect(s.theme.botName).toBe("Trợ lý Cũ");
    expect(s.hours[1]).toEqual({ open: "08:00", close: "20:00" });
  });
});

describe("normalizeVnPhone", () => {
  it("chuẩn hoá", () => {
    expect(normalizeVnPhone("+84 912 345 678")).toBe("0912345678");
    expect(() => normalizeVnPhone("12345")).toThrow();
  });
});
