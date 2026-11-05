/**
 * Test tích hợp trên PGlite (Postgres trong bộ nhớ) với repository thật:
 * tầng quyết định jev → mẫu / chuyển nhân viên / LLM theo độ khó, jev lỗi → luật, guard chống bịa,
 * live chat (bot im khi nhân viên nhận), đặt lịch chống trùng chỗ, cô lập 2 shop, báo cáo nhu cầu,
 * và kiến trúc đa bot: tài khoản sở hữu nhiều bot, mỗi loại bot dùng schema riêng (store / tile).
 */
import { PGlite } from "@electric-sql/pglite";
import { composeWithAvi } from "@/bots/avi/compose";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import {
  accountRepo,
  adminUserRepo,
  bookingRepo,
  conversationRepo,
  eventRepo,
  insightRepo,
  leadRepo,
  llmCallRepo,
  serviceRepo,
  tenantRepo,
} from "@/adapters/db/repositories";
import { RuleBasedLlmGateway } from "@/adapters/llm/ruleBasedLlmGateway";
import { RuleDecisionGateway } from "@/adapters/llm/ruleDecisionGateway";
import {
  LlmUnavailableError,
  type ChatTool,
  type DecisionGateway,
  type LlmGateway,
  type LlmTier,
  type LlmTurnResult,
  type Notifier,
} from "@/application/ports";
import { makeBookings } from "@/application/use-cases/bookings";
import { makeServices } from "@/application/use-cases/services";
import { makeAuth, makeTenants } from "@/application/use-cases/tenants";
import { makeCatalog } from "@/bots/store/catalog";
import { makeStoreModule } from "@/bots/store/module";
import { productRepo } from "@/bots/store/repository";
import { makeTileCatalog } from "@/bots/tile/catalog";
import { makeTileModule } from "@/bots/tile/module";
import { makeQuotes } from "@/bots/tile/quotes";
import { tileRepos } from "@/bots/tile/repository";
import type { BotModule } from "@/bots/types";
import { SAFE_TEXT, makeChat } from "@/application/use-cases/chat";
import { makeInsights } from "@/application/use-cases/insights";
import { makeLeads } from "@/application/use-cases/leads";
import { makeSupport } from "@/application/use-cases/support";
import { addDays, atLocal, localDate } from "@/domain/booking";
import type { Decision } from "@/domain/decision";
import { defaultSettings, type BotKind, type Tenant } from "@/domain/tenant";
import type { DB } from "@/infrastructure/db/client";
import * as schema from "@/infrastructure/db/schema";

type Script = (input: {
  user: { text: string };
  tools: ChatTool[];
  tier: LlmTier;
  call: number;
  system: string;
}) => Promise<string>;

class FakeLlm implements LlmGateway {
  readonly id = "fake";
  calls: { tier: LlmTier; text: string; system: string }[] = [];
  constructor(public script: Script) {}
  describe() {
    return { simple: "fake-simple", complex: "fake-complex" };
  }
  async respond(input: {
    system: string;
    history: unknown[];
    user: { text: string };
    tools: ChatTool[];
    tier: LlmTier;
  }): Promise<LlmTurnResult> {
    this.calls.push({
      tier: input.tier,
      text: input.user.text,
      system: input.system,
    });
    const text = await this.script({ ...input, call: this.calls.length });
    return {
      text,
      history: [...input.history, { u: input.user.text, a: text }],
      usage: {
        model: `fake-${input.tier}`,
        inputTokens: 10,
        outputTokens: 5,
        calls: 1,
      },
    };
  }
}

/** jev giả: trả quyết định theo bảng, ném lỗi khi được yêu cầu */
class FakeJev implements DecisionGateway {
  readonly id = "jev";
  readonly model = "typesafe/jev-router";
  fail = false;
  constructor(private table: Record<string, Partial<Decision>>) {}
  async classify({ text }: { text: string }) {
    if (this.fail) throw new LlmUnavailableError("jev", "rate_limited", "429");
    const d = this.table[text] ?? { label: "needs_consult", confidence: 0.9 };
    return {
      label: "needs_consult",
      confidence: 0.9,
      difficulty: "simple",
      topic: "chủ đề",
      sentiment: "neutral",
      need: text,
      source: this.model,
      ...d,
    } as Decision;
  }
}

