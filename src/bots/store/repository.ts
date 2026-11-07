import { and, eq, ilike, inArray, or } from "drizzle-orm";
import type { DB } from "@/infrastructure/db/client";
import { products } from "@/infrastructure/db/schema";
import type { Product } from "./product";

export type NewProduct = Omit<Product, "id" | "createdAt" | "pricing"> & { pricing?: Product["pricing"] };

export interface ProductRepository {
  list(tenantId: string, filter?: { activeOnly?: boolean; search?: string; category?: string }): Promise<Product[]>;
  findById(tenantId: string, id: string): Promise<Product | null>;
  findManyByIds(tenantId: string, ids: string[]): Promise<Product[]>;
  create(p: NewProduct): Promise<Product>;
  update(tenantId: string, id: string, patch: Partial<NewProduct>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
  upsertBySku(p: NewProduct): Promise<"created" | "updated">;
}

/** Repository schema `store` — chỉ module store dùng */
export const productRepo = (db: DB): ProductRepository => ({
  async list(tenantId, f = {}) {
    const conds = [eq(products.tenantId, tenantId)];
    if (f.activeOnly) conds.push(eq(products.active, true));
    if (f.category) conds.push(eq(products.category, f.category));
    if (f.search) {
      const q = `%${f.search}%`;
      conds.push(or(ilike(products.name, q), ilike(products.sku, q), ilike(products.category, q))!);
    }
    return db.select().from(products).where(and(...conds)).orderBy(products.category, products.name);
  },
  async findById(tenantId, id) {
    const [r] = await db.select().from(products).where(and(eq(products.tenantId, tenantId), eq(products.id, id))).limit(1);
    return r ?? null;
  },
  async findManyByIds(tenantId, ids) {
    if (ids.length === 0) return [];
    const rows = await db.select().from(products).where(and(eq(products.tenantId, tenantId), inArray(products.id, ids)));
    return ids.map((id) => rows.find((p) => p.id === id)).filter((p): p is (typeof rows)[number] => !!p);
  },
  async create(p) {
    const [r] = await db.insert(products).values({ ...p, id: crypto.randomUUID() }).returning();
    return r;
  },
  async update(tenantId, id, patch) {
    await db.update(products).set(patch).where(and(eq(products.tenantId, tenantId), eq(products.id, id)));
  },
  async delete(tenantId, id) {
    await db.delete(products).where(and(eq(products.tenantId, tenantId), eq(products.id, id)));
  },
  async upsertBySku(p) {
    const [existing] = await db.select({ id: products.id }).from(products).where(and(eq(products.tenantId, p.tenantId), eq(products.sku, p.sku))).limit(1);
    if (existing) {
      // Ô trống trong file nhập = giữ dữ liệu cũ
      const { description, imageUrl, url, tags, ...rest } = p;
      await db
        .update(products)
        .set({ ...rest, ...(description && { description }), ...(imageUrl && { imageUrl }), ...(url && { url }), ...(tags.length > 0 && { tags }) })
        .where(eq(products.id, existing.id));
      return "updated";
    }
    await db.insert(products).values({ ...p, id: crypto.randomUUID() });
    return "created";
  },
});
