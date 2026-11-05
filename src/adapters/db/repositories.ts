import { and, desc, eq, gt, gte, ilike, inArray, lt, lte, or, sql } from "drizzle-orm";
import type {
  AccountRepository,
  AdminUserRepository,
  BookingRepository,
  ConversationRepository,
  DateRange,
  EventRepository,
  HandledBy,
  InsightRepository,
  LeadRepository,
  LlmCallRepository,
  ServiceRepository,
  TenantRepository,
} from "@/application/ports";
import type { Booking, BookingStatus } from "@/domain/booking";
import type { Conversation, HandoffStatus } from "@/domain/conversation";
import type { DecisionLabel, HandoffReason } from "@/domain/decision";
import type { EventType } from "@/domain/events";
import type { Account, PlanId } from "@/domain/account";
import type { Lead, LeadSource, LeadStatus } from "@/domain/lead";
import { normalizeSettings, type BotKind, type Tenant } from "@/domain/tenant";
import type { DB } from "@/infrastructure/db/client";
import { accounts, adminUsers, bookings, conversations, events, leads, llmCalls, messageInsights, services, tenants } from "@/infrastructure/db/schema";

const toLead = (r: typeof leads.$inferSelect): Lead => ({ ...r, status: r.status as LeadStatus, source: r.source as LeadSource, meta: r.meta ?? {} });
const toConv = (r: typeof conversations.$inferSelect): Conversation => ({
  ...r,
  channel: r.channel as Conversation["channel"],
  mode: r.mode as Conversation["mode"],
  handoffStatus: r.handoffStatus as HandoffStatus,
  handoffReason: r.handoffReason as HandoffReason | null,
});
const toBooking = (r: typeof bookings.$inferSelect): Booking => ({ ...r, status: r.status as BookingStatus });

type TsCol = typeof leads.createdAt | typeof events.createdAt | typeof conversations.updatedAt | typeof messageInsights.createdAt | typeof bookings.startAt;
const inRange = (col: TsCol, range?: DateRange) => (range ? [gte(col, range.from), lte(col, range.to)] : []);
const dayOf = (col: TsCol) => sql<string>`to_char(${col} at time zone 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')`;
const count = () => sql<number>`count(*)`.mapWith(Number);

const toTenant = (r: typeof tenants.$inferSelect): Tenant => ({ ...r, kind: r.kind as BotKind, settings: normalizeSettings(r.settings) });
const toAccount = (r: typeof accounts.$inferSelect): Account => ({ ...r, plan: r.plan as PlanId });

export const accountRepo = (db: DB): AccountRepository => ({
  async create(a) {
    const [r] = await db.insert(accounts).values({ ...a, id: crypto.randomUUID() }).returning();
    return toAccount(r);
  },
  async findById(id) {
    const [r] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1);
    return r ? toAccount(r) : null;
  },
});

export const tenantRepo = (db: DB): TenantRepository => ({
  async findBySlug(slug) {
    const [r] = await db.select().from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return r ? toTenant(r) : null;
  },
  async findById(id) {
    const [r] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return r ? toTenant(r) : null;
  },
  async listByAccount(accountId) {
    return (await db.select().from(tenants).where(eq(tenants.accountId, accountId)).orderBy(tenants.createdAt)).map(toTenant);
  },
  async create(t) {
    const [r] = await db.insert(tenants).values({ ...t, id: crypto.randomUUID() }).returning();
    return toTenant(r);
  },
  async slugExists(slug) {
    const [r] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.slug, slug)).limit(1);
    return !!r;
  },
  async updateSettings(id, settings) {
    await db.update(tenants).set({ settings, name: settings.shopName }).where(eq(tenants.id, id));
  },
  async countByKind() {
    const rows = await db.select({ kind: tenants.kind, n: count() }).from(tenants).where(eq(tenants.status, "active")).groupBy(tenants.kind);
    return Object.fromEntries(rows.map((r) => [r.kind, r.n]));
  },
});

