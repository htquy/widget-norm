import { and, eq, ilike, inArray, lte, or, sql } from "drizzle-orm";
import type { DB } from "@/infrastructure/db/client";
import { quotes, tileSettings, tiles } from "@/infrastructure/db/schema";
import { DEFAULT_WASTE_PERCENT, type QuoteOptions, type QuotePricing, type QuoteResult, type SurfaceInput } from "./domain/quote";
import { PLACEHOLDER_TEXTURE, type SurfaceKind, type Tile, type TileFinish } from "./domain/tile";

/** Repository schema `tile` — chỉ module tile dùng */

export interface TileFilter {
  sellableOnly?: boolean;
  usage?: SurfaceKind;
  search?: string;
  maxPricePerM2?: number;
}
export type NewTile = Omit<Tile, "id" | "createdAt">;

export interface QuoteRecord {
  id: string;
  tenantId: string;
  conversationId: string | null;
  tileId: string;
  surfaces: SurfaceInput[];
  options: QuoteOptions;
  result: QuoteResult;
  createdAt: Date;
}

export interface TileSettings {
  pricing: QuotePricing;
  abVisualizerPercent: number;
}

export const DEFAULT_TILE_SETTINGS: TileSettings = {
  pricing: { wastePercent: { ...DEFAULT_WASTE_PERCENT }, adhesiveKgPerM2: 5, adhesiveBagKg: 25, adhesiveBagPrice: 180_000, groutPricePerKg: 45_000 },
  abVisualizerPercent: 100,
};

const toTile = (r: typeof tiles.$inferSelect): Tile => ({ ...r, finish: r.finish as TileFinish, usage: r.usage as SurfaceKind[] });

export function tileRepos(db: DB) {
  return {
    tiles: {
      async list(tenantId: string, f: TileFilter = {}) {
        const conds = [eq(tiles.tenantId, tenantId)];
        if (f.sellableOnly) conds.push(eq(tiles.active, true), sql`${tiles.stock} > 0`);
        if (f.usage) conds.push(sql`${tiles.usage} @> ${JSON.stringify([f.usage])}::jsonb`);
        if (f.maxPricePerM2) conds.push(lte(tiles.pricePerM2, f.maxPricePerM2));
        if (f.search) {
          const q = `%${f.search}%`;
          conds.push(or(ilike(tiles.name, q), ilike(tiles.sku, q), ilike(tiles.style, q), ilike(tiles.color, q))!);
        }
        return (await db.select().from(tiles).where(and(...conds)).orderBy(tiles.name)).map(toTile);
      },
      async findById(tenantId: string, id: string) {
        const [r] = await db.select().from(tiles).where(and(eq(tiles.tenantId, tenantId), eq(tiles.id, id))).limit(1);
        return r ? toTile(r) : null;
      },
      async findManyByIds(tenantId: string, ids: string[]) {
        if (ids.length === 0) return [];
        const rows = (await db.select().from(tiles).where(and(eq(tiles.tenantId, tenantId), inArray(tiles.id, ids)))).map(toTile);
        return ids.map((id) => rows.find((t) => t.id === id)).filter((t): t is Tile => !!t);
      },
      async create(t: NewTile) {
        const [r] = await db.insert(tiles).values({ ...t, id: crypto.randomUUID() }).returning();
        return toTile(r);
      },
      async update(tenantId: string, id: string, patch: Partial<NewTile>) {
        await db.update(tiles).set(patch).where(and(eq(tiles.tenantId, tenantId), eq(tiles.id, id)));
      },
      async delete(tenantId: string, id: string) {
        await db.delete(tiles).where(and(eq(tiles.tenantId, tenantId), eq(tiles.id, id)));
      },
      async upsertBySku(t: NewTile): Promise<"created" | "updated"> {
        const [existing] = await db.select({ id: tiles.id }).from(tiles).where(and(eq(tiles.tenantId, t.tenantId), eq(tiles.sku, t.sku))).limit(1);
        if (existing) {
          const { textureUrl, description, images, ...rest } = t;
          await db
            .update(tiles)
            .set({ ...rest, ...(textureUrl && { textureUrl }), ...(description && { description }), ...(images.length > 0 && { images }) })
            .where(eq(tiles.id, existing.id));
          return "updated";
        }
        await db.insert(tiles).values({ ...t, textureUrl: t.textureUrl || PLACEHOLDER_TEXTURE, id: crypto.randomUUID() });
        return "created";
      },
    },

    quotes: {
      async save(q: Omit<QuoteRecord, "id" | "createdAt">): Promise<QuoteRecord> {
        const [r] = await db.insert(quotes).values({ ...q, id: crypto.randomUUID() }).returning();
        return r;
      },
      async findById(tenantId: string, id: string): Promise<QuoteRecord | null> {
        const [r] = await db.select().from(quotes).where(and(eq(quotes.tenantId, tenantId), eq(quotes.id, id))).limit(1);
        return r ?? null;
      },
    },

    settings: {
      async get(tenantId: string): Promise<TileSettings> {
        const [r] = await db.select().from(tileSettings).where(eq(tileSettings.tenantId, tenantId)).limit(1);
        if (!r) return DEFAULT_TILE_SETTINGS;
        return { pricing: { ...DEFAULT_TILE_SETTINGS.pricing, ...r.pricing, wastePercent: { ...DEFAULT_TILE_SETTINGS.pricing.wastePercent, ...r.pricing.wastePercent } }, abVisualizerPercent: r.abVisualizerPercent };
      },
      async save(tenantId: string, s: TileSettings) {
        await db
          .insert(tileSettings)
          .values({ tenantId, pricing: s.pricing, abVisualizerPercent: s.abVisualizerPercent })
          .onConflictDoUpdate({ target: tileSettings.tenantId, set: { pricing: s.pricing, abVisualizerPercent: s.abVisualizerPercent, updatedAt: new Date() } });
      },
    },
  };
}

export type TileRepos = ReturnType<typeof tileRepos>;
