import { bigint, bigserial, boolean, index, integer, jsonb, pgTable, real, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { TenantSettings } from "@/domain/tenant";
import type { TranscriptEntry } from "@/domain/conversation";

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" }).notNull().defaultNow();

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  settings: jsonb("settings").$type<TenantSettings>().notNull(),
  createdAt: ts("created_at"),
});

export const adminUsers = pgTable("admin_users", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
});

export const products = pgTable(
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
    startAt: timestamp("start_at", { withTimezone: true, mode: "date" }).notNull(),
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
  (t) => [index("conv_tenant_visitor").on(t.tenantId, t.visitorId, t.updatedAt), index("conv_tenant_handoff").on(t.tenantId, t.handoffStatus, t.updatedAt)],
);

export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tenantId: text("tenant_id").notNull(),
    visitorId: text("visitor_id").notNull(),
    type: text("type").notNull(),
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

const TABLES = ["tenants", "admin_users", "products", "services", "bookings", "leads", "conversations", "events", "message_insights", "llm_calls"];

/** DDL tương ứng schema trên — chạy lúc khởi động (idempotent). */
export const DDL = [
  `CREATE TABLE IF NOT EXISTS tenants (id text PRIMARY KEY, slug text NOT NULL UNIQUE, name text NOT NULL, settings jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS admin_users (id text PRIMARY KEY, tenant_id text NOT NULL, email text NOT NULL UNIQUE, password_hash text NOT NULL, name text NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS products (id text PRIMARY KEY, tenant_id text NOT NULL, sku text NOT NULL, name text NOT NULL, category text NOT NULL DEFAULT '', price bigint NOT NULL DEFAULT 0, description text NOT NULL DEFAULT '', url text NOT NULL DEFAULT '', image_url text NOT NULL DEFAULT '', tags jsonb NOT NULL DEFAULT '[]'::jsonb, in_stock boolean NOT NULL DEFAULT true, active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS products_tenant_sku ON products (tenant_id, sku)`,
  `CREATE TABLE IF NOT EXISTS services (id text PRIMARY KEY, tenant_id text NOT NULL, name text NOT NULL, duration_min integer NOT NULL, price bigint NOT NULL DEFAULT 0, description text NOT NULL DEFAULT '', active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS bookings (id text PRIMARY KEY, tenant_id text NOT NULL, service_id text NOT NULL, conversation_id text, name text NOT NULL, phone text NOT NULL, note text NOT NULL DEFAULT '', start_at timestamptz NOT NULL, end_at timestamptz NOT NULL, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS bookings_tenant_start ON bookings (tenant_id, start_at)`,
  `CREATE TABLE IF NOT EXISTS leads (id text PRIMARY KEY, tenant_id text NOT NULL, conversation_id text, name text NOT NULL, phone text NOT NULL, email text NOT NULL DEFAULT '', note text NOT NULL DEFAULT '', source text NOT NULL DEFAULT 'form', status text NOT NULL, won_value bigint, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS leads_tenant_created ON leads (tenant_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS conversations (id text PRIMARY KEY, tenant_id text NOT NULL, visitor_id text NOT NULL, channel text NOT NULL, mode text NOT NULL DEFAULT 'bot', handoff_status text NOT NULL DEFAULT 'none', handoff_reason text, rating integer, history_provider text NOT NULL DEFAULT '', history jsonb NOT NULL, transcript jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS conv_tenant_visitor ON conversations (tenant_id, visitor_id, updated_at)`,
  `CREATE INDEX IF NOT EXISTS conv_tenant_handoff ON conversations (tenant_id, handoff_status, updated_at)`,
  `CREATE TABLE IF NOT EXISTS events (id bigserial PRIMARY KEY, tenant_id text NOT NULL, visitor_id text NOT NULL, type text NOT NULL, conversation_id text, ref_id text, value bigint, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS events_tenant_created ON events (tenant_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS message_insights (id bigserial PRIMARY KEY, tenant_id text NOT NULL, conversation_id text NOT NULL, text text NOT NULL, label text NOT NULL, confidence real NOT NULL DEFAULT 0, topic text NOT NULL DEFAULT '', need text NOT NULL DEFAULT '', sentiment text NOT NULL DEFAULT 'neutral', handled_by text NOT NULL, unanswered boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS insights_tenant_created ON message_insights (tenant_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS llm_calls (id bigserial PRIMARY KEY, tenant_id text NOT NULL, conversation_id text NOT NULL, provider text NOT NULL, model text NOT NULL, input_tokens integer NOT NULL DEFAULT 0, output_tokens integer NOT NULL DEFAULT 0, calls integer NOT NULL DEFAULT 0, latency_ms integer NOT NULL DEFAULT 0, outcome text NOT NULL, error text, decision_label text, decision_confidence real, decision_model text, decision_latency_ms integer NOT NULL DEFAULT 0, decision_tokens integer NOT NULL DEFAULT 0, route text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS llm_calls_tenant_created ON llm_calls (tenant_id, created_at)`,
  // Supabase mở schema public qua PostgREST bằng anon key; bật RLS không kèm policy = chặn truy cập từ anon/authenticated.
  ...TABLES.map((t) => `ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`),
];
