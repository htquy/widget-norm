import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { TenantSettings } from "@/domain/tenant";
import type { TranscriptEntry } from "@/domain/conversation";
import type {
  QuoteOptions,
  QuotePricing,
  QuoteResult,
  SurfaceInput,
} from "@/bots/tile/domain/quote";

/**
 * Một PostgreSQL, nhiều schema (xem .claude/skills/hub-architecture):
 *  - public : phần dùng chung mọi loại bot (tài khoản, bot, hội thoại, lead, sự kiện, phân tích, lịch hẹn)
 *  - store  : bot "Trợ lý bán hàng & đặt lịch" (sản phẩm)
 *  - tile   : bot "Tư vấn & xem thử gạch" (mẫu gạch, báo giá, thông số báo giá)
 * Không có khoá ngoại chéo schema — module tách thành service riêng được.
 */

const ts = (name: string) =>
  timestamp(name, { withTimezone: true, mode: "date" }).notNull().defaultNow();

/* =============================== public =============================== */

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  plan: text("plan").notNull().default("trial"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true, mode: "date" }),
  createdAt: ts("created_at"),
});

export const hubIdentities = pgTable("hub_identities", {
  subject: text("subject").primaryKey(),
  accountId: text("account_id").notNull().unique(),
  tokens: text("tokens").notNull(),
  createdAt: ts("created_at"),
});

export const websiteDomains = pgTable("website_domains", {
  domain: text("domain").primaryKey(),
  accountId: text("account_id").notNull(),
  token: text("token").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true, mode: "date" }),
  createdAt: ts("created_at"),
});

export const botLicenses = pgTable("bot_licenses", {
  key: text("key").primaryKey(),
  accountId: text("account_id").notNull(),
  kind: text("kind").notNull(),
  tenantId: text("tenant_id").notNull(),
});

export const tenants = pgTable(
  "tenants",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    kind: text("kind").notNull().default("store"),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    status: text("status").notNull().default("active"),
    settings: jsonb("settings").$type<TenantSettings>().notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("tenants_account").on(t.accountId)],
);

export const adminUsers = pgTable("admin_users", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("owner"),
});

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  durationMin: integer("duration_min").notNull(),
  price: bigint("price", { mode: "number" }).notNull().default(0),
  description: text("description").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: ts("created_at"),
});

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    serviceId: text("service_id").notNull(),
    conversationId: text("conversation_id"),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    note: text("note").notNull().default(""),
    startAt: timestamp("start_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true, mode: "date" }).notNull(),
    status: text("status").notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("bookings_tenant_start").on(t.tenantId, t.startAt)],
);

export const leads = pgTable(
  "leads",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    conversationId: text("conversation_id"),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull().default(""),
    note: text("note").notNull().default(""),
    source: text("source").notNull().default("form"),
    status: text("status").notNull(),
    wonValue: bigint("won_value", { mode: "number" }),
    meta: jsonb("meta")
      .$type<Record<string, string | number>>()
      .notNull()
      .default({}),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [index("leads_tenant_created").on(t.tenantId, t.createdAt)],
);

export const conversations = pgTable(
  "conversations",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    visitorId: text("visitor_id").notNull(),
    channel: text("channel").notNull(),
    mode: text("mode").notNull().default("bot"),
    handoffStatus: text("handoff_status").notNull().default("none"),
    handoffReason: text("handoff_reason"),
    rating: integer("rating"),
    historyProvider: text("history_provider").notNull().default(""),
    history: jsonb("history").$type<unknown[]>().notNull(),
    transcript: jsonb("transcript").$type<TranscriptEntry[]>().notNull(),
    createdAt: ts("created_at"),
    updatedAt: ts("updated_at"),
  },
  (t) => [
    index("conv_tenant_visitor").on(t.tenantId, t.visitorId, t.updatedAt),
    index("conv_tenant_handoff").on(t.tenantId, t.handoffStatus, t.updatedAt),
  ],
);

export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: text("tenant_id").notNull(),
    visitorId: text("visitor_id").notNull(),
    type: text("type").notNull(),
    variant: text("variant").notNull().default(""),
    conversationId: text("conversation_id"),
    refId: text("ref_id"),
    value: bigint("value", { mode: "number" }),
    createdAt: ts("created_at"),
  },
  (t) => [index("events_tenant_created").on(t.tenantId, t.createdAt)],
);

