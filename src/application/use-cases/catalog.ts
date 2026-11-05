import { DomainError } from "@/domain/errors";
import { MAX_DESCRIPTION_LENGTH, keywords, priceText, scoreProduct, type Product } from "@/domain/product";
import type { NewProduct, NewService, ProductRepository, ServiceRepository } from "../ports";

/** Thẻ sản phẩm gửi cho widget (không lộ trường nội bộ) */
export interface ProductCard {
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
}

export const toCard = (p: Product): ProductCard => ({
  id: p.id,
  sku: p.sku,
  name: p.name,
  category: p.category,
  price: p.price,
  priceText: priceText(p.price),
  imageUrl: p.imageUrl,
  url: p.url,
  inStock: p.inStock,
  summary: p.description.slice(0, 160),
});

export function makeCatalog(deps: { products: ProductRepository; services: ServiceRepository }) {
  return {
    list: (tenantId: string, filter?: { activeOnly?: boolean; search?: string; category?: string }) => deps.products.list(tenantId, filter),
    get: (tenantId: string, id: string) => deps.products.findById(tenantId, id),

    async cardsByIds(tenantId: string, ids: string[]): Promise<ProductCard[]> {
      return (await deps.products.findManyByIds(tenantId, ids)).filter((p) => p.active).map(toCard);
    },

    /** Tìm sản phẩm theo câu hỏi tự nhiên — chấm điểm từ khoá (bỏ dấu), lọc giá, ưu tiên còn hàng */
    async search(tenantId: string, q: { query?: string; category?: string; maxPrice?: number; limit?: number }): Promise<ProductCard[]> {
      const all = await deps.products.list(tenantId, { activeOnly: true });
      const words = keywords(`${q.query ?? ""} ${q.category ?? ""}`);
      const scored = all
        .filter((p) => !q.maxPrice || (p.price > 0 && p.price <= q.maxPrice))
        .map((p) => ({ p, s: scoreProduct(p, words) }))
        .filter((x) => words.length === 0 || x.s > 0)
        .sort((a, b) => b.s - a.s || Number(b.p.inStock) - Number(a.p.inStock) || a.p.name.localeCompare(b.p.name));
      return scored.slice(0, q.limit ?? 4).map((x) => toCard(x.p));
    },

    async categories(tenantId: string): Promise<string[]> {
      const all = await deps.products.list(tenantId, { activeOnly: true });
      return [...new Set(all.map((p) => p.category).filter(Boolean))].sort();
    },

    async create(p: NewProduct) {
      validate(p);
      return deps.products.create(p);
    },
    async update(tenantId: string, id: string, patch: Partial<NewProduct>) {
      validate(patch);
      await deps.products.update(tenantId, id, patch);
    },
    remove: (tenantId: string, id: string) => deps.products.delete(tenantId, id),

    /** Nhập CSV: cột sku,name,category,price,description,url,image_url,tags,in_stock,active */
    async importRows(tenantId: string, rows: Record<string, string>[]) {
      let created = 0;
      let updated = 0;
      const errors: { row: number; message: string }[] = [];
      for (const [i, r] of rows.entries()) {
        try {
          const sku = (r.sku ?? "").trim();
          const name = (r.name ?? "").trim();
          if (!sku || !name) throw new DomainError("BAD_ROW", "thiếu sku hoặc name");
          const price = Number((r.price ?? "0").replace(/[^\d]/g, "") || 0);
          const yes = (v: string | undefined, d: boolean) => (v === undefined || v.trim() === "" ? d : /^(1|true|có|co|yes|x)$/i.test(v.trim()));
          const p: NewProduct = {
            tenantId,
            sku,
            name,
            category: (r.category ?? "").trim(),
            price,
            description: (r.description ?? "").trim().slice(0, MAX_DESCRIPTION_LENGTH),
            url: safeUrl(r.url),
            imageUrl: safeUrl(r.image_url),
            tags: (r.tags ?? "").split(/[;,|]/).map((t) => t.trim()).filter(Boolean),
            inStock: yes(r.in_stock, true),
            active: yes(r.active, true),
          };
          if ((await deps.products.upsertBySku(p)) === "created") created++;
          else updated++;
        } catch (e) {
          errors.push({ row: i + 2, message: e instanceof Error ? e.message : String(e) });
        }
      }
      return { created, updated, errors };
    },

    /* ---------- Dịch vụ (dùng cho đặt lịch) ---------- */
    services: (tenantId: string, activeOnly = false) => deps.services.list(tenantId, activeOnly),
    service: (tenantId: string, id: string) => deps.services.findById(tenantId, id),
    async saveService(tenantId: string, id: string | null, s: Omit<NewService, "tenantId">) {
      if (!s.name.trim()) throw new DomainError("BAD_SERVICE", "Nhập tên dịch vụ");
      if (s.durationMin < 5 || s.durationMin > 600) throw new DomainError("BAD_SERVICE", "Thời lượng từ 5 đến 600 phút");
      if (id) await deps.services.update(tenantId, id, s);
      else await deps.services.create({ ...s, tenantId });
    },
    removeService: (tenantId: string, id: string) => deps.services.delete(tenantId, id),
  };
}

function safeUrl(v: string | undefined): string {
  const s = (v ?? "").trim();
  return /^https?:\/\//.test(s) || s.startsWith("/") ? s : "";
}

function validate(p: Partial<NewProduct>) {
  if (p.price !== undefined && (!Number.isFinite(p.price) || p.price < 0)) throw new DomainError("BAD_PRICE", "Giá không hợp lệ");
  if (p.description && p.description.length > MAX_DESCRIPTION_LENGTH) throw new DomainError("BAD_DESC", `Mô tả tối đa ${MAX_DESCRIPTION_LENGTH} ký tự`);
}

export type Catalog = ReturnType<typeof makeCatalog>;
