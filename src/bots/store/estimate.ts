import { z } from "zod";
import { DomainError } from "@/domain/errors";

/**
 * Báo giá theo công thức — thuần tính toán, không phụ thuộc DB/LLM.
 * Mỗi sản phẩm có thể gắn một công thức (cột `pricing`); `price` của sản phẩm là đơn giá cơ sở theo đơn vị của công thức.
 * Bot KHÔNG tự nhân tiền: tool `calculate_estimate` gọi hàm này rồi bot đọc lại kết quả.
 */

const pct = z.number().min(0).max(100);
const addonSchema = z.object({
  label: z.string().trim().min(1).max(60),
  /** area = nhân diện tích tính tiền · quantity = nhân số lượng chính · flat = cộng cố định */
  per: z.enum(["area", "quantity", "flat"]),
  price: z.number().min(0).max(1_000_000_000),
});

export const pricingRuleSchema = z.discriminatedUnion("model", [
  /** Giá/m² (sàn gỗ, kính, tấm ốp, biển hiệu…): nhận areaM2 hoặc rộng × cao, cộng hao hụt, có diện tích tối thiểu */
  z.object({ model: z.literal("per_area"), wastePercent: pct.default(5), minAreaM2: z.number().min(0).max(1000).default(0), addons: z.array(addonSchema).max(6).default([]) }),
  /** Độ phủ (sơn, chống thấm, keo…): giá là giá/đơn vị bán (thùng/lít); coveragePerUnit = m² một đơn vị phủ được 1 lớp */
  z.object({ model: z.literal("coverage"), unit: z.string().trim().min(1).max(12).default("thùng"), coveragePerUnit: z.number().positive().max(10_000), coats: z.number().int().min(1).max(6).default(2), wastePercent: pct.default(5), addons: z.array(addonSchema).max(6).default([]) }),
  /** Theo mét dài (rèm, vải, ống, ray…): chiều dài × hệ số nhún/gấp, cộng hao hụt */
  z.object({ model: z.literal("per_length"), foldFactor: z.number().min(1).max(5).default(1), wastePercent: pct.default(5), addons: z.array(addonSchema).max(6).default([]) }),
  /** Theo số lượng, có bậc giá (đồng phục, in ấn, quà tặng): tiers = từ minQty trở lên áp giá này */
  z.object({
    model: z.literal("per_unit"),
    unit: z.string().trim().min(1).max(12).default("cái"),
    tiers: z.array(z.object({ minQty: z.number().int().min(1).max(1_000_000), price: z.number().min(0).max(1_000_000_000) })).max(8).default([]),
    addons: z.array(addonSchema).max(6).default([]),
  }),
]);
export type PricingRule = z.infer<typeof pricingRuleSchema>;

export interface EstimateInput {
  areaM2?: number;
  widthM?: number;
  heightM?: number;
  lengthM?: number;
  quantity?: number;
}

