import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { calculateEstimate, parseAddons, parseTiers, pricingFromForm, pricingRuleSchema, type PricingRule } from "./estimate";

const rule = (r: unknown) => pricingRuleSchema.parse(r) as PricingRule;

describe("báo giá theo công thức", () => {
  it("sơn theo độ phủ: 50 m², 2 lớp, 5% hao hụt, 120 m²/thùng → 1 thùng + công thi công", () => {
    const r = rule({ model: "coverage", unit: "thùng", coveragePerUnit: 120, coats: 2, wastePercent: 5, addons: [{ label: "Công thi công", per: "area", price: 25_000 }] });
    const e = calculateEstimate("Sơn", 1_650_000, r, { areaM2: 50 });
    expect(e.lines[0]).toMatchObject({ quantity: 1, unit: "thùng", total: 1_650_000 });
    expect(e.lines[1].total).toBe(50 * 25_000);
    expect(e.total).toBe(1_650_000 + 1_250_000);
  });

  it("sơn: 130 m² cần 3 thùng (làm tròn lên), nhận cả rộng × cao", () => {
    const r = rule({ model: "coverage", coveragePerUnit: 120, coats: 2, wastePercent: 5 });
    expect(calculateEstimate("Sơn", 1_000_000, r, { areaM2: 130 }).lines[0].quantity).toBe(3);
    expect(calculateEstimate("Sơn", 1_000_000, r, { widthM: 10, heightM: 13 }).lines[0].quantity).toBe(3);
  });

  it("m²: áp diện tích tối thiểu, cộng hao hụt, có ghi chú", () => {
    const r = rule({ model: "per_area", wastePercent: 10, minAreaM2: 10 });
    const e = calculateEstimate("Sàn gỗ", 300_000, r, { areaM2: 8 });
    expect(e.billedQuantity).toBe(10);
    expect(e.total).toBe(11 * 300_000);
    expect(e.notes.join(" ")).toMatch(/tối thiểu/);
  });

  it("mét dài: rèm 2,5 m nhún gấp 2 → 5,3 m (có hao hụt 5%)", () => {
    const r = rule({ model: "per_length", foldFactor: 2, wastePercent: 5, addons: [{ label: "Công may", per: "quantity", price: 40_000 }] });
    const e = calculateEstimate("Rèm", 180_000, r, { widthM: 2.5 });
    expect(e.lines[0].quantity).toBe(5.3);
    expect(e.lines[0].total).toBe(Math.round(5.3 * 180_000));
    expect(e.total).toBe(Math.round(5.3 * 180_000) + Math.round(5.3 * 40_000));
  });

  it("số lượng: áp bậc giá cao nhất đạt được và gợi ý bậc tiếp theo", () => {
    const r = rule({ model: "per_unit", unit: "áo", tiers: [{ minQty: 20, price: 135_000 }, { minQty: 50, price: 120_000 }] });
    const e = calculateEstimate("Polo", 150_000, r, { quantity: 30 });
    expect(e.total).toBe(30 * 135_000);
    expect(e.notes.join(" ")).toMatch(/từ 50 áo/);
    expect(calculateEstimate("Polo", 150_000, r, { quantity: 5 }).total).toBe(5 * 150_000);
  });

  it("thiếu đầu vào / giá 0 / số lượng lẻ → lỗi rõ ràng, không đoán", () => {
    const area = rule({ model: "per_area" });
    expect(() => calculateEstimate("X", 100_000, area, {})).toThrow(DomainError);
    expect(() => calculateEstimate("X", 0, area, { areaM2: 5 })).toThrow(/đơn giá/);
    expect(() => calculateEstimate("X", 100_000, rule({ model: "per_unit" }), { quantity: 2.5 })).toThrow(DomainError);
    expect(() => calculateEstimate("X", 100_000, area, { areaM2: -3 })).toThrow(DomainError);
  });

  it("form admin: parse bậc giá, phụ phí và công thức; sai định dạng → báo lỗi", () => {
    expect(parseTiers("20:135000\n50: 120.000")).toEqual([{ minQty: 20, price: 135_000 }, { minQty: 50, price: 120_000 }]);
    expect(parseAddons("Công thi công|area|45000")).toEqual([{ label: "Công thi công", per: "area", price: 45_000 }]);
    expect(() => parseTiers("abc")).toThrow(DomainError);
    expect(() => parseAddons("x|bad|1")).toThrow(DomainError);

    const form = new FormData();
    expect(pricingFromForm(form)).toBeNull();
    form.set("pricingModel", "coverage");
    form.set("pricingCoverage", "120");
    form.set("pricingAddons", "Công thi công|area|25000");
    expect(pricingFromForm(form)).toMatchObject({ model: "coverage", coveragePerUnit: 120, coats: 2, unit: "thùng" });
    form.set("pricingCoverage", "0");
    expect(() => pricingFromForm(form)).toThrow(DomainError);
  });
});