const tool = (tools: ChatTool[], name: string) =>
  tools.find((t) => t.name === name)!;
const notified: string[] = [];
const notifier: Notifier = {
  notify: async (_t, kind, text) => void notified.push(`${kind}:${text}`),
};

let db: DB;
const shopA: Tenant = {
  id: "tenant-a",
  accountId: "acc-1",
  kind: "store",
  status: "active",
  slug: "shop-a",
  name: "Shop A",
  settings: {
    ...defaultSettings("Shop A"),
    phone: "0901 111 222",
    knowledgeBase: "GIAO HÀNG\nPhí giao nội thành 20.000đ.",
  },
  createdAt: new Date(),
};
const shopB: Tenant = {
  id: "tenant-b",
  accountId: "acc-2",
  kind: "store",
  status: "active",
  slug: "shop-b",
  name: "Shop B",
  settings: defaultSettings("Shop B"),
  createdAt: new Date(),
};
/** Bot gạch của cùng tài khoản acc-1 (dùng chung bảng public, riêng schema tile) */
const tileShop: Tenant = {
  id: "tenant-t",
  accountId: "acc-1",
  kind: "tile",
  status: "active",
  slug: "gach-t",
  name: "Gạch T",
  settings: {
    ...defaultSettings("Gạch T"),
    knowledgeBase: "GIAO HÀNG\nMiễn phí giao nội thành cho đơn từ 20 m².",
  },
  createdAt: new Date(),
};

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema }) as unknown as DB;
  for (const stmt of schema.DDL) await db.execute(sql.raw(stmt));
  for (const t of [shopA, shopB, tileShop])
    await db
      .insert(schema.tenants)
      .values({
        id: t.id,
        accountId: t.accountId,
        kind: t.kind,
        slug: t.slug,
        name: t.name,
        settings: t.settings,
      });
  await db
    .insert(schema.tiles)
    .values({
      id: "t-1",
      tenantId: "tenant-t",
      sku: "T-6060",
      name: "Vân đá thử",
      widthMm: 600,
      heightMm: 600,
      thicknessMm: 9,
      piecesPerBox: 4,
      pricePerM2: 200_000,
      finish: "matte",
      usage: ["floor"],
      style: "vân đá",
      color: "trắng",
      textureUrl: "/t.svg",
      description: "Gạch thử",
      stock: 50,
    });
  await db.insert(schema.products).values([
    {
      id: "a-p1",
      tenantId: "tenant-a",
      sku: "A-SRM-01",
      name: "Sữa rửa mặt dịu nhẹ",
      category: "Làm sạch",
      price: 189_000,
      description: "Cho da nhạy cảm",
      tags: ["da khô"],
    },
    {
      id: "b-p1",
      tenantId: "tenant-b",
      sku: "B-SECRET",
      name: "Sữa rửa mặt shop B",
      category: "Làm sạch",
      price: 999_000,
      description: "Bí mật shop B",
      tags: [],
    },
  ]);
  await db
    .insert(schema.services)
    .values([
      {
        id: "00000000-0000-4000-8000-000000000001",
        tenantId: "tenant-a",
        name: "Soi da",
        durationMin: 60,
        price: 0,
      },
    ]);
});

