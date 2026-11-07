export const SURFACE_KINDS = ["floor", "wall", "outdoor", "roof"] as const;
/** floor = lát sàn trong nhà · wall = ốp tường (cả ốp bếp, phòng tắm) · outdoor = sân vườn/ngoài trời · roof = lợp mái (ngói) */
export type SurfaceKind = (typeof SURFACE_KINDS)[number];
export const isSurfaceKind = (s: unknown): s is SurfaceKind => (SURFACE_KINDS as readonly unknown[]).includes(s);
export type TileFinish = "glossy" | "matte" | "textured";

export const FINISH_LABELS: Record<TileFinish, string> = { glossy: "Bóng", matte: "Mờ", textured: "Nhám" };
export const USAGE_LABELS: Record<SurfaceKind, string> = { floor: "Lát sàn", wall: "Ốp tường", outdoor: "Sân vườn / ngoài trời", roof: "Lợp mái (ngói)" };

/**
 * Ngói bán theo viên: kích thước nhập là PHẦN LỘ RA sau khi chồng mí (bề rộng hữu dụng × bước mè),
 * số viên/thùng = 1. Khi đó báo giá ra số viên thay vì số thùng.
 */
export const isRoofTile = (t: Pick<Tile, "usage">) => t.usage.length > 0 && t.usage.every((u) => u === "roof");
export const piecesPerM2 = (t: Pick<Tile, "widthMm" | "heightMm">) => 1_000_000 / (t.widthMm * t.heightMm);
/** Đơn vị bán: ngói/gạch 1 viên mỗi "thùng" → "viên", còn lại → "thùng". */
export const sellUnit = (t: Pick<Tile, "usage" | "piecesPerBox">) => (isRoofTile(t) || t.piecesPerBox === 1 ? "viên" : "thùng");

export interface Tile {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  piecesPerBox: number;
  /** VND / m² */
  pricePerM2: number;
  finish: TileFinish;
  usage: SurfaceKind[];
  style: string;
  color: string;
  textureUrl: string;
  /** Mô tả sản phẩm — chatbot dùng để tư vấn, khách đọc được trong widget */
  description: string;
  /** Ảnh sản phẩm / ảnh công trình thực tế (URL), tối đa MAX_TILE_IMAGES */
  images: string[];
  stock: number;
  active: boolean;
  createdAt: Date;
}

export const PLACEHOLDER_TEXTURE = "/placeholder-tile.svg";
export const MAX_TILE_IMAGES = 6;
export const MAX_DESCRIPTION_LENGTH = 3000;

export const tileAreaM2 = (t: Pick<Tile, "widthMm" | "heightMm">) => (t.widthMm * t.heightMm) / 1_000_000;
export const boxAreaM2 = (t: Pick<Tile, "widthMm" | "heightMm" | "piecesPerBox">) => tileAreaM2(t) * t.piecesPerBox;
export const isSellable = (t: Pick<Tile, "active" | "stock">) => t.active && t.stock > 0;
export const sizeLabel = (t: Pick<Tile, "widthMm" | "heightMm">) => `${t.widthMm / 10}x${t.heightMm / 10} cm`;
