import { DomainError } from "@/domain/errors";
import { boxAreaM2, isRoofTile, piecesPerM2, sellUnit, tileAreaM2, type SurfaceKind, type Tile } from "./tile";

export const LAYOUT_PATTERNS = ["straight", "half_offset", "third_offset", "herringbone", "diagonal"] as const;
export type LayoutPattern = (typeof LAYOUT_PATTERNS)[number];

export const LAYOUT_LABELS: Record<LayoutPattern, string> = {
  straight: "Lát thẳng",
  half_offset: "So le 1/2",
  third_offset: "So le 1/3",
  herringbone: "Xương cá",
  diagonal: "Lát chéo 45°",
};

/** Hao hụt mặc định — dùng khi shop tạo trước khi có kiểu lát mới, chưa lưu giá trị riêng. */
export const DEFAULT_WASTE_PERCENT: Record<LayoutPattern, number> = { straight: 5, half_offset: 7, third_offset: 7, herringbone: 12, diagonal: 10 };
export const wasteFor = (w: Partial<Record<LayoutPattern, number>> | undefined, p: LayoutPattern): number =>
  typeof w?.[p] === "number" && Number.isFinite(w[p]) ? (w[p] as number) : DEFAULT_WASTE_PERCENT[p];

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Làm tròn lên nhưng bỏ qua nhiễu dấu phẩy động (2,0000000001 vẫn là 2). */
const ceilSafe = (n: number) => Math.ceil(n - 1e-9);

/** Diện tích mái thật từ diện tích mặt bằng (hình chiếu) và độ dốc (độ). */
export function roofAreaFromFootprint(footprintM2: number, pitchDeg: number): number {
  if (!(pitchDeg >= 0 && pitchDeg < 75)) throw new DomainError("BAD_PITCH", "Độ dốc mái 0–75°");
  return round2(footprintM2 / Math.cos((pitchDeg * Math.PI) / 180));
}

/**
 * Kích thước khách cho (thay vì diện tích) → diện tích cần lát. Tính ở server để LLM không phải tự nhân.
 * - floor/outdoor: dài × rộng
 * - wall: chu vi × cao (ốp cả phòng) nếu có cả dài, rộng, cao; hoặc dài × cao (một mảng tường)
 * - roof: diện tích mặt bằng ÷ cos(độ dốc)
 * Luôn trừ phần cửa/ô trống (openingsM2) nếu có.
 */
export interface AreaInput {
  surface?: SurfaceKind;
  areaM2?: number;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  openingsM2?: number;
  roofPitchDeg?: number;
}

export function resolveAreaM2(a: AreaInput): { areaM2: number; how: string } {
  const pos = (n: number | undefined) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : undefined);
  const L = pos(a.lengthM);
  const W = pos(a.widthM);
  const H = pos(a.heightM);
  const openings = pos(a.openingsM2) ?? 0;
  let gross: number | undefined;
  let how = "";
  if (pos(a.areaM2)) {
    gross = a.areaM2!;
    how = `${round2(gross)} m²`;
  } else if (a.surface === "wall" && L && W && H) {
    gross = 2 * (L + W) * H;
    how = `ốp 4 mặt tường: 2 × (${L} + ${W}) × ${H} m`;
  } else if (a.surface === "wall" && L && H) {
    gross = L * H;
    how = `mảng tường ${L} × ${H} m`;
  } else if (L && W) {
    gross = L * W;
    how = `${L} × ${W} m`;
  }
  if (!gross) throw new DomainError("BAD_AREA", "Cần diện tích (m²) hoặc kích thước dài × rộng (ốp tường: × chiều cao)");
  if (a.surface === "roof" && pos(a.roofPitchDeg)) {
    const footprint = gross;
    gross = roofAreaFromFootprint(footprint, a.roofPitchDeg!);
    how += ` mặt bằng, dốc ${a.roofPitchDeg}° → ${gross} m² mái`;
  }
  if (openings) {
    if (openings >= gross) throw new DomainError("BAD_AREA", "Diện tích cửa/ô trống lớn hơn diện tích cần lát");
    how += ` − ${round2(openings)} m² cửa`;
  }
  return { areaM2: round2(gross - openings), how };
}

