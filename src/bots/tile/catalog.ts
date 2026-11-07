import type { NewTile, TileFilter, TileRepos } from "./repository";
import { MAX_DESCRIPTION_LENGTH, MAX_TILE_IMAGES, isSurfaceKind, sizeLabel, type SurfaceKind, type Tile, type TileFinish } from "./domain/tile";

export interface TileSuggestionQuery {
  surface?: SurfaceKind;
  style?: string;
  color?: string;
  maxPricePerM2?: number;
  query?: string;
  limit?: number;
}

/** Dữ liệu gạch rút gọn gửi cho chatbot / widget */
export interface TileCard {
  id: string;
  sku: string;
  name: string;
  size: string;
  widthMm: number;
  heightMm: number;
  pricePerM2: number;
  finish: TileFinish;
  usage: SurfaceKind[];
  style: string;
  color: string;
  /** Ảnh vân gạch (dùng để phủ lên ảnh phòng) */
  textureUrl: string;
  /** Ảnh hiển thị trên thẻ: ảnh sản phẩm đầu tiên, nếu chưa có thì dùng ảnh vân */
  imageUrl: string;
  images: string[];
  description: string;
  inStock: boolean;
}

export const toCard = (t: Tile): TileCard => ({
  id: t.id,
  sku: t.sku,
  name: t.name,
  size: sizeLabel(t),
  widthMm: t.widthMm,
  heightMm: t.heightMm,
  pricePerM2: t.pricePerM2,
  finish: t.finish,
  usage: t.usage,
  style: t.style,
  color: t.color,
  textureUrl: t.textureUrl,
  imageUrl: t.images[0] ?? t.textureUrl,
  images: t.images,
  description: t.description,
  inStock: t.active && t.stock > 0,
});

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

export function makeTileCatalog(deps: { tiles: TileRepos["tiles"] }) {
  const { tiles } = deps;

  return {
    async suggest(tenantId: string, q: TileSuggestionQuery): Promise<TileCard[]> {
      const filter: TileFilter = { sellableOnly: true, usage: q.surface, maxPricePerM2: q.maxPricePerM2 };
      let all = await tiles.list(tenantId, filter);
      // Shop chưa gắn nhãn "outdoor": dùng tạm gạch lát sàn bề mặt nhám/mờ (bỏ gạch bóng — trơn khi ướt).
      if (q.surface === "outdoor" && all.length === 0) {
        all = (await tiles.list(tenantId, { ...filter, usage: "floor" })).filter((t) => t.finish !== "glossy");
      }
      const phrases = [q.style, q.color, q.query].filter((s): s is string => !!s).map(norm);
      const words = phrases.join(" ").split(/[\s,.;]+/).filter((w) => w.length > 1);
      const scored = all.map((t) => {
        const hay = norm(`${t.name} ${t.style} ${t.color} ${t.finish} ${sizeLabel(t)} ${t.description}`);
        const hayWords = new Set(hay.split(/[\s,.;]+/));
        // Khớp nguyên từ (tránh "da" khớp nhầm "dai"), cộng thêm khi khớp nguyên cụm như "van da".
        const score =
          words.reduce((a, w) => a + (hayWords.has(w) ? 1 : 0), 0) +
          phrases.reduce((a, p) => a + (p.includes(" ") && hay.includes(p) ? 2 : 0), 0);
        return { t, score };
      });
      scored.sort((a, b) => b.score - a.score || a.t.pricePerM2 - b.t.pricePerM2);
      return scored.slice(0, q.limit ?? 6).map((s) => toCard(s.t));
    },

    async publicList(tenantId: string): Promise<TileCard[]> {
      return (await tiles.list(tenantId, { sellableOnly: true })).map(toCard);
    },

    async cardsByIds(tenantId: string, ids: string[]): Promise<TileCard[]> {
      if (ids.length === 0) return [];
      return (await tiles.findManyByIds(tenantId, ids)).map(toCard);
    },

    list: (tenantId: string, filter?: TileFilter) => tiles.list(tenantId, filter),
    get: (tenantId: string, id: string) => tiles.findById(tenantId, id),
    create: (tile: NewTile) => tiles.create(tile),
    update: (tenantId: string, id: string, patch: Partial<NewTile>) => tiles.update(tenantId, id, patch),
    remove: (tenantId: string, id: string) => tiles.delete(tenantId, id),

    /**
     * Nhập catalogue từ các dòng CSV đã parse.
     * Cột: sku,name,width_mm,height_mm,thickness_mm,pieces_per_box,price_per_m2,finish,usage,style,color,stock,texture_url,description,image_urls
     * (texture_url, description, image_urls để trống = giữ nguyên giá trị hiện có; image_urls ngăn cách bằng |, chỉ nhận https)
     */
    async importRows(tenantId: string, rows: Record<string, string>[]) {
      const errors: { row: number; message: string }[] = [];
      let created = 0;
      let updated = 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        try {
          const tile = parseRow(tenantId, r);
          const res = await tiles.upsertBySku(tile);
          if (res === "created") created++;
          else updated++;
        } catch (e) {
          errors.push({ row: i + 2, message: e instanceof Error ? e.message : String(e) });
        }
      }
      return { created, updated, errors };
    },
  };
}

export type TileCatalog = ReturnType<typeof makeTileCatalog>;

function parseRow(tenantId: string, r: Record<string, string>): NewTile {
  const get = (k: string) => (r[k] ?? "").trim();
  const num = (k: string, min: number) => {
    const n = Number(get(k).replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
    if (!Number.isFinite(n) || n < min) throw new Error(`Cột ${k} không hợp lệ: "${get(k)}"`);
    return n;
  };
  const sku = get("sku");
  const name = get("name");
  if (!sku) throw new Error("Thiếu sku");
  if (!name) throw new Error("Thiếu name");
  const finishRaw = get("finish") || "matte";
  if (!["glossy", "matte", "textured"].includes(finishRaw)) throw new Error(`finish phải là glossy/matte/textured`);
  const usage = (get("usage") || "floor")
    .split(/[;|,]/)
    .map((s) => s.trim())
    .filter(Boolean) as SurfaceKind[];
  if (usage.some((u) => !isSurfaceKind(u))) throw new Error("usage phải là floor, wall, outdoor, roof (nhiều giá trị cách nhau bởi ;)");
  return {
    tenantId,
    sku,
    name,
    widthMm: num("width_mm", 10),
    heightMm: num("height_mm", 10),
    thicknessMm: get("thickness_mm") ? num("thickness_mm", 1) : 9,
    piecesPerBox: num("pieces_per_box", 1),
    pricePerM2: num("price_per_m2", 0),
    finish: finishRaw as TileFinish,
    usage,
    style: get("style"),
    color: get("color"),
    stock: get("stock") ? num("stock", 0) : 0,
    // Rỗng = giữ ảnh hiện có (khi cập nhật) hoặc dùng ảnh tạm (khi tạo mới) — xử lý trong repository
    textureUrl: get("texture_url"),
    description: get("description").slice(0, MAX_DESCRIPTION_LENGTH),
    images: parseImageUrls(get("image_urls")),
    active: true,
  };
}

function parseImageUrls(raw: string): string[] {
  const urls = raw
    .split("|")
    .map((u) => u.trim())
    .filter(Boolean);
  for (const u of urls) if (!/^https:\/\/\S+$/.test(u)) throw new Error(`image_urls chỉ nhận đường dẫn https: "${u}"`);
  return urls.slice(0, MAX_TILE_IMAGES);
}
