import { RuleBasedLlmGateway } from "@/adapters/llm/ruleBasedLlmGateway";
import type { ChatTool, LlmGateway, LlmTurnResult } from "@/application/ports";
import { DomainError } from "@/domain/errors";
import { fold, formatVnd } from "@/domain/text";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { FileStorage } from "@/application/ports";
import type { BotModule } from "../types";
import { toCard, type FurnitureCatalog } from "./catalog";
import { furnitureSvg } from "./art";
import { DEMO_FURNITURE, DEMO_PAIRS } from "./demo";
import { demoGlb } from "./demoModels";
import { STYLES, STYLE_INFO, designRoomSet, isStyle, roomSetTitle, styleFromText, type RoomSetResult } from "./design";
import { NO_ASSETS, type NewFurnitureItem, ROOMS, ROOM_LABELS, checkFit, isRoom, orderTotals, sizeText, type FurnitureItem } from "./domain";
import type { FurnitureRepository } from "./repository";

const visitorId = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/);

/** Phương án phòng gửi cho widget (thẻ "Gợi ý trọn bộ") — không lộ dữ liệu nội bộ */
export function roomSetView(r: RoomSetResult) {
  return {
    title: roomSetTitle(r),
    room: r.room,
    style: r.style,
    picks: r.picks.map((p) => ({ card: toCard(p.item), category: p.category, quantity: p.quantity, total: p.total, reason: p.reason })),
    subtotal: r.subtotal,
    budget: r.budget,
    coveragePercent: r.coveragePercent,
    palette: r.palette,
    skipped: r.skipped,
    notes: r.notes,
  };
}
export type RoomSetView = ReturnType<typeof roomSetView>;

/** Mô hình quét thật cho dữ liệu demo (có thể vắng trên môi trường serverless → trả null) */
async function readDemoGlb(sku: string): Promise<Uint8Array | null> {
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    return new Uint8Array(await readFile(join(process.cwd(), "assets", "demo-furniture", `${sku}.glb`)));
  } catch {
    return null;
  }
}

const cm = (m: number) => Math.round(m * 100);
const stockText = (i: FurnitureItem) => (i.stock > 0 ? `còn ${i.stock}` : "tạm hết hàng");

/** Bot theo luật của ngành nội thất — dùng khi LLM lỗi/hết hạn mức hoặc chưa có API key */
class FurnitureRulesGateway implements LlmGateway {
  readonly id = "rules";
  private readonly generic = new RuleBasedLlmGateway();
  describe() {
    return { simple: "rules", complex: "rules" };
  }
  async respond(input: Parameters<LlmGateway["respond"]>[0]): Promise<LlmTurnResult> {
    const t = fold(input.user.text);
    const find = input.tools.find((x) => x.name === "find_furniture");
    const design = input.tools.find((x) => x.name === "design_room");
    // "Thiết kế phòng khách 4x5m, 30 triệu, Bắc Âu" → gợi ý trọn bộ
    const roomWord = /phong khach/.test(t) ? "living" : /phong ngu/.test(t) ? "bedroom" : /phong an|ban an/.test(t) ? "dining" : /lam viec/.test(t) ? "office" : undefined;
    if (design && roomWord && /(thiet ke|tron bo|ca bo|combo|set|bo tri|full)/.test(t)) {
      const dims = t.match(/(\d+(?:[.,]\d+)?)\s*m?\s*(?:x|×|\*)\s*(\d+(?:[.,]\d+)?)/);
      const budget = t.match(/(\d+(?:[.,]\d+)?)\s*(trieu|tr)\b/);
      const res = (await design.run({
        room: roomWord,
        style: styleFromText(t),
        roomWidthM: dims ? Number(dims[1].replace(",", ".")) : undefined,
        roomDepthM: dims ? Number(dims[2].replace(",", ".")) : undefined,
        budget: budget ? Number(budget[1].replace(",", ".")) * 1_000_000 : undefined,
      })) as { title?: string; picks?: string[]; subtotal?: string; error?: string };
      const text = res.error
        ? res.error
        : `Phương án ${res.title}: ${res.picks?.join("; ")} — tạm tính ${res.subtotal}. Bạn bấm "Kê thử vào ảnh phòng" để xem bộ này trong chính phòng mình nhé.`;
      return { text, history: [...input.history, { user: input.user.text, assistant: text }] };
    }
    if (find && /(sofa|ban|ghe|giuong|tu |ke |noi that|phong khach|phong ngu|phong an|goi y|mua)/.test(t) && !/(dat lich|nhan vien|giao hang|bao hanh)/.test(t)) {
      const res = (await find.run({ query: input.user.text })) as { name?: string; price?: string; size?: string }[] | { note: string };
      if (Array.isArray(res) && res.length) {
        const text = `Mình gợi ý ${res.length} mẫu ở dưới: ${res.map((c) => `${c.name} (${c.size}, ${c.price})`).join("; ")}. Bạn cho mình biết kích thước khoảng trống (rộng × sâu) để mình kiểm tra món nào đặt vừa, hoặc đặt lịch đo đạc tại nhà nhé.`;
        return { text, history: [...input.history, { user: input.user.text, assistant: text }] };
      }
    }
    return this.generic.respond(input);
  }
}

