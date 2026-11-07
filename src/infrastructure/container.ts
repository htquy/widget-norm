import "server-only";
import { composeWithAvi } from "@/bots/avi/compose";
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
import { makeFurnitureCatalog } from "@/bots/furniture/catalog";
import { makeFurnitureModule } from "@/bots/furniture/module";
import { furnitureRepo } from "@/bots/furniture/repository";
import { makeCourseCatalog } from "@/bots/education/catalog";
import { makeEducationModule } from "@/bots/education/module";
import { courseRepo } from "@/bots/education/repository";
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
import { registerDomain } from "./domains";
import { HubLlmGateway } from "@/adapters/llm/hubLlmGateway";
import { HubDecisionGateway } from "@/adapters/llm/hubDecisionGateway";

const list = (v: string | undefined, d: string) =>
  (v?.trim() ? v : d)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export const config = {
  baseUrl: (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  ),
  llmProvider: (process.env.LLM_PROVIDER?.trim().toLowerCase() === "rules"
    ? "rules"
    : process.env.HUB_BASE_URL && process.env.HUB_GATEWAY_KEY
      ? "hub"
      : process.env.OPENROUTER_API_KEY
        ? "openrouter"
        : "rules") as "hub" | "openrouter" | "rules",
  models: {
    simple: list(
      process.env.OPENROUTER_MODEL_SIMPLE,
      "deepseek/deepseek-v4.1-flash,z-ai/glm-5.3-flash",
    ),
    complex: list(
      process.env.OPENROUTER_MODEL_COMPLEX,
      "anthropic/claude-haiku-5.5,z-ai/glm-5.3-flash",
    ),
  },
  decision: {
    provider: (() => {
      const p = process.env.DECISION_PROVIDER?.trim().toLowerCase();
      if (p === "off" || p === "rules") return p;
      if (process.env.HUB_BASE_URL && process.env.HUB_GATEWAY_KEY) return "jev";
      return process.env.OPENROUTER_API_KEY ? "jev" : "rules";
    })() as "jev" | "rules" | "off",
    model: process.env.DECISION_MODEL?.trim() || "typesafe/jev-router",
    fallbackModels: list(
      process.env.DECISION_FALLBACK_MODELS,
      "deepseek/deepseek-v4.1-flash",
    ),
  },
  dataCollection: (process.env.OPENROUTER_DATA_COLLECTION === "allow"
    ? "allow"
    : "deny") as "allow" | "deny",
};

function createLlm(): LlmGateway {
  if (config.llmProvider === "hub")
    return new HubLlmGateway({
      baseUrl: process.env.HUB_BASE_URL!,
      apiKey: process.env.HUB_GATEWAY_KEY!,
      models: config.models,
      provider: process.env.HUB_AI_PROVIDER || "openrouter",
    });
  if (config.llmProvider === "rules") return new RuleBasedLlmGateway();
  const all = [...config.models.simple, ...config.models.complex];
  if (all.some((m) => m.endsWith(":free")))
    console.warn(
      "[llm] Đang dùng model :free — nhà cung cấp có thể lưu nội dung chat. Chỉ test với dữ liệu giả.",
    );
  return new OpenRouterLlmGateway({
    apiKey: process.env.OPENROUTER_API_KEY!,
    models: config.models,
    dataCollection: config.dataCollection,
    appUrl: config.baseUrl,
    appName: "Widget Norm",
  });
}

function createDecision(): DecisionGateway | null {
  if (
    config.decision.provider === "jev" &&
    process.env.HUB_BASE_URL &&
    process.env.HUB_GATEWAY_KEY
  )
    return new HubDecisionGateway({
      baseUrl: process.env.HUB_BASE_URL,
      apiKey: process.env.HUB_GATEWAY_KEY,
      model: config.decision.model,
      provider: process.env.HUB_AI_PROVIDER || "openrouter",
    });
  if (config.decision.provider !== "jev" || !process.env.OPENROUTER_API_KEY)
    return null;
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
  const furnitureItems = furnitureRepo(db);
  const furnitureCatalog = makeFurnitureCatalog({ items: furnitureItems });
  const courses = courseRepo(db);
  const courseCatalog = makeCourseCatalog({ courses });
  const tiles = tileRepos(db);
  const tileCatalog = makeTileCatalog({ tiles: tiles.tiles });
  const quotes = makeQuotes({
    repos: tiles,
    track: (e) => repos.events.record(e),
  });
  const modules: Record<BotKind, BotModule> = {
    store: makeStoreModule({ catalog, products }),
    tile: composeWithAvi(
      makeStoreModule({ catalog, products }),
      makeTileModule({ repos: tiles, catalog: tileCatalog, quotes, files }),
    ),
    education: composeWithAvi(
      makeStoreModule({ catalog, products }),
      makeEducationModule({ catalog: courseCatalog, courses }),
    ),
    furniture: composeWithAvi(
      makeStoreModule({ catalog, products }),
      makeFurnitureModule({ catalog: furnitureCatalog, items: furnitureItems, files }),
    ),
  };
  const moduleOf = (t: Tenant) => modules[t.kind] ?? modules.store;
  const leads = makeLeads({
    leads: repos.leads,
    events: repos.events,
    notifier,
    baseUrl: config.baseUrl,
  });
  const bookings = makeBookings({
    bookings: repos.bookings,
    services: repos.services,
    leads: repos.leads,
    events: repos.events,
    conversations: repos.conversations,
    notifier,
  });
  const support = makeSupport({
    conversations: repos.conversations,
    events: repos.events,
    notifier,
    leads,
    baseUrl: config.baseUrl,
  });
  const decision = config.decision.provider === "off" ? null : createDecision();
  const tenants = makeTenants({
    tenants: repos.tenants,
    accounts: repos.accounts,
    onCreate: (t) => moduleOf(t).onCreate(t.id),
  });
  const hasher = {
    verify: bcrypt.compare,
    hash: (p: string) => bcrypt.hash(p, 10),
  };
  await seedIfEmpty(db, {
    tenants,
    hasher,
    users: repos.users,
    accounts: repos.accounts,
    services: repos.services,
    modules,
  });

  return {
    llmId: llm.id,
    files,
    modules,
    moduleOf,
    tenants,
    auth: makeAuth({
      users: repos.users,
      accounts: repos.accounts,
      hasher,
      tenants,
      registerDomain,
    }),
    services,
    catalog,
    tileCatalog,
    courseCatalog,
    furnitureCatalog,
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
    analytics: makeAnalytics({
      events: repos.events,
      leads: repos.leads,
      bookings: repos.bookings,
      moduleOf,
    }),
  };
}

export type Container = Awaited<ReturnType<typeof build>>;
const g = globalThis as unknown as {
  __normContainer?: Promise<Container>;
  __normContainerVersion?: string;
};

export function app(): Promise<Container> {
  // Next dev preserves globalThis across HMR; discard the pre-AVI composition once on upgrade.
  if (g.__normContainerVersion !== "avi-v2") {
    g.__normContainer = undefined;
    g.__normContainerVersion = "avi-v2";
  }
  g.__normContainer ??= build().catch((e) => {
    g.__normContainer = undefined;
    throw e;
  });
  return g.__normContainer;
}