export const messageInsights = pgTable(
  "message_insights",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: text("tenant_id").notNull(),
    conversationId: text("conversation_id").notNull(),
    text: text("text").notNull(),
    label: text("label").notNull(),
    confidence: real("confidence").notNull().default(0),
    topic: text("topic").notNull().default(""),
    need: text("need").notNull().default(""),
    sentiment: text("sentiment").notNull().default("neutral"),
    handledBy: text("handled_by").notNull(),
    unanswered: boolean("unanswered").notNull().default(false),
    createdAt: ts("created_at"),
  },
  (t) => [index("insights_tenant_created").on(t.tenantId, t.createdAt)],
);

export const llmCalls = pgTable(
  "llm_calls",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: text("tenant_id").notNull(),
    conversationId: text("conversation_id").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    calls: integer("calls").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    outcome: text("outcome").notNull(),
    error: text("error"),
    decisionLabel: text("decision_label"),
    decisionConfidence: real("decision_confidence"),
    decisionModel: text("decision_model"),
    decisionLatencyMs: integer("decision_latency_ms").notNull().default(0),
    decisionTokens: integer("decision_tokens").notNull().default(0),
    route: text("route").notNull().default(""),
    createdAt: ts("created_at"),
  },
  (t) => [index("llm_calls_tenant_created").on(t.tenantId, t.createdAt)],
);

/* =============================== store =============================== */

export const storeSchema = pgSchema("store");

export const products = storeSchema.table(
  "products",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull().default(""),
    price: bigint("price", { mode: "number" }).notNull().default(0),
    description: text("description").notNull().default(""),
    url: text("url").notNull().default(""),
    imageUrl: text("image_url").notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    inStock: boolean("in_stock").notNull().default(true),
    active: boolean("active").notNull().default(true),
    createdAt: ts("created_at"),
  },
  (t) => [uniqueIndex("products_tenant_sku").on(t.tenantId, t.sku)],
);

/* =============================== tile =============================== */

export const tileSchema = pgSchema("tile");

export const tiles = tileSchema.table(
  "tiles",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    widthMm: integer("width_mm").notNull(),
    heightMm: integer("height_mm").notNull(),
    thicknessMm: real("thickness_mm").notNull(),
    piecesPerBox: integer("pieces_per_box").notNull(),
    pricePerM2: integer("price_per_m2").notNull(),
    finish: text("finish").notNull(),
    usage: jsonb("usage").$type<string[]>().notNull(),
    style: text("style").notNull().default(""),
    color: text("color").notNull().default(""),
    textureUrl: text("texture_url").notNull(),
    description: text("description").notNull().default(""),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    stock: integer("stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: ts("created_at"),
  },
  (t) => [uniqueIndex("tiles_tenant_sku").on(t.tenantId, t.sku)],
);

export const quotes = tileSchema.table(
  "quotes",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    conversationId: text("conversation_id"),
    tileId: text("tile_id").notNull(),
    surfaces: jsonb("surfaces").$type<SurfaceInput[]>().notNull(),
    options: jsonb("options").$type<QuoteOptions>().notNull(),
    result: jsonb("result").$type<QuoteResult>().notNull(),
    createdAt: ts("created_at"),
  },
  (t) => [index("quotes_tenant_created").on(t.tenantId, t.createdAt)],
);

/** Thông số riêng của bot gạch: hao hụt, keo, ron, % khách thấy trình xem thử (A/B) */
export const tileSettings = tileSchema.table("settings", {
  tenantId: text("tenant_id").primaryKey(),
  pricing: jsonb("pricing").$type<QuotePricing>().notNull(),
  abVisualizerPercent: integer("ab_visualizer_percent").notNull().default(100),
  updatedAt: ts("updated_at"),
});

/* =============================== DDL =============================== */

const PUBLIC_TABLES = [
  "accounts",
  "tenants",
  "admin_users",
  "services",
  "bookings",
  "leads",
  "conversations",
  "events",
  "message_insights",
  "llm_calls",
  "hub_identities",
  "website_domains",
  "bot_licenses",
];

/** Chuyển bảng cũ ở public sang schema module (bản widget-norm đầu tiên để products ở public) — không mất dữ liệu */
const moveToSchema = (table: string, schema: string) => `DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${table}')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = '${table}') THEN
    ALTER TABLE public.${table} SET SCHEMA ${schema};
  END IF;
END $$`;

