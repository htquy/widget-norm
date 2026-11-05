import "server-only";
import bcrypt from "bcryptjs";
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
import { JevDecisionGateway } from "@/adapters/llm/jevDecisionGateway";
import { OpenRouterLlmGateway } from "@/adapters/llm/openRouterLlmGateway";
import { RuleBasedLlmGateway } from "@/adapters/llm/ruleBasedLlmGateway";
import { RuleDecisionGateway } from "@/adapters/llm/ruleDecisionGateway";
import { WebhookNotifier } from "@/adapters/notify/webhookNotifier";
import type { DecisionGateway, LlmGateway } from "@/application/ports";
import { makeAnalytics } from "@/application/use-cases/analytics";
import { makeBookings } from "@/application/use-cases/bookings";
import { makeServices } from "@/application/use-cases/services";
import { makeCatalog } from "@/bots/store/catalog";
import { makeStoreModule } from "@/bots/store/module";
import { productRepo } from "@/bots/store/repository";
import { makeTileCatalog } from "@/bots/tile/catalog";
import { makeTileModule } from "@/bots/tile/module";
import { makeQuotes } from "@/bots/tile/quotes";
import { tileRepos } from "@/bots/tile/repository";
import type { BotModule } from "@/bots/types";
import type { BotKind, Tenant } from "@/domain/tenant";
import { makeChat } from "@/application/use-cases/chat";
import { makeInsights } from "@/application/use-cases/insights";
import { makeLeads } from "@/application/use-cases/leads";
import { makeSupport } from "@/application/use-cases/support";
import { makeAuth, makeTenants } from "@/application/use-cases/tenants";
import { getDb } from "./db/client";
import { seedIfEmpty } from "./db/seed";
import { createStorage } from "./storage";

const list = (v: string | undefined, d: string) => (v?.trim() ? v : d).split(",").map((s) => s.trim()).filter(Boolean);

export const config = {
  baseUrl: (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  llmProvider: (process.env.LLM_PROVIDER?.trim().toLowerCase() === "rules" || !process.env.OPENROUTER_API_KEY ? "rules" : "openrouter") as "openrouter" | "rules",
  models: {
    simple: list(process.env.OPENROUTER_MODEL_SIMPLE, "deepseek/deepseek-v4.1-flash,z-ai/glm-5.3-flash"),
    complex: list(process.env.OPENROUTER_MODEL_COMPLEX, "anthropic/claude-haiku-5.5,z-ai/glm-5.3-flash"),
  },
  decision: {
    provider: (() => {
      const p = process.env.DECISION_PROVIDER?.trim().toLowerCase();
      if (p === "off" || p === "rules") return p;
      return process.env.OPENROUTER_API_KEY ? "jev" : "rules";
    })() as "jev" | "rules" | "off",
    model: process.env.DECISION_MODEL?.trim() || "typesafe/jev-router",
    fallbackModels: list(process.env.DECISION_FALLBACK_MODELS, "deepseek/deepseek-v4.1-flash"),
  },
  dataCollection: (process.env.OPENROUTER_DATA_COLLECTION === "allow" ? "allow" : "deny") as "allow" | "deny",
};

function createLlm(): LlmGateway {
  if (config.llmProvider === "rules") return new RuleBasedLlmGateway();
  const all = [...config.models.simple, ...config.models.complex];
  if (all.some((m) => m.endsWith(":free"))) console.warn("[llm] Đang dùng model :free — nhà cung cấp có thể lưu nội dung chat. Chỉ test với dữ liệu giả.");
  return new OpenRouterLlmGateway({ apiKey: process.env.OPENROUTER_API_KEY!, models: config.models, dataCollection: config.dataCollection, appUrl: config.baseUrl, appName: "Widget Norm" });
}

function createDecision(): DecisionGateway | null {
  if (config.decision.provider !== "jev" || !process.env.OPENROUTER_API_KEY) return null;
  return new JevDecisionGateway({
    apiKey: process.env.OPENROUTER_API_KEY,
    model: config.decision.model,
    fallbackModels: config.decision.fallbackModels,
    dataCollection: config.dataCollection,
    appUrl: config.baseUrl,
    appName: "Widget Norm",
  });
}

async function build() {
  const db = await getDb();
  const repos = {
    accounts: accountRepo(db),
    tenants: tenantRepo(db),
    services: serviceRepo(db),
    bookings: bookingRepo(db),
    leads: leadRepo(db),
    conversations: conversationRepo(db),
    events: eventRepo(db),
    insights: insightRepo(db),
    users: adminUserRepo(db),
    llmCalls: llmCallRepo(db),
  };
  const llm = createLlm();
  const notifier = new WebhookNotifier();
  const files = createStorage();
  const services = makeServices({ services: repos.services });

  /* ---- Module từng loại bot (mỗi module chỉ đọc/ghi schema của mình) ---- */
  const products = productRepo(db);
  const catalog = makeCatalog({ products });
  const tiles = tileRepos(db);
  const tileCatalog = makeTileCatalog({ tiles: tiles.tiles });
  const quotes = makeQuotes({ repos: tiles, track: (e) => repos.events.record(e) });
  const modules: Record<BotKind, BotModule> = {
    store: makeStoreModule({ catalog, products }),
    tile: makeTileModule({ repos: tiles, catalog: tileCatalog, quotes, files }),
  };
  const moduleOf = (t: Tenant) => modules[t.kind] ?? modules.store;
  const leads = makeLeads({ leads: repos.leads, events: repos.events, notifier, baseUrl: config.baseUrl });
  const bookings = makeBookings({ bookings: repos.bookings, services: repos.services, leads: repos.leads, events: repos.events, conversations: repos.conversations, notifier });
  const support = makeSupport({ conversations: repos.conversations, events: repos.events, notifier, leads, baseUrl: config.baseUrl });
  const decision = config.decision.provider === "off" ? null : createDecision();
  const tenants = makeTenants({ tenants: repos.tenants, accounts: repos.accounts, onCreate: (t) => moduleOf(t).onCreate(t.id) });
  const hasher = { verify: bcrypt.compare, hash: (p: string) => bcrypt.hash(p, 10) };
  await seedIfEmpty(db, { tenants, hasher, users: repos.users, accounts: repos.accounts, services: repos.services, modules });

  return {
    llmId: llm.id,
    files,
    modules,
    moduleOf,
    tenants,
    auth: makeAuth({ users: repos.users, accounts: repos.accounts, hasher, tenants }),
    services,
    catalog,
    tileCatalog,
    tileRepos: tiles,
    quotes,
    leads,
    bookings,
    support,
    chat: makeChat({
      conversations: repos.conversations,
      events: repos.events,
      insights: repos.insights,
      llm,
      decision,
      fallbackDecision: new RuleDecisionGateway(),
      modules,
      services,
      bookings,
      support,
      llmCalls: repos.llmCalls,
    }),
    insights: makeInsights({ insights: repos.insights, llm }),
    llmCalls: repos.llmCalls,
    analytics: makeAnalytics({ events: repos.events, leads: repos.leads, bookings: repos.bookings, moduleOf }),
  };
}

export type Container = Awaited<ReturnType<typeof build>>;
const g = globalThis as unknown as { __normContainer?: Promise<Container> };

export function app(): Promise<Container> {
  g.__normContainer ??= build().catch((e) => {
    g.__normContainer = undefined;
    throw e;
  });
  return g.__normContainer;
}
