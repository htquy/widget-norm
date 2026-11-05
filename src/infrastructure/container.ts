import "server-only";
import bcrypt from "bcryptjs";
import {
  adminUserRepo,
  bookingRepo,
  conversationRepo,
  eventRepo,
  insightRepo,
  leadRepo,
  llmCallRepo,
  productRepo,
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
import { makeCatalog } from "@/application/use-cases/catalog";
import { makeChat } from "@/application/use-cases/chat";
import { makeInsights } from "@/application/use-cases/insights";
import { makeLeads } from "@/application/use-cases/leads";
import { makeSupport } from "@/application/use-cases/support";
import { makeAuth, makeTenants } from "@/application/use-cases/tenants";
import { getDb } from "./db/client";

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
    tenants: tenantRepo(db),
    products: productRepo(db),
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
  const catalog = makeCatalog({ products: repos.products, services: repos.services });
  const leads = makeLeads({ leads: repos.leads, events: repos.events, notifier, baseUrl: config.baseUrl });
  const bookings = makeBookings({ bookings: repos.bookings, services: repos.services, leads: repos.leads, events: repos.events, conversations: repos.conversations, notifier });
  const support = makeSupport({ conversations: repos.conversations, events: repos.events, notifier, leads, baseUrl: config.baseUrl });
  const decision = config.decision.provider === "off" ? null : createDecision();
  return {
    llmId: llm.id,
    tenants: makeTenants({ tenants: repos.tenants }),
    auth: makeAuth({ users: repos.users, hasher: { verify: bcrypt.compare, hash: (p) => bcrypt.hash(p, 10) } }),
    catalog,
    leads,
    bookings,
    support,
    chat: makeChat({
      conversations: repos.conversations,
      events: repos.events,
      insights: repos.insights,
      llm,
      fallbackLlm: new RuleBasedLlmGateway(),
      decision,
      fallbackDecision: new RuleDecisionGateway(),
      catalog,
      bookings,
      support,
      llmCalls: repos.llmCalls,
    }),
    insights: makeInsights({ insights: repos.insights, llm }),
    llmCalls: repos.llmCalls,
    analytics: makeAnalytics({ events: repos.events, leads: repos.leads, bookings: repos.bookings, products: repos.products }),
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
