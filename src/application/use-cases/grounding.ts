/**
 * Kiểm tra câu trả lời của LLM có "bám dữ liệu" không — chạy sau mỗi lượt, không tốn thêm lượt gọi LLM
 * trừ khi phát hiện vi phạm.
 *
 * Bắt hai loại bịa phổ biến nhất với chatbot bán hàng:
 *  - số tiền không có trong dữ liệu (giá, tổng báo giá, phí...)
 *  - mã sản phẩm (SKU) không có trong catalog của shop
 */

const MULTIPLIER: Record<string, number> = {
  "triệu": 1_000_000,
  tr: 1_000_000,
  "nghìn": 1_000,
  "ngàn": 1_000,
  k: 1_000,
};

// 245.000 ₫ | 245,000đ | 6,1 triệu | 300k | 1.2tr | 180000 VND
const AMOUNT_RE = /(\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,](\d{1,3}))?\s*(triệu|tr|nghìn|ngàn|k|đồng|vnđ|vnd|đ|₫)(?![\p{L}\d])/giu;

/** Lấy các số tiền (VND) trong một đoạn văn. Bỏ qua số < 1.000 (không phải tiền). */
export function extractAmounts(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(AMOUNT_RE)) {
    const [, intPart, decPart, unitRaw] = m;
    const unit = unitRaw.toLowerCase();
    const mult = MULTIPLIER[unit] ?? 1;
    const whole = Number(intPart.replace(/[.,]/g, ""));
    let value = whole;
    if (decPart && mult > 1) value = Number(`${whole}.${decPart}`);
    else if (decPart) value = Number(`${intPart.replace(/[.,]/g, "")}${decPart}`); // "245.000,5đ" hiếm — coi như liền số
    value = Math.round(value * mult);
    if (Number.isFinite(value) && value >= 1000) out.push(value);
  }
  return out;
}

const SKU_RE = /\b[A-Z][A-Z0-9]{1,5}(?:-[A-Z0-9]{1,8}){1,3}\b/g;

/** Chuỗi trông như mã SKU (chữ in hoa + gạch nối + có chữ số), vd VD-6060-TR */
export function extractSkuLike(text: string): string[] {
  return [...text.matchAll(SKU_RE)].map((m) => m[0]).filter((s) => /\d/.test(s));
}

/** Thu thập mọi số tiền/số trong kết quả tool (đệ quy qua object/array/chuỗi đã định dạng). */
export function collectAmounts(value: unknown, into: Set<number>): void {
  if (value == null) return;
  if (typeof value === "number") {
    if (value >= 1000) into.add(Math.round(value));
  } else if (typeof value === "string") {
    for (const a of extractAmounts(value)) into.add(a);
  } else if (Array.isArray(value)) {
    for (const v of value) collectAmounts(v, into);
  } else if (typeof value === "object") {
    for (const v of Object.values(value)) collectAmounts(v, into);
  }
}

export interface GroundingFacts {
  amounts: Set<number>;
  skus: Set<string>;
}

export interface GroundingResult {
  ok: boolean;
  unknownAmounts: number[];
  unknownSkus: string[];
}

/** Sai số cho phép khi bot làm tròn ("khoảng 6,1 triệu" cho 6.102.000 ₫): 2%. */
const TOLERANCE = 0.02;

export function checkGrounding(reply: string, facts: GroundingFacts): GroundingResult {
  const allowed = [...facts.amounts];
  const unknownAmounts = extractAmounts(reply).filter((a) => !allowed.some((b) => Math.abs(a - b) <= Math.max(b * TOLERANCE, 500)));
  const unknownSkus = extractSkuLike(reply).filter((s) => !facts.skus.has(s));
  return { ok: unknownAmounts.length === 0 && unknownSkus.length === 0, unknownAmounts: [...new Set(unknownAmounts)], unknownSkus: [...new Set(unknownSkus)] };
}

export function describeViolations(r: GroundingResult): string {
  const parts: string[] = [];
  if (r.unknownAmounts.length) parts.push(`số tiền ${r.unknownAmounts.map((a) => a.toLocaleString("vi-VN")).join(", ")} ₫`);
  if (r.unknownSkus.length) parts.push(`mã sản phẩm ${r.unknownSkus.join(", ")}`);
  return parts.join("; ");
}