export interface EstimateLine {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Estimate {
  lines: EstimateLine[];
  total: number;
  /** Đại lượng đã tính tiền (m², mét, thùng, cái) */
  billedQuantity: number;
  billedUnit: string;
  notes: string[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Làm tròn lên nhưng bỏ nhiễu dấu phẩy động (2,0000000001 vẫn là 2). */
const ceilSafe = (n: number) => Math.ceil(n - 1e-9);
const posNum = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);

function areaOf(i: EstimateInput): number {
  const direct = posNum(i.areaM2);
  const w = posNum(i.widthM);
  const h = posNum(i.heightM);
  const area = direct ?? (w && h ? w * h : undefined);
  if (!area) throw new DomainError("NEED_AREA", "Cần diện tích (m²) hoặc chiều rộng × chiều cao");
  if (area > 100_000) throw new DomainError("BAD_AREA", "Diện tích không hợp lệ");
  return round2(area);
}

export function calculateEstimate(name: string, basePrice: number, rule: PricingRule, input: EstimateInput): Estimate {
  if (!(basePrice > 0)) throw new DomainError("NO_PRICE", "Sản phẩm chưa có đơn giá để báo giá");
  const notes: string[] = [];
  const lines: EstimateLine[] = [];
  let billedQuantity: number;
  let billedUnit: string;
  let mainTotal: number;
  let mainQty: number;

  if (rule.model === "per_area") {
    const area = areaOf(input);
    const billed = Math.max(area, rule.minAreaM2);
    if (billed > area) notes.push(`Áp dụng diện tích tối thiểu ${rule.minAreaM2} m²`);
    const qty = round2(billed * (1 + rule.wastePercent / 100));
    mainQty = qty;
    mainTotal = Math.round(qty * basePrice);
    billedQuantity = billed;
    billedUnit = "m²";
    lines.push({ description: `${name} — ${billed} m²${rule.wastePercent ? ` + ${rule.wastePercent}% hao hụt` : ""}`, quantity: qty, unit: "m²", unitPrice: basePrice, total: mainTotal });
  } else if (rule.model === "coverage") {
    const area = areaOf(input);
    const qty = ceilSafe((area * rule.coats * (1 + rule.wastePercent / 100)) / rule.coveragePerUnit);
    mainQty = qty;
    mainTotal = qty * basePrice;
    billedQuantity = area;
    billedUnit = "m²";
    lines.push({ description: `${name} — ${area} m², ${rule.coats} lớp, 1 ${rule.unit} phủ ${rule.coveragePerUnit} m²/lớp${rule.wastePercent ? `, +${rule.wastePercent}% hao hụt` : ""}`, quantity: qty, unit: rule.unit, unitPrice: basePrice, total: mainTotal });
  } else if (rule.model === "per_length") {
    const len = posNum(input.lengthM) ?? posNum(input.widthM);
    if (!len) throw new DomainError("NEED_LENGTH", "Cần chiều dài (m)");
    if (len > 100_000) throw new DomainError("BAD_LENGTH", "Chiều dài không hợp lệ");
    const qty = Math.ceil(len * rule.foldFactor * (1 + rule.wastePercent / 100) * 10 - 1e-9) / 10;
    mainQty = qty;
    mainTotal = Math.round(qty * basePrice);
    billedQuantity = len;
    billedUnit = "m";
    lines.push({ description: `${name} — ${len} m${rule.foldFactor > 1 ? ` × hệ số ${rule.foldFactor}` : ""}${rule.wastePercent ? ` + ${rule.wastePercent}% hao hụt` : ""}`, quantity: qty, unit: "m", unitPrice: basePrice, total: mainTotal });
  } else {
    const qty = posNum(input.quantity);
    if (!qty || !Number.isInteger(qty)) throw new DomainError("NEED_QTY", "Cần số lượng (số nguyên dương)");
    if (qty > 1_000_000) throw new DomainError("BAD_QTY", "Số lượng không hợp lệ");
    const tier = [...rule.tiers].sort((a, b) => b.minQty - a.minQty).find((t) => qty >= t.minQty);
    const unitPrice = tier ? tier.price : basePrice;
    if (tier) notes.push(`Áp dụng giá từ ${tier.minQty} ${rule.unit} trở lên`);
    const next = [...rule.tiers].sort((a, b) => a.minQty - b.minQty).find((t) => t.minQty > qty && t.price < unitPrice);
    if (next) notes.push(`Mua từ ${next.minQty} ${rule.unit} sẽ được giá thấp hơn`);
    mainQty = qty;
    mainTotal = qty * unitPrice;
    billedQuantity = qty;
    billedUnit = rule.unit;
    lines.push({ description: name, quantity: qty, unit: rule.unit, unitPrice, total: mainTotal });
  }

  let total = mainTotal;
  for (const a of rule.addons) {
    const factor = a.per === "flat" ? 1 : a.per === "area" ? (rule.model === "per_area" || rule.model === "coverage" ? billedQuantity : mainQty) : mainQty;
    const t = Math.round(a.price * factor);
    lines.push({ description: a.label, quantity: a.per === "flat" ? 1 : factor, unit: a.per === "flat" ? "gói" : a.per === "area" ? "m²" : billedUnit, unitPrice: a.price, total: t });
    total += t;
  }
  return { lines, total, billedQuantity, billedUnit, notes };
}

/** Công thức dạng text trong form admin: mỗi dòng "10:90000" (bậc giá) hoặc "Công thi công|area|45000" (phụ phí). */
export function parseTiers(text: string): { minQty: number; price: number }[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [q, p] = l.split(":").map((x) => Number(x.replace(/[^\d]/g, "")));
      if (!q || p === undefined || Number.isNaN(p)) throw new DomainError("BAD_TIER", `Bậc giá sai định dạng: "${l}" (đúng: 10:90000)`);
      return { minQty: q, price: p };
    });
}

export function parseAddons(text: string): z.infer<typeof addonSchema>[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, per, price] = l.split("|").map((x) => x.trim());
      if (!label || !["area", "quantity", "flat"].includes(per ?? "") || !price) throw new DomainError("BAD_ADDON", `Phụ phí sai định dạng: "${l}" (đúng: Công thi công|area|45000)`);
      return { label, per: per as "area" | "quantity" | "flat", price: Number(price.replace(/[^\d]/g, "")) };
    });
}

const num = (v: FormDataEntryValue | null, d: number) => {
  const s = String(v ?? "").replace(",", ".").trim();
  return s === "" ? d : Number(s);
};

/** Form admin → công thức (null = không dùng). Ném DomainError/ZodError nếu sai. */
export function pricingFromForm(form: { get(k: string): FormDataEntryValue | null }): PricingRule | null {
  const model = String(form.get("pricingModel") ?? "");
  if (!model) return null;
  const addons = parseAddons(String(form.get("pricingAddons") ?? ""));
  const unit = String(form.get("pricingUnit") ?? "").trim() || undefined;
  const raw =
    model === "per_area"
      ? { model, wastePercent: num(form.get("pricingWaste"), 5), minAreaM2: num(form.get("pricingMinArea"), 0), addons }
      : model === "coverage"
        ? { model, unit, coveragePerUnit: num(form.get("pricingCoverage"), 0), coats: num(form.get("pricingCoats"), 2), wastePercent: num(form.get("pricingWaste"), 5), addons }
        : model === "per_length"
          ? { model, foldFactor: num(form.get("pricingFold"), 1), wastePercent: num(form.get("pricingWaste"), 5), addons }
          : { model, unit, tiers: parseTiers(String(form.get("pricingTiers") ?? "")), addons };
  const parsed = pricingRuleSchema.safeParse(raw);
  if (!parsed.success) throw new DomainError("BAD_PRICING", `Công thức báo giá chưa hợp lệ: ${parsed.error.issues[0]?.path.join(".") || "dữ liệu"}`);
  return parsed.data;
}