/** Module "Tư vấn nội thất" — dữ liệu ở schema `furniture` */
export function makeFurnitureModule(deps: { catalog: FurnitureCatalog; items: FurnitureRepository; files: FileStorage }): BotModule {
  const { catalog } = deps;
  const runDesign = async (tenantId: string, q: Record<string, unknown>) => {
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined);
    const room = isRoom(q.room) ? q.room : "living";
    const style = isStyle(q.style) ? q.style : typeof q.style === "string" ? styleFromText(q.style) : undefined;
    const w = num(q.roomWidthM);
    const d = num(q.roomDepthM);
    const all = await catalog.list(tenantId, { activeOnly: true });
    return designRoomSet(all, {
      room,
      style,
      budget: num(q.budget),
      roomWidthCm: w && d ? cm(w) : undefined,
      roomDepthCm: w && d ? cm(d) : undefined,
      existing: Array.isArray(q.existing) ? q.existing.filter((x): x is string => typeof x === "string").slice(0, 10) : [],
      seats: num(q.seats),
      palette: Array.isArray(q.palette) ? q.palette.filter((x): x is string => typeof x === "string" && /^#[0-9a-f]{6}$/i.test(x)).slice(0, 6) : [],
    });
  };
  const sizeProps = {
    spaceWidthM: { type: "number", description: "Chiều rộng khoảng trống khách muốn đặt (mét)" },
    spaceDepthM: { type: "number", description: "Chiều sâu khoảng trống (mét)" },
  } as const;

  return {
    kind: "furniture",
    clientEvents: ["room_photo_uploaded", "room_designed"],
    interestEvent: "product_clicked",
    funnel: [
      { type: "widget_open", label: "Mở chat" },
      { type: "message_sent", label: "Nhắn tin" },
      { type: "room_photo_uploaded", label: "Gửi ảnh phòng" },
      { type: "room_designed", label: "Kê thử nội thất" },
      { type: "lead_created", label: "Để lại SĐT" },
    ],

    tools: ({ tenant, turn }) => {
      const tools: ChatTool[] = [
        {
          name: "find_furniture",
          description: "Tìm đồ nội thất của cửa hàng theo phòng, loại, phong cách, ngân sách và khoảng trống khách định đặt. Gọi trước khi giới thiệu bất kỳ món nào.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              query: { type: "string", description: "Từ khoá: loại đồ, màu, chất liệu, nhu cầu" },
              room: { type: "string", enum: [...ROOMS], description: "living=phòng khách, bedroom=phòng ngủ, dining=phòng ăn, office=làm việc, kitchen=bếp, kids=trẻ em" },
              style: { type: "string", description: "Phong cách: Bắc Âu, hiện đại, tối giản…" },
              maxPrice: { type: "number", description: "Ngân sách tối đa cho một món (VND)" },
              ...sizeProps,
            },
            required: [],
          },
          run: async (raw) => {
            const q = (raw ?? {}) as Record<string, unknown>;
            const num = (v: unknown) => (typeof v === "number" && v > 0 ? v : undefined);
            const w = num(q.spaceWidthM);
            const d = num(q.spaceDepthM);
            const found = await catalog.search(tenant.id, {
              query: typeof q.query === "string" ? q.query : undefined,
              room: isRoom(q.room) ? q.room : undefined,
              style: typeof q.style === "string" ? q.style : undefined,
              maxPrice: num(q.maxPrice),
              spaceWidthCm: w ? cm(w) : undefined,
              spaceDepthCm: d ? cm(d) : undefined,
            });
            turn.productIds = found.map((i) => i.id);
            if (found.length === 0) return { results: [], note: "Không có món phù hợp trong danh mục." };
            return found.map((i) => ({ itemId: i.id, sku: i.sku, name: i.name, category: i.category, style: i.style, material: i.material, color: i.color, size: sizeText(i), price: formatVnd(i.price), stock: stockText(i), rooms: i.rooms.map((r) => ROOM_LABELS[r]).join(", ") }));
          },
        },
        {
          name: "get_furniture_details",
          description: "Lấy mô tả đầy đủ của MỘT món: kích thước, chất liệu, màu, giá, tồn kho, lưu ý lắp đặt.",
          inputSchema: { type: "object", additionalProperties: false, properties: { itemId: { type: "string", description: "itemId lấy từ find_furniture" } }, required: ["itemId"] },
          run: async (raw) => {
            const i = await catalog.get(tenant.id, String((raw as Record<string, unknown> | undefined)?.itemId ?? ""));
            if (!i || !i.active) return { error: "Không tìm thấy món này" };
            turn.productIds = [i.id];
            return { itemId: i.id, sku: i.sku, name: i.name, category: i.category, style: i.style, material: i.material, color: i.color, size: sizeText(i), price: formatVnd(i.price), stock: stockText(i), rooms: i.rooms.map((r) => ROOM_LABELS[r]).join(", "), description: i.description || "(Cửa hàng chưa nhập mô tả)" };
          },
        },
        {
          name: "check_fit",
          description: "Kiểm tra MỘT món có đặt vừa khoảng trống khách cho không (có thử xoay 90°, kiểm tra lối đi và chiều cao nếu có). Luôn dùng tool này khi khách hỏi 'có vừa không', không tự so kích thước.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: { itemId: { type: "string" }, ...sizeProps, ceilingHeightM: { type: "number", description: "Chiều cao khoảng trống/trần (mét), nếu khách nêu" } },
            required: ["itemId", "spaceWidthM", "spaceDepthM"],
          },
          run: async (raw) => {
            const q = (raw ?? {}) as Record<string, unknown>;
            const i = await catalog.get(tenant.id, String(q.itemId ?? ""));
            if (!i || !i.active) return { error: "Không tìm thấy món này" };
            turn.productIds = [i.id];
            const n = (v: unknown) => (typeof v === "number" ? v : undefined);
            try {
              const r = checkFit(i, { widthCm: cm(n(q.spaceWidthM) ?? 0), depthCm: cm(n(q.spaceDepthM) ?? 0), heightCm: n(q.ceilingHeightM) ? cm(n(q.ceilingHeightM)!) : undefined });
              return { item: i.name, size: sizeText(i), fits: r.fits, orientation: r.orientation === "rotated" ? "cần xoay ngang 90°" : r.orientation === "as_is" ? "đặt thẳng" : undefined, leftover: r.leftoverWidthCm === null ? undefined : `${r.leftoverWidthCm} cm chiều rộng, ${r.leftoverDepthCm} cm chiều sâu`, walkwayOk: r.walkwayOk, notes: r.notes };
            } catch (e) {
              if (e instanceof DomainError) return { error: e.message };
              throw e;
            }
          },
        },
        {
          name: "calculate_order",
          description: "Tạm tính tiền hàng cho một hoặc nhiều món (có số lượng), cảnh báo tồn kho. Chưa gồm vận chuyển và lắp đặt. Luôn dùng tool này khi khách hỏi tổng tiền combo, không tự cộng.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              items: { type: "array", maxItems: 20, items: { type: "object", additionalProperties: false, properties: { itemId: { type: "string" }, quantity: { type: "number" } }, required: ["itemId"] } },
            },
            required: ["items"],
          },
          run: async (raw) => {
            const list = ((raw as { items?: { itemId?: string; quantity?: number }[] } | undefined)?.items ?? []).slice(0, 20);
            const found = await Promise.all(list.map(async (l) => ({ item: await catalog.get(tenant.id, String(l.itemId ?? "")), quantity: typeof l.quantity === "number" ? l.quantity : 1 })));
            if (found.some((f) => !f.item)) return { error: "Có món không tìm thấy trong danh mục" };
            try {
              const r = orderTotals(found.map((f) => ({ item: f.item!, quantity: f.quantity })));
              turn.productIds = found.map((f) => f.item!.id);
              return { lines: r.lines.map((l) => `${l.name} × ${l.quantity} = ${formatVnd(l.total)}`), subtotal: formatVnd(r.subtotal), notes: r.notes };
            } catch (e) {
              if (e instanceof DomainError) return { error: e.message };
              throw e;
            }
          },
        },
        {
          name: "suggest_pairs",
          description: "Gợi ý món hợp đi kèm với MỘT món (shop đã đánh dấu hoặc cùng bộ sưu tập). Dùng khi khách hỏi 'phối với gì', 'món nào đi cùng', sau khi khách chọn xong một món.",
          inputSchema: { type: "object", additionalProperties: false, properties: { itemId: { type: "string", description: "itemId lấy từ find_furniture" } }, required: ["itemId"] },
          run: async (raw) => {
            const i = await catalog.get(tenant.id, String((raw as Record<string, unknown> | undefined)?.itemId ?? ""));
            if (!i || !i.active) return { error: "Không tìm thấy món này" };
            const paired = (await catalog.pairedWith(tenant.id, i)).slice(0, 4);
            if (paired.length === 0) return { note: "Shop chưa đánh dấu món đi kèm cho món này." };
            turn.productIds = paired.map((p) => p.id);
            return paired.map((p) => ({ itemId: p.id, sku: p.sku, name: p.name, category: p.category, size: sizeText(p), price: formatVnd(p.price), collection: p.collection || undefined }));
          },
        },
        {
          name: "design_room",
          description:
            "Gợi ý TRỌN BỘ nội thất cho một phòng: mỗi món thiết yếu (vd phòng khách: sofa, bàn trà, kệ tivi) một mẫu hợp phong cách, vừa phòng, trong ngân sách; trả tạm tính, % diện tích sàn bị chiếm và lưu ý khoảng đi lại. Dùng khi khách muốn 'thiết kế', 'trọn bộ', 'combo', 'bố trí cả phòng'.",
          inputSchema: {
            type: "object",
            additionalProperties: false,
            properties: {
              room: { type: "string", enum: [...ROOMS] },
              style: { type: "string", enum: [...STYLES], description: STYLES.map((s) => `${s}=${STYLE_INFO[s].label}`).join(", ") },
              budget: { type: "number", description: "Ngân sách cả bộ (VND)" },
              roomWidthM: { type: "number", description: "Chiều rộng phòng (m)" },
              roomDepthM: { type: "number", description: "Chiều dài/sâu phòng (m)" },
              existing: { type: "array", items: { type: "string" }, description: "Món khách đã có, không gợi ý lại (vd 'Sofa', 'Giường')" },
              seats: { type: "number", description: "Số người ngồi ăn (phòng ăn)" },
            },
            required: ["room"],
          },
          run: async (raw) => {
            try {
              const r = await runDesign(tenant.id, (raw ?? {}) as Record<string, unknown>);
              turn.productIds = r.picks.map((p) => p.item.id);
              turn.extras.roomSet = JSON.stringify(roomSetView(r));
              return {
                title: roomSetTitle(r),
                picks: r.picks.map((p) => `${p.category}: ${p.item.name}${p.quantity > 1 ? ` × ${p.quantity}` : ""} = ${formatVnd(p.total)} (${p.reason})`),
                subtotal: formatVnd(r.subtotal),
                budget: r.budget ? formatVnd(r.budget) : undefined,
                floorCoverage: r.coveragePercent === null ? undefined : `${r.coveragePercent}% diện tích sàn`,
                styleTips: r.style ? STYLE_INFO[r.style].tips : undefined,
                skipped: r.skipped,
                notes: r.notes,
              };
            } catch (e) {
              if (e instanceof DomainError) return { error: e.message };
              throw e;
            }
          },
        },
      ];
      return tools;
    },

    promptLines: () => [
      `Bạn là nhân viên tư vấn nội thất. Mục tiêu: hiểu căn phòng (loại phòng, kích thước, phong cách, ngân sách, nhà có trẻ nhỏ/thú cưng không), gợi ý đúng món đặt vừa, tạm tính tiền, rồi mời đặt lịch khảo sát đo đạc tại nhà hoặc tham quan showroom và xin tên + số điện thoại/Zalo.`,
      `- Hỏi kích thước khoảng trống (rộng × sâu, mét) trước khi chốt món lớn như sofa, giường, tủ. Không hỏi dồn một lúc.`,
      `- Chỉ giới thiệu món lấy từ find_furniture; hỏi sâu thì gọi get_furniture_details; "có vừa không" luôn gọi check_fit; tổng tiền gọi calculate_order — không tự so kích thước hay cộng tiền.`,
      `- Nhắc rõ giá tạm tính chưa gồm vận chuyển và lắp đặt, và nhân viên sẽ xác nhận sau khi khảo sát. Hàng hết thì nói thật và xin số để báo khi có hàng.`,
      `- Khách chọn xong một món và hỏi phối với gì: gọi suggest_pairs. Khách gửi ảnh mẫu muốn tìm món giống: mời bấm "Thiết kế từ ảnh phòng" > "Tìm món giống ảnh".`,
      `- Khách muốn "thiết kế", "trọn bộ", "bố trí cả phòng": hỏi loại phòng, kích thước, ngân sách, phong cách (Bắc Âu, hiện đại, tối giản, Japandi, Indochine, tân cổ điển, công nghiệp) rồi gọi design_room; nhắc lại phương án đúng như kết quả kèm lưu ý về diện tích sàn và lối đi.`,
      `- Luôn mời khách bấm "Thiết kế từ ảnh phòng": AI nhận ra loại phòng, phong cách, đồ đã có, rồi kê thử bộ gợi ý vào đúng ảnh phòng với kích thước thật.`,
    ],

    async groundingFacts(tenant) {
      const all = await catalog.list(tenant.id);
      return { amounts: all.map((i) => i.price).filter((n) => n >= 1000), skus: all.map((i) => i.sku) };
    },

    async shopSummary(tenantId) {
      const [cats, all] = await Promise.all([catalog.categories(tenantId), catalog.list(tenantId, { activeOnly: true })]);
      return `Cửa hàng nội thất, ${all.length} mẫu (${cats.join(", ") || "chưa có"}). Có kiểm tra kích thước đặt vừa, tạm tính đơn và đặt lịch khảo sát tại nhà.`;
    },

    cards: (tenantId, ids) => catalog.cardsByIds(tenantId, ids),
    async namesByIds(tenantId, ids) {
      return new Map((await deps.items.findManyByIds(tenantId, ids)).map((i) => [i.id, i.name]));
    },
    async resolveExtras(_tenantId, extras) {
      if (!extras.roomSet) return {};
      try {
        return { roomSet: JSON.parse(extras.roomSet) as RoomSetView };
      } catch {
        return {};
      }
    },
    fallbackLlm: new FurnitureRulesGateway(),
    publicConfig: async () => ({ studio: true }),
    variantFor: async () => "default",
    onCreate: async () => undefined,

    /** /api/public/[tenant]/x/catalog | design | lead — dùng cho studio ảnh phòng */
    async handlePublic(ctx) {
      const action = ctx.path[0];
      const { tenant } = ctx;
      if (ctx.req.method === "GET" && action === "catalog") {
        return NextResponse.json({ items: (await catalog.list(tenant.id, { activeOnly: true })).map(toCard) });
      }
      if (ctx.req.method !== "POST") return NextResponse.json({ error: "Không hỗ trợ" }, { status: 405 });
      const raw = await ctx.req.json();

      if (action === "similar") {
        const body = z.object({ visitorId, embedding: z.array(z.number().finite()).length(512), limit: z.number().int().min(1).max(12).default(6) }).parse(raw);
        if (!ctx.rateLimit(`fsim:${tenant.id}:${body.visitorId}`, 30, 10 * 60_000)) return NextResponse.json({ error: "Quá nhiều yêu cầu" }, { status: 429 });
        const found = await catalog.similarTo(tenant.id, body.embedding, body.limit);
        return NextResponse.json({ items: found.map((f) => ({ ...toCard(f.item), similarity: Math.round(f.similarity * 1000) / 1000 })) });
      }

      if (action === "design") {
        const body = z
          .object({
            visitorId,
            conversationId: z.string().uuid().nullable().optional(),
            room: z.enum(ROOMS),
            style: z.enum(STYLES).optional(),
            budget: z.number().positive().max(10_000_000_000).optional(),
            roomWidthM: z.number().min(1).max(30).optional(),
            roomDepthM: z.number().min(1).max(30).optional(),
            existing: z.array(z.string().max(40)).max(10).default([]),
            seats: z.number().int().min(1).max(12).optional(),
            palette: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).max(6).default([]),
          })
          .parse(raw);
        if (!ctx.rateLimit(`fdesign:${tenant.id}:${body.visitorId}`, 40, 10 * 60_000)) return NextResponse.json({ error: "Quá nhiều yêu cầu" }, { status: 429 });
        const r = await runDesign(tenant.id, body);
        await ctx.trackEvent({ visitorId: body.visitorId, type: "room_designed", conversationId: await ctx.ownConversation(body.visitorId, body.conversationId), value: r.subtotal });
        return NextResponse.json({ set: roomSetView(r) });
      }

      if (action === "lead") {
        const body = z
          .object({
            visitorId,
            conversationId: z.string().uuid().nullable().optional(),
            name: z.string().min(1).max(80),
            phone: z.string().min(9).max(20),
            note: z.string().max(1000).default(""),
            /** "Phòng khách Bắc Âu 4×5 m: Sofa Oslo, Bàn trà Moon — 15.050.000 ₫" */
            design: z.string().max(600).default(""),
            total: z.number().min(0).max(10_000_000_000).default(0),
            previewBase64: z.string().max(4_000_000).regex(/^[A-Za-z0-9+/=]+$/).optional(),
          })
          .parse(raw);
        if (!ctx.rateLimit(`flead:${tenant.id}:${body.visitorId}`, 5, 60 * 60_000)) return NextResponse.json({ error: "Anh/chị đã gửi thông tin rồi, nhân viên sẽ liên hệ sớm ạ." }, { status: 429 });
        const meta: Record<string, string | number> = {};
        if (body.design) meta.design = body.design;
        if (body.total) meta.designTotal = body.total;
        if (body.previewBase64) {
          const bytes = new Uint8Array(Buffer.from(body.previewBase64, "base64"));
          if (bytes.byteLength > 3_000_000) throw new DomainError("PREVIEW_TOO_BIG", "Ảnh quá lớn");
          meta.previewUrl = await deps.files.put(`${tenant.id}/room-designs/${crypto.randomUUID()}.jpg`, bytes, "image/jpeg");
        }
        const note = [body.note, body.design && `Phương án kê thử: ${body.design}`].filter(Boolean).join(" — ");
        const lead = await ctx.captureLead({ visitorId: body.visitorId, conversationId: await ctx.ownConversation(body.visitorId, body.conversationId), name: body.name, phone: body.phone, note, meta });
        return NextResponse.json({ ok: true, leadId: lead.id });
      }
      return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    },

    async seedDemo(tenantId) {
      // Gọi lại được: chỉ thêm mẫu demo còn thiếu
      const have = new Set((await deps.items.list(tenantId)).map((i) => i.sku));
      const ids: string[] = [];
      for (const i of DEMO_FURNITURE) if (!have.has(i.sku)) ids.push((await deps.items.create({ ...NO_ASSETS, ...i, ...(DEMO_PAIRS[i.sku] ?? {}), tenantId, imageUrl: "", active: true })).id);
      // Ảnh tách nền (SVG vẽ theo số đo) + mô hình 3D mẫu cho sofa/bàn/kệ — để thử studio và xem 3D khi shop demo chưa có ảnh/GLB thật.
      // Chỉ bổ sung cho món chưa có gì (không đè dữ liệu shop đã nhập).
      for (const it of await deps.items.list(tenantId)) {
        const pair = DEMO_PAIRS[it.sku];
        if (!DEMO_FURNITURE.some((d) => d.sku === it.sku)) continue;
        const patch: Partial<NewFurnitureItem> = {};
        if (pair && !it.collection) Object.assign(patch, pair);
        if (!it.cutoutUrl && !it.imageUrl) patch.cutoutUrl = await deps.files.put(`${tenantId}/furniture-cutouts/${it.sku}.svg`, new TextEncoder().encode(furnitureSvg(it)), "image/svg+xml");
        // Mô hình 3D: ưu tiên quét thật (assets/demo-furniture/<sku>.glb, tải bằng scripts/fetch-demo-furniture.mjs);
        // chưa có file thì dùng khối hộp ghép. Bản khối hộp cũ (…/<sku>.glb) được thay bằng bản thật (…/<sku>-v2.glb).
        const real = await readDemoGlb(it.sku);
        const oldBoxes = !!it.modelUrl && it.modelUrl.includes(`/furniture-models/${it.sku}.glb`);
        if (real && (!it.modelUrl || oldBoxes)) {
          patch.modelUrl = await deps.files.put(`${tenantId}/furniture-models/${it.sku}-v2.glb`, real, "model/gltf-binary");
          patch.modelStatus = "ready";
        } else if (!it.modelUrl && /sofa|bàn|kệ/i.test(it.category) && !/ghế/i.test(it.category)) {
          patch.modelUrl = await deps.files.put(`${tenantId}/furniture-models/${it.sku}.glb`, await demoGlb(it), "model/gltf-binary");
          patch.modelStatus = "ready";
        }
        if (Object.keys(patch).length) await deps.items.update(tenantId, it.id, patch);
      }
      return ids;
    },
  };
}