export const serviceRepo = (db: DB): ServiceRepository => ({
  async list(tenantId, activeOnly) {
    return db
      .select()
      .from(services)
      .where(and(eq(services.tenantId, tenantId), ...(activeOnly ? [eq(services.active, true)] : [])))
      .orderBy(services.name);
  },
  async findById(tenantId, id) {
    const [r] = await db.select().from(services).where(and(eq(services.tenantId, tenantId), eq(services.id, id))).limit(1);
    return r ?? null;
  },
  async create(s) {
    const [r] = await db.insert(services).values({ ...s, id: crypto.randomUUID() }).returning();
    return r;
  },
  async update(tenantId, id, patch) {
    await db.update(services).set(patch).where(and(eq(services.tenantId, tenantId), eq(services.id, id)));
  },
  async delete(tenantId, id) {
    await db.delete(services).where(and(eq(services.tenantId, tenantId), eq(services.id, id)));
  },
});

export const bookingRepo = (db: DB): BookingRepository => ({
  async create(b) {
    const [r] = await db.insert(bookings).values({ ...b, id: crypto.randomUUID() }).returning();
    return toBooking(r);
  },
  async findById(tenantId, id) {
    const [r] = await db.select().from(bookings).where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, id))).limit(1);
    return r ? toBooking(r) : null;
  },
  async list(tenantId, f) {
    const conds = [eq(bookings.tenantId, tenantId), ...inRange(bookings.startAt, f.range)];
    if (f.status) conds.push(eq(bookings.status, f.status));
    return (await db.select().from(bookings).where(and(...conds)).orderBy(bookings.startAt)).map(toBooking);
  },
  async overlapping(tenantId, from, to) {
    return (await db.select().from(bookings).where(and(eq(bookings.tenantId, tenantId), lt(bookings.startAt, to), gt(bookings.endAt, from)))).map(toBooking);
  },
  async updateStatus(tenantId, id, status) {
    await db.update(bookings).set({ status }).where(and(eq(bookings.tenantId, tenantId), eq(bookings.id, id)));
  },
});

export const leadRepo = (db: DB): LeadRepository => ({
  async create(l) {
    const [r] = await db.insert(leads).values({ ...l, id: crypto.randomUUID() }).returning();
    return toLead(r);
  },
  async list(tenantId, f = {}) {
    const conds = [eq(leads.tenantId, tenantId), ...inRange(leads.createdAt, f.range)];
    if (f.status) conds.push(eq(leads.status, f.status));
    if (f.source) conds.push(eq(leads.source, f.source));
    if (f.search) {
      const q = `%${f.search}%`;
      conds.push(or(ilike(leads.name, q), ilike(leads.phone, q), ilike(leads.note, q))!);
    }
    return (await db.select().from(leads).where(and(...conds)).orderBy(desc(leads.createdAt))).map(toLead);
  },
  async findById(tenantId, id) {
    const [r] = await db.select().from(leads).where(and(eq(leads.tenantId, tenantId), eq(leads.id, id))).limit(1);
    return r ? toLead(r) : null;
  },
  async update(tenantId, id, patch) {
    await db.update(leads).set({ ...patch, updatedAt: new Date() }).where(and(eq(leads.tenantId, tenantId), eq(leads.id, id)));
  },
});

const CONVERSATION_IDLE_MS = 24 * 3600_000;