function setup(llm: LlmGateway, jev: DecisionGateway | null) {
  const events = eventRepo(db);
  const conversations = conversationRepo(db);
  const services = makeServices({ services: serviceRepo(db) });
  const products = productRepo(db);
  const catalog = makeCatalog({ products });
  const tiles = tileRepos(db);
  const tileCatalog = makeTileCatalog({ tiles: tiles.tiles });
  const quotes = makeQuotes({ repos: tiles, track: (e) => events.record(e) });
  const files = {
    put: async (k: string) => `/files/${k}`,
    get: async () => null,
  };
  const core = makeStoreModule({ catalog, products });
  const modules: Record<BotKind, BotModule> = {
    store: core,
    tile: composeWithAvi(
      core,
      makeTileModule({ repos: tiles, catalog: tileCatalog, quotes, files }),
    ),
  };
  const leads = makeLeads({
    leads: leadRepo(db),
    events,
    notifier,
    baseUrl: "http://x",
  });
  const bookings = makeBookings({
    bookings: bookingRepo(db),
    services: serviceRepo(db),
    leads: leadRepo(db),
    events,
    conversations,
    notifier,
  });
  const support = makeSupport({
    conversations,
    events,
    notifier,
    leads,
    baseUrl: "http://x",
  });
  const llmCalls = llmCallRepo(db);
  const chat = makeChat({
    conversations,
    events,
    insights: insightRepo(db),
    llm,
    decision: jev,
    fallbackDecision: new RuleDecisionGateway(),
    modules,
    services,
    bookings,
    support,
    llmCalls,
  });
  return {
    chat,
    support,
    bookings,
    llmCalls,
    quotes,
    modules,
    insights: makeInsights({ insights: insightRepo(db), llm }),
  };
}

const send = (
  chat: ReturnType<typeof setup>["chat"],
  tenant: Tenant,
  visitorId: string,
  text: string,
) => chat.handleMessage({ tenant, visitorId, channel: "web", text });

describe("tầng quyết định jev", () => {
  it("chào hỏi / hỏi liên hệ / đặt lịch → trả lời mẫu, KHÔNG gọi LLM", async () => {
    const llm = new FakeLlm(async () => "không được gọi");
    const jev = new FakeJev({
      "chào shop": { label: "greeting" },
      "shop ở đâu": { label: "ask_contact" },
      "đặt lịch soi da": { label: "booking" },
    });
    const { chat, llmCalls } = setup(llm, jev);
    const r1 = await send(chat, shopA, "visitor-tpl-1", "chào shop");
    const r2 = await send(chat, shopA, "visitor-tpl-1", "shop ở đâu");
    const r3 = await send(chat, shopA, "visitor-tpl-1", "đặt lịch soi da");
    expect(llm.calls).toHaveLength(0);
    expect(r2.reply!.text).toContain("0901 111 222");
    expect(r3.reply!.action).toEqual({ type: "booking" });
    const sum = await llmCalls.summary("tenant-a", {
      from: new Date(Date.now() - 60_000),
      to: new Date(Date.now() + 60_000),
    });
    expect(sum.turns).toBeGreaterThanOrEqual(3);
    expect(sum.llmTurns).toBe(0);
  });

  it("câu dễ → LLM rẻ, câu khó → LLM mạnh, jev không chắc → LLM mạnh", async () => {
    const llm = new FakeLlm(async () => "Dạ mình tư vấn ạ");
    const jev = new FakeJev({
      dễ: { difficulty: "simple" },
      khó: { difficulty: "complex" },
      "mơ hồ": { label: "off_topic", confidence: 0.3 },
    });
    const { chat } = setup(llm, jev);
    await send(chat, shopA, "visitor-tier-1", "dễ");
    await send(chat, shopA, "visitor-tier-1", "khó");
    await send(chat, shopA, "visitor-tier-1", "mơ hồ");
    expect(llm.calls.map((c) => c.tier)).toEqual([
      "simple",
      "complex",
      "complex",
    ]);
  });

  it("ngoài dữ liệu → chuyển nhân viên: hộp 'Cần hỗ trợ' + webhook", async () => {
    const llm = new FakeLlm(async () => "x");
    const { chat, support } = setup(
      llm,
      new FakeJev({ "đơn của tôi đâu": { label: "not_in_data" } }),
    );
    notified.length = 0;
    const r = await send(chat, shopA, "visitor-handoff-1", "đơn của tôi đâu");
    expect(llm.calls).toHaveLength(0);
    expect(r.reply!.action).toEqual({ type: "handoff", reason: "not_in_data" });
    expect(notified.some((n) => n.startsWith("handoff:"))).toBe(true);
    expect((await support.counts("tenant-a")).open).toBeGreaterThanOrEqual(1);
  });

  it("bot 2 lần liên tiếp không trả lời được → tự đề nghị gặp nhân viên", async () => {
    const llm = new FakeLlm(async () => "Mình chưa có thông tin này ạ.");
    const { chat } = setup(llm, new FakeJev({}));
    await send(chat, shopA, "visitor-esc-1", "câu 1");
    await send(chat, shopA, "visitor-esc-1", "câu 2");
    const r = await send(chat, shopA, "visitor-esc-1", "câu 3");
    expect(llm.calls).toHaveLength(2);
    expect(r.reply!.action).toEqual({
      type: "handoff",
      reason: "repeated_unresolved",
    });
  });

  it("jev lỗi 429 → phân loại theo luật, hội thoại vẫn chạy", async () => {
    const llm = new FakeLlm(async () => "x");
    const jev = new FakeJev({});
    jev.fail = true;
    const { chat } = setup(llm, jev);
    const r = await send(chat, shopA, "visitor-jevdown", "Chào shop");
    expect(r.reply!.text).toContain("Chào bạn");
    expect(llm.calls).toHaveLength(0);
  });
});

