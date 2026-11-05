export type SurfaceKind = "floor" | "wall";
export type TileFinish = "glossy" | "matte" | "textured";

export const FINISH_LABELS: Record<TileFinish, string> = { glossy: "Bóng", matte: "Mờ", textured: "Nhám" };
export const USAGE_LABELS: Record<SurfaceKind, string> = { floor: "Lát sàn", wall: "Ốp tường" };

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
