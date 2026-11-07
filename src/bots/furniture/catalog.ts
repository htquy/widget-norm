import { DomainError } from "@/domain/errors";
import { fold, keywords, priceText } from "@/domain/text";
import { furnitureCardSvg, svgDataUrl } from "./art";
import { checkFit, sizeText, type FurnitureItem, type NewFurnitureItem, type Room } from "./domain";
import type { FurnitureRepository } from "./repository";

/** Thẻ gửi widget — cùng hình dạng thẻ sản phẩm nên dùng lại giao diện thẻ có sẵn */
export interface FurnitureCard {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  priceText: string;
  imageUrl: string;
  url: string;
  inStock: boolean;
  summary: string;
  /** Kích thước thật (cm) — studio dùng để kê đúng tỉ lệ */
  widthCm: number;
  depthCm: number;
  heightCm: number;
  color: string;
  style: string;
  /** Món có ảnh thật của shop hay ảnh minh hoạ vẽ tự động */
  illustrated: boolean;
  /** Ảnh tách nền (PNG trong suốt) dùng trong studio */
  cutoutUrl: string;
  /** Mô hình 3D .glb (rỗng nếu chưa có) */
  modelUrl: string;
  collection: string;
  pairs: string[];
}

export const toCard = (i: FurnitureItem): FurnitureCard => ({
  id: i.id,
  sku: i.sku,
  name: i.name,
  category: i.category,
  price: i.price,
  priceText: priceText(i.price),
  // Ảnh thẻ: ảnh shop > ảnh thật tách nền (PNG) > hình vẽ theo số đo (SVG nhúng ảnh ngoài không hiện được trong <img>)
  imageUrl: i.imageUrl || (i.cutoutUrl && !i.cutoutUrl.endsWith(".svg") ? i.cutoutUrl : svgDataUrl(furnitureCardSvg(i))),
  url: "",
  inStock: i.stock > 0,
  summary: [`${i.widthCm}×${i.depthCm}×${i.heightCm} cm`, i.material, i.color].filter(Boolean).join(" · "),
  widthCm: i.widthCm,
  depthCm: i.depthCm,
  heightCm: i.heightCm,
  color: i.color,
  style: i.style,
  illustrated: !i.imageUrl && !i.cutoutUrl,
  cutoutUrl: i.cutoutUrl,
  // Khách chỉ thấy mô hình 3D đã được shop duyệt ("ready"); bản AI tạo ở trạng thái "review" chỉ hiện trong admin
  modelUrl: i.modelStatus === "ready" ? i.modelUrl : "",
  collection: i.collection,
  pairs: i.pairs,
});

export interface SearchQuery {
  query?: string;
  category?: string;
  room?: Room;
  style?: string;
  maxPrice?: number;
  /** Khoảng trống khách muốn đặt: chỉ giữ món đặt vừa (cho phép xoay) */
  spaceWidthCm?: number;
  spaceDepthCm?: number;
  limit?: number;
}