describe("LLM + dữ liệu", () => {
  it("guard: số tiền bịa → hỏi lại; vẫn sai → câu an toàn + gợi ý nhân viên", async () => {
    const llm = new FakeLlm(async () => "Sản phẩm giá 150.000đ thôi ạ");
    const { chat } = setup(llm, new FakeJev({}));
    const r = await send(chat, shopA, "visitor-guard-1", "giá bao nhiêu");
    expect(llm.calls).toHaveLength(2);
    expect(r.reply!.text).toBe(SAFE_TEXT);
    expect(r.reply!.action).toEqual({
      type: "handoff",
      reason: "guard_blocked",
    });
  });

  it("tool chỉ thấy sản phẩm của đúng shop", async () => {
    const llm = new FakeLlm(async ({ tools }) => {
      const res = (await tool(tools, "search_products").run({
        query: "sữa rửa mặt",
      })) as { name: string; price: string }[];
      return `Có: ${res.map((p) => `${p.name} ${p.price}`).join(", ")}`;
    });
    const { chat } = setup(llm, new FakeJev({}));
    const r = await send(chat, shopA, "visitor-iso-1", "sữa rửa mặt");
    expect(r.reply!.text).toContain("Sữa rửa mặt dịu nhẹ");
    expect(r.reply!.text).not.toContain("shop B");
    expect((r.products as { id: string }[]).map((p) => p.id)).toEqual(["a-p1"]);
  });

  it("LLM gọi request_human → thẻ liên hệ nhân viên", async () => {
    const llm = new FakeLlm(async ({ tools }) => {
      await tool(tools, "request_human").run({ reason: "not_in_data" });
      return "Mình đã mời nhân viên hỗ trợ bạn.";
    });
    const { chat } = setup(llm, new FakeJev({}));
    const r = await send(chat, shopA, "visitor-tool-h", "hỏi khó");
    expect(r.reply!.action).toEqual({ type: "handoff", reason: "not_in_data" });
  });

  it("LLM hết hạn mức → bot theo luật tra kiến thức shop", async () => {
    const llm = new FakeLlm(async () => {
      throw new LlmUnavailableError("fake", "rate_limited", "429");
    });
    const { chat } = setup(llm, new FakeJev({}));
    const r = await send(
      chat,
      shopA,
      "visitor-down-1",
      "phí giao hàng nội thành",
    );
    expect(r.reply!.text).toContain("20.000đ");
  });
});

describe("live chat", () => {
  it("nhân viên nhận chat → bot im, tin nhân viên đến widget qua poll; trả lại → bot trả lời tiếp", async () => {
    const llm = new FakeLlm(async () => "bot trả lời");
    const { chat, support } = setup(llm, new FakeJev({}));
    const first = await send(chat, shopA, "visitor-live-1", "xin chào");
    const convId = first.conversationId;
    await support.agentReply(
      "tenant-a",
      convId,
      "Lan",
      "Chào bạn, mình là Lan",
    );
    const r = await send(chat, shopA, "visitor-live-1", "chị Lan ơi");
    expect(r.reply).toBeNull();
    expect(r.mode).toBe("human");
    const callsBefore = llm.calls.length;
    const polled = await support.since("tenant-a", convId, first.reply!.id);
    expect(
      polled.entries.some((e) => e.role === "agent" && e.text.includes("Lan")),
    ).toBe(true);
    await support.resolve("tenant-a", convId);
    const r2 = await send(
      chat,
      shopA,
      "visitor-live-1",
      "cảm ơn, hỏi thêm chút",
    );
    expect(r2.reply).not.toBeNull();
    expect(llm.calls.length).toBe(callsBefore + 1);
  });
});