export const conversationRepo = (db: DB): ConversationRepository => {
  const latest = async (tenantId: string, visitorId: string, channel: string) => {
    const [r] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.tenantId, tenantId), eq(conversations.visitorId, visitorId), eq(conversations.channel, channel), gte(conversations.updatedAt, new Date(Date.now() - CONVERSATION_IDLE_MS))))
      .orderBy(desc(conversations.updatedAt))
      .limit(1);
    return r ? toConv(r) : null;
  };
  return {
    findLatest: latest,
    async findOrCreate(tenantId, visitorId, channel) {
      const found = await latest(tenantId, visitorId, channel);
      if (found) return found;
      const [created] = await db.insert(conversations).values({ id: crypto.randomUUID(), tenantId, visitorId, channel, history: [], transcript: [] }).returning();
      return toConv(created);
    },
    async findById(tenantId, id) {
      const [r] = await db.select().from(conversations).where(and(eq(conversations.tenantId, tenantId), eq(conversations.id, id))).limit(1);
      return r ? toConv(r) : null;
    },
    async save(c) {
      await db
        .update(conversations)
        .set({ history: c.history, transcript: c.transcript, historyProvider: c.historyProvider, mode: c.mode, handoffStatus: c.handoffStatus, handoffReason: c.handoffReason, rating: c.rating, updatedAt: c.updatedAt })
        .where(and(eq(conversations.tenantId, c.tenantId), eq(conversations.id, c.id)));
    },
    async list(tenantId, { limit, offset, range, handoff, search }) {
      const conds = [eq(conversations.tenantId, tenantId), sql`jsonb_array_length(${conversations.transcript}) > 0`, ...inRange(conversations.updatedAt, range)];
      if (handoff) conds.push(eq(conversations.handoffStatus, handoff));
      if (search) conds.push(sql`${conversations.transcript}::text ilike ${`%${search}%`}`);
      const rows = await db
        .select({
          id: conversations.id,
          visitorId: conversations.visitorId,
          channel: conversations.channel,
          mode: conversations.mode,
          handoffStatus: conversations.handoffStatus,
          handoffReason: conversations.handoffReason,
          rating: conversations.rating,
          transcript: conversations.transcript,
          updatedAt: conversations.updatedAt,
          leadCount: sql<number>`(select count(*) from leads l where l.conversation_id = ${conversations.id})`.mapWith(Number),
        })
        .from(conversations)
        .where(and(...conds))
        .orderBy(desc(conversations.updatedAt))
        .limit(limit)
        .offset(offset);
      return rows.map((r) => {
        const last = [...r.transcript].reverse().find((e) => e.role !== "system");
        return {
          id: r.id,
          visitorId: r.visitorId,
          channel: r.channel as Conversation["channel"],
          mode: r.mode as Conversation["mode"],
          handoffStatus: r.handoffStatus as HandoffStatus,
          handoffReason: r.handoffReason as HandoffReason | null,
          rating: r.rating,
          messageCount: r.transcript.filter((e) => e.role === "user").length,
          lastMessage: last?.text ?? "",
          lastRole: last?.role ?? "",
          hasLead: r.leadCount > 0,
          updatedAt: r.updatedAt,
        };
      });
    },
    async countByHandoff(tenantId) {
      const rows = await db.select({ s: conversations.handoffStatus, n: count() }).from(conversations).where(eq(conversations.tenantId, tenantId)).groupBy(conversations.handoffStatus);
      const out: Record<HandoffStatus, number> = { none: 0, open: 0, resolved: 0 };
      for (const r of rows) out[r.s as HandoffStatus] = r.n;
      return out;
    },
    async ratingStats(tenantId, range) {
      const rows = await db
        .select({ rating: conversations.rating, n: count() })
        .from(conversations)
        .where(and(eq(conversations.tenantId, tenantId), sql`${conversations.rating} is not null`, ...inRange(conversations.updatedAt, range)))
        .groupBy(conversations.rating);
      const distribution = [0, 0, 0, 0, 0];
      let sum = 0;
      let rated = 0;
      for (const r of rows) {
        distribution[(r.rating ?? 1) - 1] = r.n;
        sum += (r.rating ?? 0) * r.n;
        rated += r.n;
      }
      return { rated, avg: rated ? sum / rated : 0, distribution };
    },
  };
};

