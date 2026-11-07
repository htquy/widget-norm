import { RuleBasedLlmGateway } from "@/adapters/llm/ruleBasedLlmGateway";
import { DomainError } from "@/domain/errors";
import { formatVnd, priceText } from "@/domain/text";
import type { BotModule } from "../types";
import type { Catalog } from "./catalog";
import { DEMO_PRODUCTS } from "./demo";
import { calculateEstimate, type PricingRule } from "./estimate";
import type { ProductRepository } from "./repository";

/** Gợi ý cho LLM biết cần hỏi khách những gì để báo giá */
function quoteHint(r: PricingRule): string {
  switch (r.model) {
    case "per_area":
      return "Báo giá theo m²: cần diện tích hoặc rộng × cao";
    case "coverage":
      return `Báo giá theo độ phủ (${r.coats} lớp): cần diện tích m²`;
    case "per_length":
      return "Báo giá theo mét dài: cần chiều dài (m)";
    case "per_unit":
      return `Báo giá theo số lượng (${r.unit}), có bậc giá: cần số lượng`;
  }
}

/** Module "Trợ lý bán hàng & đặt lịch" — dữ liệu ở schema `store` */
export function makeStoreModule(deps: { catalog: Catalog; products: ProductRepository }): BotModule {
  const { catalog } = deps;
  return {
    kind: "store",
    clientEvents: [],
    interestEvent: "product_clicked",

    tools: ({ tenant, turn }) => [
      {
        name: "search_products",
        description: "Tìm sản phẩm/dịch vụ đang bán của cửa hàng theo nhu cầu khách (từ khoá, danh mục, ngân sách). Gọi trước khi giới thiệu bất kỳ sản phẩm nào.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            query: { type: "string", description: "Từ khoá: tên, công dụng, đặc điểm, đối tượng dùng..." },
            category: { type: "string", description: "Danh mục nếu khách nêu rõ" },
            maxPrice: { type: "number", description: "Ngân sách tối đa (VND)" },
          },
          required: [],
        },
        run: async (raw) => {
          const q = (raw ?? {}) as Record<string, unknown>;
          const cards = await catalog.search(tenant.id, {
            query: typeof q.query === "string" ? q.query : undefined,
            category: typeof q.category === "string" ? q.category : undefined,
            maxPrice: typeof q.maxPrice === "number" ? q.maxPrice : undefined,
          });
          turn.productIds = cards.map((c) => c.id);
          if (cards.length === 0) return { results: [], note: "Không có sản phẩm phù hợp trong danh mục." };
          return cards.map((c) => ({ productId: c.id, name: c.name, sku: c.sku, category: c.category, price: c.priceText, inStock: c.inStock, summary: c.summary || undefined, quotable: c.quotable }));
        },
      },
      {
        name: "get_product_details",
        description: "Lấy mô tả đầy đủ của MỘT sản phẩm (công dụng, thành phần/thông số, cách dùng, giá, còn hàng, link).",
        inputSchema: { type: "object", additionalProperties: false, properties: { productId: { type: "string" } }, required: ["productId"] },
        run: async (raw) => {
          const id = String((raw as Record<string, unknown> | undefined)?.productId ?? "");
          const p = await catalog.get(tenant.id, id);
          if (!p || !p.active) return { error: "Không tìm thấy sản phẩm này" };
          turn.productIds = [p.id];
          return { productId: p.id, name: p.name, sku: p.sku, category: p.category, price: priceText(p.price), inStock: p.inStock, url: p.url || undefined, quotable: p.pricing ? quoteHint(p.pricing) : undefined, description: p.description || "(Shop chưa nhập mô tả)" };
        },
      },
      {
        name: "calculate_estimate",
        description:
          "Tính báo giá cho MỘT sản phẩm có công thức báo giá (get_product_details trả `quotable`): theo diện tích m², độ phủ (sơn…), mét dài (rèm…) hoặc số lượng có bậc giá. Trả chi tiết từng dòng, hao hụt, phụ phí và tổng tiền. Luôn dùng tool này khi khách hỏi 'hết bao nhiêu tiền', không tự nhân.",
        inputSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            productId: { type: "string", description: "productId lấy từ search_products" },
            areaM2: { type: "number", description: "Diện tích (m²)" },
            widthM: { type: "number", description: "Chiều rộng (m); dùng với heightM nếu khách cho rộng × cao, hoặc làm chiều dài cho sản phẩm tính theo mét" },
            heightM: { type: "number", description: "Chiều cao (m)" },
            lengthM: { type: "number", description: "Chiều dài (m), cho sản phẩm tính theo mét" },
            quantity: { type: "number", description: "Số lượng (cái/bộ), cho sản phẩm tính theo số lượng" },
          },
          required: ["productId"],
        },
        run: async (raw) => {
          const q = (raw ?? {}) as Record<string, unknown>;
          const p = await catalog.get(tenant.id, String(q.productId ?? ""));
          if (!p || !p.active) return { error: "Không tìm thấy sản phẩm này" };
          turn.productIds = [p.id];
          if (!p.pricing) return { error: "Sản phẩm này chưa có công thức báo giá — báo theo giá niêm yết và mời khách để lại số điện thoại để nhân viên báo giá." };
          const n = (v: unknown) => (typeof v === "number" ? v : undefined);
          try {
            const e = calculateEstimate(p.name, p.price, p.pricing, { areaM2: n(q.areaM2), widthM: n(q.widthM), heightM: n(q.heightM), lengthM: n(q.lengthM), quantity: n(q.quantity) });
            return { product: p.name, sku: p.sku, lines: e.lines.map((l) => `${l.description}: ${l.quantity} ${l.unit} × ${formatVnd(l.unitPrice)} = ${formatVnd(l.total)}`), notes: e.notes, total: formatVnd(e.total), disclaimer: "Giá tham khảo, nhân viên xác nhận lại khi khảo sát/chốt đơn." };
          } catch (err) {
            if (err instanceof DomainError) return { error: err.message };
            throw err;
          }
        },
      },
    ],

    promptLines: () => [
      `Mục tiêu: hiểu nhu cầu, tư vấn đúng sản phẩm/dịch vụ của shop, giúp khách đặt lịch khi phù hợp, và kết nối nhân viên khi câu hỏi vượt quá dữ liệu.`,
      `- Chỉ giới thiệu sản phẩm lấy từ search_products; hỏi sâu một sản phẩm thì gọi get_product_details. Không tự cộng/nhân tiền.`,
      `- Sản phẩm có \`quotable\` thì báo giá bằng calculate_estimate: hỏi đủ thông tin còn thiếu (diện tích hoặc rộng × cao, số mét, số lượng) rồi đọc lại đúng các dòng và tổng tiền; nhắc đây là giá tham khảo và xin tên + số điện thoại để nhân viên gửi báo giá chính thức.`,
    ],

    async groundingFacts(tenant) {
      const all = await catalog.list(tenant.id);
      const extra = all.flatMap((p) => (p.pricing ? [...p.pricing.addons.map((a) => a.price), ...(p.pricing.model === "per_unit" ? p.pricing.tiers.map((t) => t.price) : [])] : []));
      return { amounts: [...all.map((p) => p.price), ...extra].filter((n) => n >= 1000), skus: all.map((p) => p.sku) };
    },

    async shopSummary(tenantId) {
      return `Danh mục: ${(await catalog.categories(tenantId)).join(", ") || "(chưa có)"}`;
    },

    cards: (tenantId, ids) => catalog.cardsByIds(tenantId, ids),
    async namesByIds(tenantId, ids) {
      return new Map((await deps.products.findManyByIds(tenantId, ids)).map((p) => [p.id, p.name]));
    },
    resolveExtras: async () => ({}),
    fallbackLlm: new RuleBasedLlmGateway(),
    publicConfig: async () => ({}),
    variantFor: async () => "default",
    onCreate: async () => undefined,

    async seedDemo(tenantId) {
      const ids: string[] = [];
      for (const p of DEMO_PRODUCTS) {
        const created = await deps.products.create({ tenantId, sku: p.sku, name: p.name, category: p.category, price: p.price, description: p.desc, tags: [...p.tags], inStock: p.inStock ?? true, active: true, url: "", imageUrl: "", pricing: p.pricing ?? null });
        ids.push(created.id);
      }
      return ids;
    },
  };
}