describe("đặt lịch", () => {
  it("không cho 2 khách cùng giữ chỗ cuối cùng; tạo lead + ghi vào hội thoại", async () => {
    const { bookings, chat } = setup(new FakeLlm(async () => "x"), null);
    const tenant: Tenant = {
      ...shopA,
      settings: {
        ...shopA.settings,
        booking: { ...shopA.settings.booking, capacity: 1, minLeadMin: 0 },
      },
    };
    const date = addDays(localDate(new Date()), 2);
    const conv = await chat.start(tenant, "visitor-book-1", "web");
    const input = {
      tenant,
      visitorId: "visitor-book-1",
      conversationId: conv.conversationId,
      serviceId: "00000000-0000-4000-8000-000000000001",
      date,
      time: "10:00",
      name: "An",
      phone: "0912345678",
      note: "",
    };
    const results = await Promise.allSettled([
      bookings.create(input),
      bookings.create({ ...input, name: "Bình", conversationId: null }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "SLOT_TAKEN" },
    });
    const slots = await bookings.slots(tenant, input.serviceId, date);
    expect(slots.map((s) => s.time)).not.toContain("10:00");
    expect(slots.map((s) => s.time)).not.toContain("09:30"); // dịch vụ 60 phút chồng lên 10:00
    const after = await chat.get("tenant-a", conv.conversationId);
    expect(after!.transcript.at(-1)!.text).toContain("đặt lịch Soi da");
    expect(atLocal(date, "10:00").getTime()).toBeGreaterThan(Date.now());
  });
});

describe("báo cáo nhu cầu", () => {
  it("ghi nhãn/chủ đề mỗi câu hỏi và liệt kê câu chưa trả lời được", async () => {
    const llm = new FakeLlm(async () => "Mình chưa có thông tin này ạ.");
    const { chat, insights } = setup(
      llm,
      new FakeJev({
        "shop có bán son không": {
          label: "product_query",
          topic: "son môi",
          need: "Tìm son môi",
        },
      }),
    );
    await send(chat, shopB, "visitor-ins-1", "shop có bán son không");
    const r = await insights.report("tenant-b", {
      from: new Date(Date.now() - 60_000),
      to: new Date(Date.now() + 60_000),
    });
    expect(r.topics.find((t) => t.topic === "son môi")?.unanswered).toBe(1);
    expect(r.unanswered[0].text).toBe("shop có bán son không");
    const a = await insights.report("tenant-a", {
      from: new Date(Date.now() - 60_000),
      to: new Date(Date.now() + 60_000),
    });
    expect(a.topics.some((t) => t.topic === "son môi")).toBe(false);
  });
});