export function makeFurnitureCatalog(deps: { items: FurnitureRepository }) {
  const score = (i: FurnitureItem, words: string[]) => {
    const name = fold(`${i.name} ${i.sku} ${i.category}`);
    const attrs = fold(`${i.style} ${i.material} ${i.color}`);
    const desc = fold(i.description);
    return words.reduce((s, w) => s + (name.includes(w) ? 3 : 0) + (attrs.includes(w) ? 2 : 0) + (desc.includes(w) ? 1 : 0), 0);
  };
  return {
    list: (tenantId: string, f?: { activeOnly?: boolean; search?: string }) => deps.items.list(tenantId, f),
    get: (tenantId: string, id: string) => deps.items.findById(tenantId, id),
    async cardsByIds(tenantId: string, ids: string[]) {
      return (await deps.items.findManyByIds(tenantId, ids)).filter((i) => i.active).map(toCard);
    },

    /** Tìm theo phòng/loại/phong cách/ngân sách/khoảng trống; ưu tiên còn hàng */
    async search(tenantId: string, q: SearchQuery): Promise<FurnitureItem[]> {
      const all = await deps.items.list(tenantId, { activeOnly: true });
      const words = keywords(`${q.query ?? ""} ${q.category ?? ""} ${q.style ?? ""}`);
      const space = q.spaceWidthCm && q.spaceDepthCm ? { widthCm: q.spaceWidthCm, depthCm: q.spaceDepthCm } : null;
      return all
        .filter((i) => !q.room || i.rooms.includes(q.room))
        .filter((i) => !q.maxPrice || (i.price > 0 && i.price <= q.maxPrice))
        .filter((i) => !space || checkFit(i, space).fits)
        .map((i) => ({ i, s: score(i, words) }))
        .filter((x) => words.length === 0 || x.s > 0)
        .sort((a, b) => b.s - a.s || Number(b.i.stock > 0) - Number(a.i.stock > 0) || a.i.price - b.i.price)
        .slice(0, q.limit ?? 4)
        .map((x) => x.i);
    },

    /** Tìm món giống một ảnh (vector CLIP 512 chiều đã chuẩn hoá, tính ở trình duyệt) bằng cosine */
    async similarTo(tenantId: string, embedding: number[], limit = 6): Promise<{ item: FurnitureItem; similarity: number }[]> {
      if (embedding.length !== 512 || !embedding.every(Number.isFinite)) throw new DomainError("BAD_EMBEDDING", "Vector ảnh không hợp lệ");
      const norm = Math.hypot(...embedding) || 1;
      const all = await deps.items.list(tenantId, { activeOnly: true });
      return all
        .filter((i): i is FurnitureItem & { embedding: number[] } => Array.isArray(i.embedding) && i.embedding.length === 512)
        .map((i) => ({ item: i, similarity: cosine(embedding, i.embedding, norm) }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    },

    /** Món shop đánh dấu hợp đi kèm (hai chiều) + cùng bộ sưu tập, còn bán */
    async pairedWith(tenantId: string, item: FurnitureItem): Promise<FurnitureItem[]> {
      const all = await deps.items.list(tenantId, { activeOnly: true });
      return all.filter((o) => o.id !== item.id && (item.pairs.includes(o.sku) || o.pairs.includes(item.sku) || (!!item.collection && o.collection === item.collection)));
    },

    async categories(tenantId: string) {
      return [...new Set((await deps.items.list(tenantId, { activeOnly: true })).map((i) => i.category).filter(Boolean))].sort();
    },

    async create(i: NewFurnitureItem) {
      validate(i);
      return deps.items.create(i);
    },
    async update(tenantId: string, id: string, patch: Partial<NewFurnitureItem>) {
      validate(patch);
      await deps.items.update(tenantId, id, patch);
    },
    remove: (tenantId: string, id: string) => deps.items.delete(tenantId, id),
  };
}

/** Cosine với vector a đã biết chuẩn (normA); b là vector đã lưu (có thể chưa chuẩn hoá) */
export function cosine(a: number[], b: number[], normA = Math.hypot(...a)): number {
  let dot = 0;
  let nb = 0;
  for (let k = 0; k < a.length; k++) {
    dot += a[k] * b[k];
    nb += b[k] * b[k];
  }
  return dot / (normA * Math.sqrt(nb) || 1);
}

function validate(i: Partial<NewFurnitureItem>) {
  for (const [label, v] of [["rộng", i.widthCm], ["sâu", i.depthCm], ["cao", i.heightCm]] as const) {
    if (v !== undefined && (!Number.isInteger(v) || v < 5 || v > 1000)) throw new DomainError("BAD_SIZE", `Chiều ${label} phải từ 5 đến 1000 cm`);
  }
  if (i.price !== undefined && (!Number.isFinite(i.price) || i.price < 0)) throw new DomainError("BAD_PRICE", "Giá không hợp lệ");
  if (i.stock !== undefined && (!Number.isInteger(i.stock) || i.stock < 0)) throw new DomainError("BAD_STOCK", "Tồn kho không hợp lệ");
}

export type FurnitureCatalog = ReturnType<typeof makeFurnitureCatalog>;
export { sizeText };