export const eventRepo = (db: DB): EventRepository => ({
  async record(e) {
    await db.insert(events).values({ tenantId: e.tenantId, visitorId: e.visitorId, type: e.type, variant: e.variant ?? "", conversationId: e.conversationId ?? null, refId: e.refId ?? null, value: e.value ?? null });
  },
  async visitorsByType(tenantId, range) {
    const rows = await db
      .select({ type: events.type, visitors: sql<number>`count(distinct ${events.visitorId})`.mapWith(Number) })
      .from(events)
      .where(and(eq(events.tenantId, tenantId), ...inRange(events.createdAt, range)))
      .groupBy(events.type);
    return rows.map((r) => ({ ...r, type: r.type as EventType }));
  },
  async daily(tenantId, range) {
    const day = dayOf(events.createdAt);
    const rows = await db
      .select({ day, type: events.type, visitors: sql<number>`count(distinct ${events.visitorId})`.mapWith(Number) })
      .from(events)
      .where(and(eq(events.tenantId, tenantId), ...inRange(events.createdAt, range)))
      .groupBy(day, events.type);
    return rows.map((r) => ({ ...r, type: r.type as EventType }));
  },
  async visitorsByVariant(tenantId, range) {
    return db
      .select({ type: events.type, variant: events.variant, visitors: sql<number>`count(distinct ${events.visitorId})`.mapWith(Number) })
      .from(events)
      .where(and(eq(events.tenantId, tenantId), ...inRange(events.createdAt, range)))
      .groupBy(events.type, events.variant);
  },
  async topRefs(tenantId, type, range, limit) {
    const visitors = sql<number>`count(distinct ${events.visitorId})`.mapWith(Number);
    const rows = await db
      .select({ refId: events.refId, visitors })
      .from(events)
      .where(and(eq(events.tenantId, tenantId), eq(events.type, type), sql`${events.refId} is not null`, ...inRange(events.createdAt, range)))
      .groupBy(events.refId)
      .orderBy(desc(visitors))
      .limit(limit);
    return rows.map((r) => ({ refId: r.refId!, visitors: r.visitors }));
  },
});

export const insightRepo = (db: DB): InsightRepository => {
  const where = (tenantId: string, range: DateRange) => and(eq(messageInsights.tenantId, tenantId), ...inRange(messageInsights.createdAt, range));
  return {
    async record(i) {
      await db.insert(messageInsights).values({ ...i, text: i.text.slice(0, 1000), topic: i.topic.slice(0, 80), need: i.need.slice(0, 300) });
    },
    async byLabel(tenantId, range) {
      const rows = await db.select({ label: messageInsights.label, count: count() }).from(messageInsights).where(where(tenantId, range)).groupBy(messageInsights.label).orderBy(desc(count()));
      return rows.map((r) => ({ label: r.label as DecisionLabel, count: r.count }));
    },
    async topTopics(tenantId, range, limit) {
      return db
        .select({
          topic: messageInsights.topic,
          count: count(),
          unanswered: sql<number>`count(*) filter (where ${messageInsights.unanswered})`.mapWith(Number),
          negative: sql<number>`count(*) filter (where ${messageInsights.sentiment} = 'negative')`.mapWith(Number),
        })
        .from(messageInsights)
        .where(and(where(tenantId, range), sql`${messageInsights.label} not in ('greeting','thanks_bye','abuse','injection')`))
        .groupBy(messageInsights.topic)
        .orderBy(desc(count()))
        .limit(limit);
    },
    async sentiment(tenantId, range) {
      return db.select({ sentiment: messageInsights.sentiment, count: count() }).from(messageInsights).where(where(tenantId, range)).groupBy(messageInsights.sentiment);
    },
    async handledBy(tenantId, range) {
      const rows = await db.select({ handledBy: messageInsights.handledBy, count: count() }).from(messageInsights).where(where(tenantId, range)).groupBy(messageInsights.handledBy).orderBy(desc(count()));
      return rows.map((r) => ({ handledBy: r.handledBy as HandledBy, count: r.count }));
    },
    async daily(tenantId, range) {
      const day = dayOf(messageInsights.createdAt);
      return db
        .select({ day, total: count(), unanswered: sql<number>`count(*) filter (where ${messageInsights.unanswered})`.mapWith(Number) })
        .from(messageInsights)
        .where(where(tenantId, range))
        .groupBy(day)
        .orderBy(day);
    },
    async unanswered(tenantId, range, limit) {
      const rows = await db
        .select({ text: messageInsights.text, topic: messageInsights.topic, at: messageInsights.createdAt, conversationId: messageInsights.conversationId })
        .from(messageInsights)
        .where(and(where(tenantId, range), eq(messageInsights.unanswered, true)))
        .orderBy(desc(messageInsights.createdAt))
        .limit(limit);
      return rows;
    },
    async recentNeeds(tenantId, range, limit) {
      const rows = await db
        .select({ need: messageInsights.need, topic: messageInsights.topic, label: messageInsights.label })
        .from(messageInsights)
        .where(and(where(tenantId, range), sql`${messageInsights.label} not in ('greeting','thanks_bye','abuse','injection','off_topic')`))
        .orderBy(desc(messageInsights.createdAt))
        .limit(limit);
      return rows.map((r) => ({ ...r, label: r.label as DecisionLabel }));
    },
  };
};