describe("kiến trúc đa bot", () => {
  it("mỗi loại bot dùng schema riêng: bảng ở store / tile, không còn ở public", async () => {
    const rows = (await db.execute(
      sql.raw(
        "SELECT table_schema AS s, table_name AS t FROM information_schema.tables WHERE table_schema IN ('public','store','tile')",
      ),
    )) as unknown as { rows: { s: string; t: string }[] };
    const where = (t: string) =>
      rows.rows.filter((r) => r.t === t).map((r) => r.s);
    expect(where("products")).toEqual(["store"]);
    expect(where("tiles")).toEqual(["tile"]);
    expect(where("quotes")).toEqual(["tile"]);
    expect(where("conversations")).toEqual(["public"]);
    expect(where("leads")).toEqual(["public"]);
  });

  it("một tài khoản có nhiều bot; đếm bot theo loại", async () => {
    const repo = tenantRepo(db);
    expect(
      (await repo.listByAccount("acc-1")).map((t) => t.kind).sort(),
    ).toEqual(["store", "tile"]);
    const counts = await repo.countByKind();
    expect(counts.tile).toBeGreaterThanOrEqual(1);
    expect(counts.store).toBeGreaterThanOrEqual(2);
  });

  it("bot gạch: tool báo giá của module tile chạy qua engine chung, kèm báo giá trong extras", async () => {
    const llm = new FakeLlm(async ({ tools }) => {
      const found = (await tool(tools, "suggest_tiles").run({
        query: "vân đá",
      })) as { tileId: string }[];
      const q = (await tool(tools, "calculate_quote").run({
        tileId: found[0].tileId,
        areaM2: 20,
      })) as { total: string; boxes: number };
      return `Báo giá: ${q.boxes} thùng, tổng ${q.total}`;
    });
    const { chat } = setup(llm, new FakeJev({}));
    const r = await send(
      chat,
      tileShop,
      "visitor-tile-1",
      "báo giá gạch vân đá 20m2",
    );
    expect(r.reply!.text).toContain("thùng");
    expect(r.products).toHaveLength(1);
    expect((r.extras.quote as { tileName: string }).tileName).toBe(
      "Vân đá thử",
    );
    expect(llm.calls[0].system).toContain("vật liệu ốp lát");
  });

  it("bot gạch không thấy sản phẩm của bot store và ngược lại", async () => {
    const llm = new FakeLlm(async ({ tools }) =>
      JSON.stringify(
        await tool(tools, "search_products").run({ query: "sữa rửa mặt" }),
      ),
    );
    const { chat } = setup(llm, new FakeJev({}));
    // bot gạch kế thừa search_products, nhưng tenantId vẫn cô lập dữ liệu shop khác.
    const r = await send(
      chat,
      tileShop,
      "visitor-tile-2",
      "tìm sữa rửa mặt",
    ).catch((e) => e);
    expect(
      String(r instanceof Error ? r.message : r.reply?.text),
    ).not.toContain("Sữa rửa mặt dịu nhẹ");
  });

  it("bot gạch hết hạn mức LLM → bot gạch theo luật vẫn gợi ý mẫu và tính báo giá", async () => {
    const llm = new FakeLlm(async () => {
      throw new LlmUnavailableError("fake", "rate_limited", "429");
    });
    const { chat } = setup(
      llm,
      new FakeJev({ "vân đá lát sàn 4x5": { label: "product_query" } }),
    );
    const r = await send(
      chat,
      tileShop,
      "visitor-tile-3",
      "vân đá lát sàn 4x5",
    );
    expect(r.products.length).toBeGreaterThan(0);
  });
});

describe("AVI capabilities inherited by tile", () => {
  it("uses shared product tools, cards and grounding together with industry tools without cross-tenant leakage", async () => {
    await db.insert(schema.products).values({ id: "tile-shared-product", tenantId: tileShop.id, sku: "AVI-KEO", name: "Keo dán đa năng", category: "Phụ kiện", price: 99000, description: "Phụ kiện tại cửa hàng gạch", tags: ["keo", "phụ kiện"] }).onConflictDoNothing();
    const llm = new FakeLlm(async ({ tools }) => {
      const names = tools.map((t) => t.name);
      expect(names).toEqual(expect.arrayContaining(["search_products", "get_product_details", "suggest_tiles", "calculate_quote", "open_booking_form", "request_human"]));
      const found = await tool(tools, "search_products").run({ query: "keo" }) as { name: string; price: string }[];
      return `${found[0].name}: ${found[0].price}`;
    });
    const { chat, modules } = setup(llm, new FakeJev({}));
    const response = await send(chat, tileShop, "visitor-avi-shared", "phụ kiện keo");
    expect(response.reply?.text).toContain("Keo dán đa năng");
    expect(response.products).toHaveLength(1);
    const cards = await modules.tile.cards(tileShop.id, ["tile-shared-product", "t-1", "a-p1"]);
    expect((cards as { id: string }[]).map((c) => c.id).sort()).toEqual(["t-1", "tile-shared-product"]);
    expect((await modules.tile.groundingFacts(tileShop)).amounts).toEqual(expect.arrayContaining([99000, 200000]));
  });
  it("keeps the shared catalogue available when the industry LLM falls back to rules", async () => {
    const llm = new FakeLlm(async () => { throw new LlmUnavailableError("fake", "overloaded", "503"); });
    const { chat } = setup(llm, new FakeJev({ "phụ kiện keo": { label: "product_query" } }));
    const response = await send(chat, tileShop, "visitor-avi-fallback", "phụ kiện keo");
    expect(response.reply?.text).toContain("Keo dán đa năng");
    expect(response.products).toHaveLength(1);
  });
});

