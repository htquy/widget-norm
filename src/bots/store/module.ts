import { RuleBasedLlmGateway } from "@/adapters/llm/ruleBasedLlmGateway";
import { priceText } from "@/domain/text";
import type { BotModule } from "../types";
import type { Catalog } from "./catalog";
import { DEMO_PRODUCTS } from "./demo";
import type { ProductRepository } from "./repository";

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
          return cards.map((c) => ({ productId: c.id, name: c.name, sku: c.sku, category: c.category, price: c.priceText, inStock: c.inStock, summary: c.summary || undefined }));
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
          return { productId: p.id, name: p.name, sku: p.sku, category: p.category, price: priceText(p.price), inStock: p.inStock, url: p.url || undefined, description: p.description || "(Shop chưa nhập mô tả)" };
        },
      },
    ],

    promptLines: () => [
      `Mục tiêu: hiểu nhu cầu, tư vấn đúng sản phẩm/dịch vụ của shop, giúp khách đặt lịch khi phù hợp, và kết nối nhân viên khi câu hỏi vượt quá dữ liệu.`,
      `- Chỉ giới thiệu sản phẩm lấy từ search_products; hỏi sâu một sản phẩm thì gọi get_product_details. Không tự cộng/nhân tiền.`,
    ],

    async groundingFacts(tenant) {
      const all = await catalog.list(tenant.id);
      return { amounts: all.map((p) => p.price).filter((n) => n >= 1000), skus: all.map((p) => p.sku) };
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
        const created = await deps.products.create({ tenantId, sku: p.sku, name: p.name, category: p.category, price: p.price, description: p.desc, tags: [...p.tags], inStock: p.inStock ?? true, active: true, url: "", imageUrl: "" });
        ids.push(created.id);
      }
      return ids;
    },
  };
}
