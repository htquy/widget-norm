import { DomainError } from "@/domain/errors";
import { boxAreaM2, type Tile } from "./tile";

export const LAYOUT_PATTERNS = ["straight", "half_offset", "third_offset", "herringbone"] as const;
export type LayoutPattern = (typeof LAYOUT_PATTERNS)[number];

export const LAYOUT_LABELS: Record<LayoutPattern, string> = {
  straight: "Lát thẳng",
  half_offset: "So le 1/2",
  third_offset: "So le 1/3",
  herringbone: "Xương cá",
};

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
  wastePercent: Record<LayoutPattern, number>;
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
  boxes: number;
  coveredAreaM2: number;
  lines: QuoteLine[];
  total: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
/** Làm tròn lên nhưng bỏ qua nhiễu dấu phẩy động (2,0000000001 vẫn là 2). */
const ceilSafe = (n: number) => Math.ceil(n - 1e-9);

/** Lượng ron (kg/m²) = (D + R) / (D × R) × dày × rộng mạch × 1,6 — đơn vị mm. */
export function groutKgPerM2(tile: Pick<Tile, "widthMm" | "heightMm" | "thicknessMm">, jointMm: number): number {
  const { widthMm: L, heightMm: W, thicknessMm: T } = tile;
  return ((L + W) / (L * W)) * T * jointMm * 1.6;
}

export function calculateQuote(tile: Tile, surfaces: SurfaceInput[], opts: QuoteOptions, pricing: QuotePricing): QuoteResult {
  if (surfaces.length === 0) throw new DomainError("NO_SURFACE", "Cần ít nhất một mặt cần lát");
  for (const s of surfaces) {
    if (!(s.areaM2 > 0) || s.areaM2 > 10_000) throw new DomainError("BAD_AREA", `Diện tích "${s.label}" không hợp lệ`);
  }
  if (opts.groutWidthMm < 0 || opts.groutWidthMm > 20) throw new DomainError("BAD_GROUT", "Độ rộng ron 0–20 mm");

  const netAreaM2 = round2(surfaces.reduce((a, s) => a + s.areaM2, 0));
  const wastePercent = pricing.wastePercent[opts.pattern];
  const needM2 = netAreaM2 * (1 + wastePercent / 100);
  const perBox = boxAreaM2(tile);
  const boxes = ceilSafe(needM2 / perBox);
  const coveredAreaM2 = round2(boxes * perBox);

  const lines: QuoteLine[] = [
    {
      kind: "tile",
      description: `${tile.name} (${tile.sku}) — ${boxes} thùng × ${round2(perBox)} m²`,
      quantity: coveredAreaM2,
      unit: "m²",
      unitPrice: tile.pricePerM2,
      total: Math.round(coveredAreaM2 * tile.pricePerM2),
    },
  ];

  if (opts.includeAdhesive) {
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

  if (opts.includeGrout && opts.groutWidthMm > 0) {
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

  return { netAreaM2, wastePercent, boxes, coveredAreaM2, lines, total: lines.reduce((a, l) => a + l.total, 0) };
}

export const formatVnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";