describe("tài khoản, đăng ký và giới hạn gói", () => {
  function accountSetup() {
    const modules = {
      store: { onCreate: async () => undefined },
      tile: { onCreate: async () => undefined },
    } as unknown as Record<BotKind, BotModule>;
    const tenants = makeTenants({
      tenants: tenantRepo(db),
      accounts: accountRepo(db),
      onCreate: (t) => modules[t.kind].onCreate(t.id),
    });
    const hasher = {
      verify: async (p: string, h: string) => h === `h:${p}`,
      hash: async (p: string) => `h:${p}`,
    };
    return {
      tenants,
      auth: makeAuth({
        users: adminUserRepo(db),
        accounts: accountRepo(db),
        hasher,
        tenants,
      }),
    };
  }

  it("đăng ký tạo tài khoản dùng thử 14 ngày + bot đầu tiên; đăng nhập trả về bot đó", async () => {
    const { auth, tenants } = accountSetup();
    const s = await auth.signup({
      name: "An",
      email: "An@Example.com",
      password: "matkhau123",
      shopName: "Cửa hàng An",
      kind: "tile",
    });
    const bots = await tenants.listByAccount(s.accountId);
    expect(bots).toHaveLength(1);
    expect(bots[0]).toMatchObject({
      kind: "tile",
      slug: "cua-hang-an",
      status: "active",
    });
    const acc = await tenants.account(s.accountId);
    expect(acc!.plan).toBe("trial");
    const days = (acc!.trialEndsAt!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThanOrEqual(14);
    const login = await auth.login("an@example.com", "matkhau123");
    expect(login).toMatchObject({
      accountId: s.accountId,
      tenantId: bots[0].id,
    });
  });

  it("email trùng, mật khẩu yếu, đăng nhập sai bị từ chối", async () => {
    const { auth } = accountSetup();
    await expect(
      auth.signup({
        name: "x",
        email: "an@example.com",
        password: "matkhau123",
        shopName: "Shop khác",
        kind: "store",
      }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
    await expect(
      auth.signup({
        name: "x",
        email: "moi@example.com",
        password: "123",
        shopName: "Shop",
        kind: "store",
      }),
    ).rejects.toMatchObject({ code: "WEAK_PASSWORD" });
    await expect(
      auth.login("an@example.com", "sai-mat-khau"),
    ).rejects.toMatchObject({ code: "BAD_LOGIN" });
  });

  it("gói dùng thử tối đa 2 bot; slug trùng tự thêm hậu tố; bot của tài khoản khác không lẫn", async () => {
    const { auth, tenants } = accountSetup();
    const a = await auth.login("an@example.com", "matkhau123");
    await tenants.createBot(a.accountId, "store", "Cửa hàng An");
    await expect(
      tenants.createBot(a.accountId, "store", "Bot thứ ba"),
    ).rejects.toMatchObject({ code: "PLAN_LIMIT" });
    const bots = await tenants.listByAccount(a.accountId);
    expect(bots.map((b) => b.slug).sort()).toEqual([
      "cua-hang-an",
      "cua-hang-an-2",
    ]);
    const other = await auth.signup({
      name: "Bình",
      email: "binh@example.com",
      password: "matkhau123",
      shopName: "Cửa hàng Bình",
      kind: "store",
    });
    expect(
      (await tenants.listByAccount(other.accountId)).map((b) => b.name),
    ).toEqual(["Cửa hàng Bình"]);
  });
});
