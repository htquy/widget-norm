import { and, eq, ilike, inArray, or } from "drizzle-orm";
import type { DB } from "@/infrastructure/db/client";
import { furnitureItems } from "@/infrastructure/db/schema";
import type { FurnitureItem, NewFurnitureItem } from "./domain";

/** Repository schema `furniture` — chỉ module furniture dùng */
export interface FurnitureRepository {
  list(tenantId: string, f?: { activeOnly?: boolean; search?: string }): Promise<FurnitureItem[]>;
  findById(tenantId: string, id: string): Promise<FurnitureItem | null>;
  findManyByIds(tenantId: string, ids: string[]): Promise<FurnitureItem[]>;
  create(i: NewFurnitureItem): Promise<FurnitureItem>;
  update(tenantId: string, id: string, patch: Partial<NewFurnitureItem>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export const furnitureRepo = (db: DB): FurnitureRepository => ({
  async list(tenantId, f = {}) {
    const conds = [eq(furnitureItems.tenantId, tenantId)];
    if (f.activeOnly) conds.push(eq(furnitureItems.active, true));
    if (f.search) {
      const q = `%${f.search}%`;
      conds.push(or(ilike(furnitureItems.name, q), ilike(furnitureItems.sku, q), ilike(furnitureItems.category, q), ilike(furnitureItems.style, q))!);
    }
    return db.select().from(furnitureItems).where(and(...conds)).orderBy(furnitureItems.category, furnitureItems.name);
  },
  async findById(tenantId, id) {
    const [r] = await db.select().from(furnitureItems).where(and(eq(furnitureItems.tenantId, tenantId), eq(furnitureItems.id, id))).limit(1);
    return r ?? null;
  },
  async findManyByIds(tenantId, ids) {
    if (ids.length === 0) return [];
    const rows = await db.select().from(furnitureItems).where(and(eq(furnitureItems.tenantId, tenantId), inArray(furnitureItems.id, ids)));
    return ids.map((id) => rows.find((r) => r.id === id)).filter((r): r is (typeof rows)[number] => !!r);
  },
  async create(i) {
    const [r] = await db.insert(furnitureItems).values({ ...i, id: crypto.randomUUID() }).returning();
    return r;
  },
  async update(tenantId, id, patch) {
    await db.update(furnitureItems).set(patch).where(and(eq(furnitureItems.tenantId, tenantId), eq(furnitureItems.id, id)));
  },
  async delete(tenantId, id) {
    await db.delete(furnitureItems).where(and(eq(furnitureItems.tenantId, tenantId), eq(furnitureItems.id, id)));
  },
});