export const adminUserRepo = (db: DB): AdminUserRepository => ({
  async findByEmail(email) {
    const [r] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
    return r ?? null;
  },
  async create(u) {
    const [r] = await db.insert(adminUsers).values({ ...u, id: crypto.randomUUID() }).returning();
    return r;
  },
});

export const llmCallRepo = (db: DB): LlmCallRepository => ({
  async record(r) {
    await db.insert(llmCalls).values({ ...r, error: r.error ?? null });
  },
  async summary(tenantId, range) {
    const where = and(eq(llmCalls.tenantId, tenantId), gte(llmCalls.createdAt, range.from), lte(llmCalls.createdAt, range.to));
    const [t] = await db
      .select({
        turns: count(),
        llmTurns: sql<number>`count(*) filter (where ${llmCalls.outcome} <> 'skipped')`.mapWith(Number),
        calls: sql<number>`coalesce(sum(${llmCalls.calls}), 0)`.mapWith(Number),
        inputTokens: sql<number>`coalesce(sum(${llmCalls.inputTokens}), 0)`.mapWith(Number),
        outputTokens: sql<number>`coalesce(sum(${llmCalls.outputTokens}), 0)`.mapWith(Number),
        decisionTokens: sql<number>`coalesce(sum(${llmCalls.decisionTokens}), 0)`.mapWith(Number),
        fallbacks: sql<number>`count(*) filter (where ${llmCalls.outcome} = 'fallback')`.mapWith(Number),
        guardRetries: sql<number>`count(*) filter (where ${llmCalls.outcome} = 'guard_retry')`.mapWith(Number),
        guardBlocked: sql<number>`count(*) filter (where ${llmCalls.outcome} = 'guard_blocked')`.mapWith(Number),
        avgLatencyMs: sql<number>`coalesce(avg(${llmCalls.latencyMs}) filter (where ${llmCalls.outcome} <> 'skipped'), 0)`.mapWith(Number),
        avgDecisionLatencyMs: sql<number>`coalesce(avg(${llmCalls.decisionLatencyMs}), 0)`.mapWith(Number),
      })
      .from(llmCalls)
      .where(where);
    const routeKey = sql<string>`split_part(${llmCalls.route}, ':', 1)`;
    const byRoute = await db.select({ route: routeKey, turns: count() }).from(llmCalls).where(where).groupBy(routeKey).orderBy(desc(count()));
    const byModel = await db
      .select({
        model: llmCalls.model,
        turns: count(),
        inputTokens: sql<number>`coalesce(sum(${llmCalls.inputTokens}), 0)`.mapWith(Number),
        outputTokens: sql<number>`coalesce(sum(${llmCalls.outputTokens}), 0)`.mapWith(Number),
      })
      .from(llmCalls)
      .where(and(where, sql`${llmCalls.outcome} <> 'skipped'`))
      .groupBy(llmCalls.model)
      .orderBy(desc(count()));
    return { ...t, avgLatencyMs: Math.round(t.avgLatencyMs), avgDecisionLatencyMs: Math.round(t.avgDecisionLatencyMs), byRoute, byModel };
  },
});