export interface SurfaceInput {
  label: string;
  areaM2: number;
}

export interface QuoteOptions {
  pattern: LayoutPattern;
  groutWidthMm: number;
  groutColor: string;
  includeAdhesive: boolean;
  includeGrout: boolean;
}

export interface QuotePricing {
  wastePercent: Partial<Record<LayoutPattern, number>>;
  adhesiveKgPerM2: number;
  adhesiveBagKg: number;
  adhesiveBagPrice: number;
  groutPricePerKg: number;
}

export interface QuoteLine {
  kind: "tile" | "adhesive" | "grout";
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface QuoteResult {
  netAreaM2: number;
  wastePercent: number;
  /** Số đơn vị bán: thùng (gạch) hoặc viên (ngói / gạch bán lẻ từng viên) */
  boxes: number;
  /** "thùng" | "viên" — bản ghi cũ không có → coi là "thùng" */
  unit?: string;
  /** Tổng số viên (để thợ kiểm tra) */
  pieces?: number;
  coveredAreaM2: number;
  lines: QuoteLine[];
  total: number;
  /** Lưu ý kỹ thuật ảnh hưởng tới số lượng (không bịa giá) */
  notes?: string[];
}

/** Lượng ron (kg/m²) = (D + R) / (D × R) × dày × rộng mạch × 1,6 — đơn vị mm. */
export function groutKgPerM2(tile: Pick<Tile, "widthMm" | "heightMm" | "thicknessMm">, jointMm: number): number {
  const { widthMm: L, heightMm: W, thicknessMm: T } = tile;
  return ((L + W) / (L * W)) * T * jointMm * 1.6;
}

/**
 * Hao hụt thực tế: % của shop theo kiểu lát, cộng thêm khi
 * - viên khổ lớn (≥ 0,5 m²/viên) lát diện tích nhỏ: mỗi đường cắt bỏ đi phần lớn → +3%
 * - diện tích rất nhỏ (< 5 m²): số mép cắt so với diện tích cao → +2%
 * Ngói không cộng (đã tính theo viên lộ ra, phần chồng mí nằm trong kích thước).
 */
export function effectiveWastePercent(tile: Tile, netAreaM2: number, pattern: LayoutPattern, pricing: Pick<QuotePricing, "wastePercent">): { percent: number; reasons: string[] } {
  const base = wasteFor(pricing.wastePercent, pattern);
  if (isRoofTile(tile)) return { percent: base, reasons: [] };
  const reasons: string[] = [];
  let extra = 0;
  const piece = tileAreaM2(tile);
  if (piece >= 0.5 && netAreaM2 < piece * 30) {
    extra += 3;
    reasons.push(`viên khổ lớn ${tile.widthMm / 10}x${tile.heightMm / 10} cm trên diện tích nhỏ (+3%)`);
  }
  if (netAreaM2 < 5) {
    extra += 2;
    reasons.push("diện tích dưới 5 m² nhiều mép cắt (+2%)");
  }
  return { percent: base + extra, reasons };
}

export function calculateQuote(tile: Tile, surfaces: SurfaceInput[], opts: QuoteOptions, pricing: QuotePricing, ctx: { surface?: SurfaceKind } = {}): QuoteResult {
  if (surfaces.length === 0) throw new DomainError("NO_SURFACE", "Cần ít nhất một mặt cần lát");
  for (const s of surfaces) {
    if (!(s.areaM2 > 0) || s.areaM2 > 10_000) throw new DomainError("BAD_AREA", `Diện tích "${s.label}" không hợp lệ`);
  }
  if (opts.groutWidthMm < 0 || opts.groutWidthMm > 20) throw new DomainError("BAD_GROUT", "Độ rộng ron 0–20 mm");

  const roof = isRoofTile(tile);
  const unit = sellUnit(tile);
  const notes: string[] = [];
  const pattern: LayoutPattern = roof ? "straight" : opts.pattern;
  if (roof && opts.pattern !== "straight") notes.push("Ngói lợp theo hàng, không áp dụng kiểu lát — đã tính như lát thẳng.");

  const netAreaM2 = round2(surfaces.reduce((a, s) => a + s.areaM2, 0));
  const { percent: wastePercent, reasons } = effectiveWastePercent(tile, netAreaM2, pattern, pricing);
  if (reasons.length) notes.push(`Hao hụt cộng thêm: ${reasons.join("; ")}.`);

  const needM2 = netAreaM2 * (1 + wastePercent / 100);
  const perBox = boxAreaM2(tile);
  const boxes = ceilSafe(needM2 / perBox);
  const coveredExact = boxes * perBox;
  const coveredAreaM2 = round2(coveredExact);
  const pieces = boxes * tile.piecesPerBox;
  const tileTotal = Math.round(coveredExact * tile.pricePerM2);

  const lines: QuoteLine[] = [
    unit === "viên"
      ? {
          kind: "tile",
          description: roof
            ? `${tile.name} (${tile.sku}) — ${pieces} viên (${round2(piecesPerM2(tile))} viên/m²)`
            : `${tile.name} (${tile.sku}) — ${pieces} viên × ${round2(perBox)} m²`,
          quantity: pieces,
          unit: "viên",
          unitPrice: Math.round(tile.pricePerM2 * tileAreaM2(tile)),
          total: tileTotal,
        }
      : {
          kind: "tile",
          description: `${tile.name} (${tile.sku}) — ${boxes} thùng × ${round2(perBox)} m² (${tile.piecesPerBox} viên/thùng)`,
          quantity: coveredAreaM2,
          unit: "m²",
          unitPrice: tile.pricePerM2,
          total: tileTotal,
        },
  ];

  // Ngói lợp không dùng keo dán / keo chà ron
  if (opts.includeAdhesive && !roof) {
    const bags = ceilSafe((netAreaM2 * pricing.adhesiveKgPerM2) / pricing.adhesiveBagKg);
    lines.push({
      kind: "adhesive",
      description: `Keo dán gạch bao ${pricing.adhesiveBagKg} kg`,
      quantity: bags,
      unit: "bao",
      unitPrice: pricing.adhesiveBagPrice,
      total: bags * pricing.adhesiveBagPrice,
    });
  }

  if (opts.includeGrout && opts.groutWidthMm > 0 && !roof) {
    const kg = ceilSafe(netAreaM2 * groutKgPerM2(tile, opts.groutWidthMm));
    lines.push({
      kind: "grout",
      description: `Keo chà ron màu ${opts.groutColor}, mạch ${opts.groutWidthMm} mm`,
      quantity: kg,
      unit: "kg",
      unitPrice: pricing.groutPricePerKg,
      total: kg * pricing.groutPricePerKg,
    });
  }

  if (roof) notes.push("Chưa gồm ngói nóc, ngói rìa (khoảng 3 viên ngói nóc mỗi mét dài nóc mái) — nhân viên sẽ báo thêm theo bản vẽ mái.");
  const ratio = Math.max(tile.widthMm, tile.heightMm) / Math.min(tile.widthMm, tile.heightMm);
  if (pattern === "herringbone" && ratio < 2) notes.push("Lát xương cá cần viên dạng thanh (dài ≥ 2 lần rộng); mẫu này gần vuông nên nên chọn lát thẳng hoặc so le.");
  if ((pattern === "half_offset" || pattern === "third_offset") && Math.max(tile.widthMm, tile.heightMm) >= 600 && ratio >= 2)
    notes.push("Viên dài ≥ 60 cm lát so le 1/2 dễ bị vênh mép giữa viên; nên lát so le 1/3.");
  if (ctx.surface && !tile.usage.includes(ctx.surface)) {
    const labels: Record<SurfaceKind, string> = { floor: "lát sàn", wall: "ốp tường", outdoor: "lát ngoài trời", roof: "lợp mái" };
    notes.push(`Lưu ý: mẫu này shop không khuyến nghị để ${labels[ctx.surface]}.`);
  }
  if (ctx.surface === "outdoor" && tile.finish === "glossy") notes.push("Gạch men bóng dễ trơn khi ướt, không nên lát ngoài trời.");

  return {
    netAreaM2,
    wastePercent,
    boxes: unit === "viên" ? pieces : boxes,
    unit,
    pieces,
    coveredAreaM2,
    lines,
    total: lines.reduce((a, l) => a + l.total, 0),
    ...(notes.length ? { notes } : {}),
  };
}

export const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";