/** DDL tương ứng schema trên — chạy lúc khởi động (idempotent), kèm nâng cấp DB của bản trước. */
export const DDL = [
  `CREATE SCHEMA IF NOT EXISTS store`,
  `CREATE SCHEMA IF NOT EXISTS tile`,

  /* ---- public ---- */
  `CREATE TABLE IF NOT EXISTS bot_licenses (key text PRIMARY KEY, account_id text NOT NULL, kind text NOT NULL, tenant_id text NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS hub_identities (subject text PRIMARY KEY, account_id text NOT NULL UNIQUE, tokens text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS website_domains (domain text PRIMARY KEY, account_id text NOT NULL, token text NOT NULL, verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS accounts (id text PRIMARY KEY, name text NOT NULL, email text NOT NULL, plan text NOT NULL DEFAULT 'trial', trial_ends_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS tenants (id text PRIMARY KEY, account_id text NOT NULL DEFAULT '', kind text NOT NULL DEFAULT 'store', slug text NOT NULL UNIQUE, name text NOT NULL, status text NOT NULL DEFAULT 'active', settings jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS account_id text NOT NULL DEFAULT ''`,
  `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'store'`,
  `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'`,
  `CREATE INDEX IF NOT EXISTS tenants_account ON tenants (account_id)`,
  `CREATE TABLE IF NOT EXISTS admin_users (id text PRIMARY KEY, account_id text NOT NULL DEFAULT '', email text NOT NULL UNIQUE, password_hash text NOT NULL, name text NOT NULL, role text NOT NULL DEFAULT 'owner')`,
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS account_id text NOT NULL DEFAULT ''`,
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner'`,
  // Bản trước: mỗi shop là một "tài khoản" → tạo account cùng id cho shop chưa có, gắn admin theo tenant_id cũ
  `DO $$ BEGIN
    INSERT INTO accounts (id, name, email) SELECT t.id, t.name, '' FROM tenants t WHERE t.account_id = '' ON CONFLICT (id) DO NOTHING;
    UPDATE tenants SET account_id = id WHERE account_id = '';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name = 'tenant_id') THEN
      EXECUTE 'UPDATE admin_users SET account_id = tenant_id WHERE account_id = ''''';
      EXECUTE 'ALTER TABLE admin_users ALTER COLUMN tenant_id DROP NOT NULL';
    END IF;
  END $$`,
  `CREATE TABLE IF NOT EXISTS services (id text PRIMARY KEY, tenant_id text NOT NULL, name text NOT NULL, duration_min integer NOT NULL, price bigint NOT NULL DEFAULT 0, description text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS bookings (id text PRIMARY KEY, tenant_id text NOT NULL, service_id text NOT NULL, conversation_id text, name text NOT NULL, phone text NOT NULL, note text NOT NULL DEFAULT '', start_at timestamptz NOT NULL, end_at timestamptz NOT NULL, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS conversation_id text`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT ''`,
  `CREATE INDEX IF NOT EXISTS bookings_tenant_start ON bookings (tenant_id, start_at)`,
  `CREATE TABLE IF NOT EXISTS leads (id text PRIMARY KEY, tenant_id text NOT NULL, conversation_id text, name text NOT NULL, phone text NOT NULL, email text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', source text NOT NULL DEFAULT 'form', status text NOT NULL, won_value bigint, meta jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'form'`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_value bigint`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT ''`,
  `ALTER TABLE leads ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()`,
  `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'leads' AND column_name = 'variant') THEN ALTER TABLE leads ALTER COLUMN variant DROP NOT NULL; END IF; END $$`,
  `CREATE INDEX IF NOT EXISTS leads_tenant_created ON leads (tenant_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS conversations (id text PRIMARY KEY, tenant_id text NOT NULL, visitor_id text NOT NULL, channel text NOT NULL, mode text NOT NULL DEFAULT 'bot', handoff_status text NOT NULL DEFAULT 'none', handoff_reason text, rating integer, history_provider text NOT NULL DEFAULT '', history jsonb NOT NULL, transcript jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'bot'`,
  `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_status text NOT NULL DEFAULT 'none'`,
  `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS handoff_reason text`,
  `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS rating integer`,
  `ALTER TABLE conversations ADD COLUMN IF NOT EXISTS history_provider text NOT NULL DEFAULT ''`,
  // Cột cũ (A/B variant) đã bỏ khỏi code nhưng DB cũ còn NOT NULL không default → insert lỗi 23502. Giữ dữ liệu, chỉ gỡ ràng buộc.
  `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'conversations' AND column_name = 'variant') THEN ALTER TABLE conversations ALTER COLUMN variant DROP NOT NULL; END IF; END $$`,
  `CREATE INDEX IF NOT EXISTS conv_tenant_visitor ON conversations (tenant_id, visitor_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS conv_tenant_handoff ON conversations (tenant_id, handoff_status, updated_at)`,
  `CREATE TABLE IF NOT EXISTS events (id bigserial PRIMARY KEY, tenant_id text NOT NULL, visitor_id text NOT NULL, type text NOT NULL, variant text NOT NULL DEFAULT '', conversation_id text, ref_id text, value bigint, created_at timestamptz NOT NULL DEFAULT now())`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS variant text NOT NULL DEFAULT ''`,
  `DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'events' AND column_name = 'variant') THEN ALTER TABLE events ALTER COLUMN variant SET DEFAULT ''; ALTER TABLE events ALTER COLUMN variant DROP NOT NULL; END IF; END $$`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS conversation_id text`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS ref_id text`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS value bigint`,
  `CREATE INDEX IF NOT EXISTS events_tenant_created ON events (tenant_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS message_insights (id bigserial PRIMARY KEY, tenant_id text NOT NULL, conversation_id text NOT NULL, text text NOT NULL, label text NOT NULL, confidence real NOT NULL DEFAULT 0, topic text NOT NULL DEFAULT '', need text NOT NULL DEFAULT '', sentiment text NOT NULL DEFAULT 'neutral', handled_by text NOT NULL, unanswered boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS insights_tenant_created ON message_insights (tenant_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS llm_calls (id bigserial PRIMARY KEY, tenant_id text NOT NULL, conversation_id text NOT NULL, provider text NOT NULL, model text NOT NULL, input_tokens integer NOT NULL DEFAULT 0, output_tokens integer NOT NULL DEFAULT 0, calls integer NOT NULL DEFAULT 0, latency_ms integer NOT NULL DEFAULT 0, outcome text NOT NULL, error text, decision_label text, decision_confidence real, decision_model text, decision_latency_ms integer NOT NULL DEFAULT 0, decision_tokens integer NOT NULL DEFAULT 0, route text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS llm_calls_tenant_created ON llm_calls (tenant_id, created_at)`,

  /* ---- store ---- */
  moveToSchema("products", "store"),
  `CREATE TABLE IF NOT EXISTS store.products (id text PRIMARY KEY, tenant_id text NOT NULL, sku text NOT NULL, name text NOT NULL, category text NOT NULL DEFAULT '', price bigint NOT NULL DEFAULT 0, description text NOT NULL DEFAULT '', url text NOT NULL DEFAULT '', image_url text NOT NULL DEFAULT '', tags jsonb NOT NULL DEFAULT '[]'::jsonb, in_stock boolean NOT NULL DEFAULT true, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_sku ON store.products (tenant_id, sku)`,

  /* ---- tile ---- */
  `CREATE TABLE IF NOT EXISTS tile.tiles (id text PRIMARY KEY, tenant_id text NOT NULL, sku text NOT NULL, name text NOT NULL, width_mm integer NOT NULL, height_mm integer NOT NULL, thickness_mm real NOT NULL, pieces_per_box integer NOT NULL, price_per_m2 integer NOT NULL, finish text NOT NULL, usage jsonb NOT NULL, style text NOT NULL DEFAULT '', color text NOT NULL DEFAULT '', texture_url text NOT NULL, description text NOT NULL DEFAULT '', images jsonb NOT NULL DEFAULT '[]'::jsonb, stock integer NOT NULL DEFAULT 0, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS tiles_tenant_sku ON tile.tiles (tenant_id, sku)`,
  `CREATE TABLE IF NOT EXISTS tile.quotes (id text PRIMARY KEY, tenant_id text NOT NULL, conversation_id text, tile_id text NOT NULL, surfaces jsonb NOT NULL, options jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS quotes_tenant_created ON tile.quotes (tenant_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS tile.settings (tenant_id text PRIMARY KEY, pricing jsonb NOT NULL, ab_visualizer_percent integer NOT NULL DEFAULT 100, updated_at timestamptz NOT NULL DEFAULT now())`,

  // Supabase mở các schema qua PostgREST bằng anon key; bật RLS không kèm policy = chặn truy cập từ anon/authenticated.
  ...PUBLIC_TABLES.map(
    (t) => `ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`,
  ),
  ...["store.products", "tile.tiles", "tile.quotes", "tile.settings"].map(
    (t) => `ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`,
  ),
];
