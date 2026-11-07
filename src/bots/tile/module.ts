import { NextResponse } from "next/server";
import { z } from "zod";
import type { FileStorage } from "@/application/ports";
import { assignVariant } from "@/domain/events";
import { DomainError } from "@/domain/errors";
import type { BotModule } from "../types";
import { toCard, type TileCatalog } from "./catalog";
import { DEMO_TILES } from "./demo";
import { LAYOUT_LABELS, LAYOUT_PATTERNS, formatVnd, resolveAreaM2, type LayoutPattern } from "./domain/quote";
import { SURFACE_KINDS, isSurfaceKind } from "./domain/tile";
import type { Quotes } from "./quotes";
import type { TileRepos } from "./repository";
import { TileRulesGateway } from "./rules";

const visitorId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);

/** Module "Tư vấn & xem thử gạch ốp lát" — dữ liệu ở schema `tile` */
export function makeTileModule(deps: { repos: TileRepos; catalog: TileCatalog; quotes: Quotes; files: FileStorage }): BotModule {
  const { catalog, quotes, repos } = deps;

  const variantFor = async (tenantId: string, vid: string) => assignVariant(vid, (await repos.settings.get(tenantId)).abVisualizerPercent, "control", "visualizer");

  return {
    kind: "tile",
    clientEvents: ["photo_uploaded", "preview_rendered"],
    interestEvent: "preview_rendered",
    funnel: [
      { type: "widget_open", label: "Mở chat" },
      { type: "message_sent", label: "Nhắn tin" },
      { type: "photo_uploaded", label: "Gửi ảnh phòng" },
      { type: "preview_rendered", label: "Xem thử gạch" },
      { type: "quote_created", label: "Nhận báo giá" },
      { type: "lead_created", label: "Để lại SĐT" },
    ],

    tools: ({ tenant, visitorId: vid, variant, conversationId, turn }) => [
      {
        name: "suggest_tiles",
        description: "Tìm mẫu gạch còn hàng của cửa hàng theo nhu cầu khách. Gọi khi khách hỏi mẫu, phong cách, màu, giá hoặc cần gợi ý.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            surface: { type: "string", enum: [...SURFACE_KINDS], description: "floor = lát sàn trong nhà, wall = ốp tường (cả ốp bếp, phòng tắm), outdoor = sân vườn/ban công/sân thượng/ngoài trời, roof = ngói lợp mái" },
            style: { type: "string", description: "Phong cách: hiện đại, cổ điển, vân đá, vân gỗ, tối giản..." },
            color: { type: "string", description: "Màu mong muốn" },
            maxPricePerM2: { type: "number", description: "Giá tối đa VND/m²" },
            query: { type: "string", description: "Từ khoá khác (60x60, bóng, mờ, phòng tắm...)" },
          },
          required: [],
        },
        run: async (raw) => {
          const q = (raw ?? {}) as Record<string, unknown>;
          const cards = await catalog.suggest(tenant.id, {
            surface: isSurfaceKind(q.surface) ? q.surface : undefined,
            style: typeof q.style === "string" ? q.style : undefined,
            color: typeof q.color === "string" ? q.color : undefined,
            maxPricePerM2: typeof q.maxPricePerM2 === "number" ? q.maxPricePerM2 : undefined,
            query: typeof q.query === "string" ? q.query : undefined,
          });
          turn.productIds = cards.map((c) => c.id);
          return cards.map((c) => ({ tileId: c.id, name: c.name, sku: c.sku, size: c.size, price: `${formatVnd(c.pricePerM2)}/m²`, finish: c.finish, style: c.style, color: c.color, usage: c.usage, summary: c.description.slice(0, 200) || undefined }));
        },
      },
      {
        name: "get_tile_details",
        description: "Lấy mô tả chi tiết và thông số của MỘT mẫu gạch (đặc tính, nơi nên dùng, kích thước, bề mặt, giá, tình trạng hàng).",
        inputSchema: { type: "object", additionalProperties: false, properties: { tileId: { type: "string", description: "tileId lấy từ suggest_tiles" } }, required: ["tileId"] },
        run: async (raw) => {
          const id = String((raw as Record<string, unknown> | undefined)?.tileId ?? "");
          const [card] = await catalog.cardsByIds(tenant.id, [id]);
          if (!card) return { error: "Không tìm thấy mẫu này" };
          turn.productIds = [card.id];
          return { tileId: card.id, name: card.name, sku: card.sku, size: card.size, price: `${formatVnd(card.pricePerM2)}/m²`, finish: card.finish, usage: card.usage, style: card.style, color: card.color, inStock: card.inStock, description: card.description || "(Cửa hàng chưa nhập mô tả cho mẫu này)" };
        },
      },
      {
        name: "calculate_quote",
        description:
          "Lập báo giá cho một mẫu gạch/ngói. Truyền areaM2 nếu khách cho diện tích; nếu khách cho kích thước thì truyền lengthM/widthM (ốp tường thêm heightM, trừ cửa bằng openingsM2; mái cho diện tích mặt bằng kèm roofPitchDeg) — công cụ tự tính diện tích, KHÔNG tự nhân. Kết quả gồm số thùng/viên (đã cộng hao hụt), keo, ron, tổng tiền và lưu ý.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            tileId: { type: "string", description: "tileId lấy từ suggest_tiles" },
            surface: { type: "string", enum: [...SURFACE_KINDS], description: "Bề mặt cần lát/ốp/lợp" },
            areaM2: { type: "number", description: "Diện tích cần lát (m²), nếu khách đã cho" },
            lengthM: { type: "number", description: "Chiều dài (m)" },
            widthM: { type: "number", description: "Chiều rộng (m)" },
            heightM: { type: "number", description: "Chiều cao tường (m) — chỉ khi ốp tường" },
            openingsM2: { type: "number", description: "Tổng diện tích cửa đi/cửa sổ cần trừ (m²)" },
            roofPitchDeg: { type: "number", description: "Độ dốc mái (độ) — khi khách cho diện tích mặt bằng mái" },
            pattern: { type: "string", enum: [...LAYOUT_PATTERNS] },
            groutWidthMm: { type: "number", description: "Độ rộng mạch ron (mm), mặc định 2" },
          },
          required: ["tileId"],
        },
        run: async (raw) => {
          const q = (raw ?? {}) as Record<string, unknown>;
          const pattern = (LAYOUT_PATTERNS as readonly string[]).includes(String(q.pattern)) ? (q.pattern as LayoutPattern) : "straight";
          const num = (k: string) => (typeof q[k] === "number" ? (q[k] as number) : typeof q[k] === "string" && q[k] ? Number(String(q[k]).replace(",", ".")) : undefined);
          const surface = isSurfaceKind(q.surface) ? q.surface : undefined;
          let area: { areaM2: number; how: string };
          try {
            area = resolveAreaM2({ surface, areaM2: num("areaM2"), lengthM: num("lengthM"), widthM: num("widthM"), heightM: num("heightM"), openingsM2: num("openingsM2"), roofPitchDeg: num("roofPitchDeg") });
          } catch (e) {
            return { error: e instanceof Error ? e.message : "Thiếu diện tích" };
          }
          const quote = await quotes.create({
            tenantId: tenant.id,
            visitorId: vid,
            variant,
            conversationId,
            tileId: String(q.tileId ?? ""),
            surfaces: [{ label: "Khu vực cần lát", areaM2: area.areaM2 }],
            surface,
            options: { pattern, groutWidthMm: typeof q.groutWidthMm === "number" ? q.groutWidthMm : 2, groutColor: "cùng tông", includeAdhesive: true, includeGrout: true },
          });
          turn.extras.quoteId = quote.id;
          return {
            quoteId: quote.id,
            tile: quote.tileName,
            areaFrom: area.how,
            netAreaM2: quote.result.netAreaM2,
            wastePercent: quote.result.wastePercent,
            boxes: quote.result.boxes,
            unit: quote.result.unit ?? "thùng",
            notes: quote.result.notes,
            lines: quote.result.lines.map((l) => `${l.description}: ${l.quantity} ${l.unit} = ${formatVnd(l.total)}`),
            total: formatVnd(quote.result.total),
          };
        },
      },
    ],

    promptLines: (_tenant, variant) => [
      `Bạn là nhân viên tư vấn vật liệu ốp lát. Mục tiêu: hiểu nhu cầu (lát sàn, ốp tường/ốp bếp/phòng tắm, sân vườn ngoài trời hay lợp mái ngói; diện tích, phong cách, ngân sách), gợi ý mẫu phù hợp, lập báo giá, rồi xin tên và số điện thoại/Zalo để nhân viên gửi báo giá chi tiết.`,
      `- Chỉ giới thiệu mẫu lấy từ suggest_tiles; hỏi sâu một mẫu thì gọi get_tile_details. Không tự tính tiền: khi khách đã chọn mẫu và cho diện tích, gọi calculate_quote rồi nhắc lại số thùng (ngói: số viên) và tổng tiền đúng như kết quả, kèm lưu ý trong notes nếu có.`,
      `- Khách cho kích thước thì truyền nguyên kích thước vào calculate_quote (ốp tường cả phòng: dài, rộng, cao; trừ cửa bằng openingsM2), không tự nhân. Ngói lợp báo giá theo VIÊN, không cần keo dán/keo ron; nếu khách chỉ biết diện tích mặt bằng mái thì hỏi độ dốc (thường 25–35°) rồi truyền roofPitchDeg.`,
      `- Sân vườn, ban công, phòng tắm: ưu tiên gạch bề mặt nhám/mờ chống trơn; không gợi ý gạch men bóng cho chỗ ướt ngoài trời.`,
      `- Nếu khách chưa biết diện tích, hướng dẫn đo dài × rộng (m). Kiểu lát hỗ trợ: ${LAYOUT_PATTERNS.map((p) => `${p} (${LAYOUT_LABELS[p]})`).join(", ")}.`,
      variant === "visualizer"
        ? `- Khuyến khích khách bấm "Ướm thử ảnh phòng" để xem gạch phủ lên sàn, tường, sân hoặc mái của chính nhà mình (hoặc thử trên phòng mẫu có sẵn).`
        : `- Nếu khách muốn xem gạch trong phòng, mời khách để lại số điện thoại để nhân viên gửi ảnh mẫu thực tế.`,
      `- Khách muốn khảo sát tại nhà hoặc đến showroom: dùng công cụ đặt lịch nếu có.`,
    ],

    async groundingFacts(tenant) {
      const [all, s] = await Promise.all([catalog.list(tenant.id), repos.settings.get(tenant.id)]);
      return { amounts: [...all.map((t) => t.pricePerM2), s.pricing.adhesiveBagPrice, s.pricing.groutPricePerKg].filter((n) => n >= 1000), skus: all.map((t) => t.sku) };
    },

    async shopSummary(tenantId) {
      const all = await catalog.list(tenantId, { sellableOnly: true });
      const styles = [...new Set(all.map((t) => t.style.split(" ").slice(0, 2).join(" ")).filter(Boolean))].slice(0, 8);
      return `Cửa hàng gạch ốp lát, ${all.length} mẫu còn hàng (${styles.join(", ")}). Có báo giá theo diện tích và xem thử gạch trên ảnh phòng.`;
    },

    cards: (tenantId, ids) => catalog.cardsByIds(tenantId, ids),
    async namesByIds(tenantId, ids) {
      return new Map((await repos.tiles.findManyByIds(tenantId, ids)).map((t) => [t.id, t.name]));
    },
    async resolveExtras(tenantId, extras) {
      return extras.quoteId ? { quote: await quotes.get(tenantId, extras.quoteId) } : {};
    },
    fallbackLlm: new TileRulesGateway(),

    async publicConfig(tenant, vid) {
      return { variant: await variantFor(tenant.id, vid) };
    },
    variantFor: (tenant, vid) => variantFor(tenant.id, vid),

    /** /api/public/[tenant]/x/catalog | quote | lead */
    async handlePublic(ctx) {
      const action = ctx.path[0];
      const { tenant } = ctx;
      if (ctx.req.method === "GET" && action === "catalog") {
        return NextResponse.json({ tiles: await catalog.publicList(tenant.id) });
      }
      if (ctx.req.method !== "POST") return NextResponse.json({ error: "Không hỗ trợ" }, { status: 405 });
      const raw = await ctx.req.json();

      if (action === "quote") {
        const body = z
          .object({
            visitorId,
            conversationId: z.string().uuid().nullable().optional(),
            tileId: z.string().uuid(),
            surfaces: z.array(z.object({ label: z.string().max(60), areaM2: z.number().positive().max(10_000) })).min(1).max(10),
            surface: z.enum(SURFACE_KINDS).optional(),
            options: z.object({ pattern: z.enum(LAYOUT_PATTERNS), groutWidthMm: z.number().min(0).max(20), groutColor: z.string().max(30), includeAdhesive: z.boolean(), includeGrout: z.boolean() }),
          })
          .parse(raw);
        if (!ctx.rateLimit(`quote:${tenant.id}:${body.visitorId}`, 30, 10 * 60_000)) return NextResponse.json({ error: "Quá nhiều yêu cầu" }, { status: 429 });
        const quote = await quotes.create({
          tenantId: tenant.id,
          visitorId: body.visitorId,
          variant: await variantFor(tenant.id, body.visitorId),
          conversationId: await ctx.ownConversation(body.visitorId, body.conversationId),
          tileId: body.tileId,
          surfaces: body.surfaces,
          options: body.options,
          surface: body.surface,
        });
        return NextResponse.json({ quote });
      }

      if (action === "lead") {
        const body = z
          .object({
            visitorId,
            conversationId: z.string().uuid().nullable().optional(),
            quoteId: z.string().uuid().nullable().optional(),
            name: z.string().min(1).max(80),
            phone: z.string().min(9).max(20),
            note: z.string().max(1000).default(""),
            previewBase64: z.string().max(4_000_000).regex(/^[A-Za-z0-9+/=]+$/).optional(),
          })
          .parse(raw);
        if (!ctx.rateLimit(`tlead:${tenant.id}:${body.visitorId}`, 5, 60 * 60_000)) return NextResponse.json({ error: "Anh/chị đã gửi thông tin rồi, nhân viên sẽ liên hệ sớm ạ." }, { status: 429 });
        const quote = body.quoteId ? await quotes.get(tenant.id, body.quoteId) : null;
        const meta: Record<string, string | number> = {};
        if (quote) Object.assign(meta, { quoteId: quote.id, quoteTotal: quote.result.total, tileName: quote.tileName, areaM2: quote.result.netAreaM2 });
        if (body.previewBase64) {
          const bytes = new Uint8Array(Buffer.from(body.previewBase64, "base64"));
          if (bytes.byteLength > 3_000_000) throw new DomainError("PREVIEW_TOO_BIG", "Ảnh quá lớn");
          meta.previewUrl = await deps.files.put(`${tenant.id}/previews/${crypto.randomUUID()}.jpg`, bytes, "image/jpeg");
        }
        const note = [body.note, quote && `Báo giá ${quote.tileName}: ${quote.result.netAreaM2} m², ${quote.result.boxes} ${quote.result.unit ?? "thùng"}, ${formatVnd(quote.result.total)}`].filter(Boolean).join(" — ");
        const lead = await ctx.captureLead({ visitorId: body.visitorId, conversationId: await ctx.ownConversation(body.visitorId, body.conversationId), name: body.name, phone: body.phone, note, meta });
        return NextResponse.json({ ok: true, leadId: lead.id });
      }
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    },

    async onCreate(tenantId) {
      await repos.settings.save(tenantId, await repos.settings.get(tenantId));
    },

    async seedDemo(tenantId) {
      await repos.settings.save(tenantId, await repos.settings.get(tenantId));
      const ids: string[] = [];
      // Gọi lại được: chỉ thêm mẫu demo còn thiếu (vd ngói, sân vườn thêm về sau), không đụng dữ liệu cũ
      const have = new Set((await repos.tiles.list(tenantId)).map((t) => t.sku));
      for (const t of DEMO_TILES) {
        if (have.has(t.sku)) continue;
        const textureUrl = await deps.files.put(`${tenantId}/textures/${t.sku}.svg`, new TextEncoder().encode(t.svg()), "image/svg+xml");
        const created = await repos.tiles.create({
          tenantId,
          sku: t.sku,
          name: t.name,
          widthMm: t.w,
          heightMm: t.h,
          thicknessMm: 9,
          piecesPerBox: t.ppb,
          pricePerM2: t.price,
          finish: t.finish,
          usage: [...t.usage],
          style: t.style,
          color: t.color,
          textureUrl,
          description: t.desc,
          images: [],
          stock: t.stock,
          active: true,
        });
        ids.push(created.id);
      }
      return ids;
    },
  };
}

export { toCard as tileToCard };
