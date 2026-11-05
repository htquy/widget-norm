import type { Booking, BookingStatus, Service } from "@/domain/booking";
import type { Channel, Conversation, HandoffStatus } from "@/domain/conversation";
import type { Decision, DecisionLabel, HandoffReason } from "@/domain/decision";
import type { EventType } from "@/domain/events";
import type { Lead, LeadSource, LeadStatus } from "@/domain/lead";
import type { Product } from "@/domain/product";
import type { Tenant, TenantSettings } from "@/domain/tenant";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface TenantRepository {
  findBySlug(slug: string): Promise<Tenant | null>;
  findById(id: string): Promise<Tenant | null>;
  updateSettings(id: string, settings: TenantSettings): Promise<void>;
}

/* ---------- Danh mục ---------- */

export type NewProduct = Omit<Product, "id" | "createdAt">;

export interface ProductRepository {
  list(tenantId: string, filter?: { activeOnly?: boolean; search?: string; category?: string }): Promise<Product[]>;
  findById(tenantId: string, id: string): Promise<Product | null>;
  findManyByIds(tenantId: string, ids: string[]): Promise<Product[]>;
  create(p: NewProduct): Promise<Product>;
  update(tenantId: string, id: string, patch: Partial<NewProduct>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
  upsertBySku(p: NewProduct): Promise<"created" | "updated">;
}

export type NewService = Omit<Service, "id" | "createdAt">;

export interface ServiceRepository {
  list(tenantId: string, activeOnly?: boolean): Promise<Service[]>;
  findById(tenantId: string, id: string): Promise<Service | null>;
  create(s: NewService): Promise<Service>;
  update(tenantId: string, id: string, patch: Partial<NewService>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface BookingRepository {
  create(b: Omit<Booking, "id" | "createdAt">): Promise<Booking>;
  findById(tenantId: string, id: string): Promise<Booking | null>;
  list(tenantId: string, filter: { range?: DateRange; status?: BookingStatus }): Promise<Booking[]>;
  /** Lịch chồng lấn khoảng [from, to) — dùng tính chỗ trống */
  overlapping(tenantId: string, from: Date, to: Date): Promise<Booking[]>;
  updateStatus(tenantId: string, id: string, status: BookingStatus): Promise<void>;
}

/* ---------- Khách hàng ---------- */

export interface LeadFilter {
  status?: LeadStatus;
  source?: LeadSource;
  search?: string;
  range?: DateRange;
}

export interface LeadRepository {
  create(lead: Omit<Lead, "id" | "createdAt" | "updatedAt">): Promise<Lead>;
  list(tenantId: string, filter?: LeadFilter): Promise<Lead[]>;
  findById(tenantId: string, id: string): Promise<Lead | null>;
  update(tenantId: string, id: string, patch: Partial<Pick<Lead, "status" | "note" | "wonValue" | "name">>): Promise<void>;
}

export interface ConversationSummary {
  id: string;
  visitorId: string;
  channel: Channel;
  mode: Conversation["mode"];
  handoffStatus: HandoffStatus;
  handoffReason: HandoffReason | null;
  rating: number | null;
  messageCount: number;
  lastMessage: string;
  lastRole: string;
  hasLead: boolean;
  updatedAt: Date;
}

export interface ConversationRepository {
  findOrCreate(tenantId: string, visitorId: string, channel: Channel): Promise<Conversation>;
  findById(tenantId: string, id: string): Promise<Conversation | null>;
  /** Hội thoại đang mở gần nhất của khách (không tạo mới) */
  findLatest(tenantId: string, visitorId: string, channel: Channel): Promise<Conversation | null>;
  save(conv: Conversation): Promise<void>;
  list(tenantId: string, opts: { limit: number; offset: number; range?: DateRange; handoff?: HandoffStatus; search?: string }): Promise<ConversationSummary[]>;
  countByHandoff(tenantId: string): Promise<Record<HandoffStatus, number>>;
  ratingStats(tenantId: string, range: DateRange): Promise<{ rated: number; avg: number; distribution: number[] }>;
}

/* ---------- Đo lường ---------- */

export interface AnalyticsEvent {
  tenantId: string;
  visitorId: string;
  type: EventType;
  conversationId?: string | null;
  refId?: string | null;
  value?: number | null;
}

export interface EventRepository {
  record(e: AnalyticsEvent): Promise<void>;
  visitorsByType(tenantId: string, range: DateRange): Promise<{ type: EventType; visitors: number }[]>;
  daily(tenantId: string, range: DateRange): Promise<{ day: string; type: EventType; visitors: number }[]>;
  topRefs(tenantId: string, type: EventType, range: DateRange, limit: number): Promise<{ refId: string; visitors: number }[]>;
}

/** Cách lượt trả lời được xử lý — để đo tỉ lệ không cần gọi LLM */
export type HandledBy = "template" | "llm_simple" | "llm_complex" | "handoff" | "fallback_rules" | "human";

/** Phân tích từng câu hỏi của khách — nguồn cho báo cáo nhu cầu */
export interface MessageInsight {
  tenantId: string;
  conversationId: string;
  text: string;
  label: DecisionLabel;
  confidence: number;
  topic: string;
  need: string;
  sentiment: Decision["sentiment"];
  handledBy: HandledBy;
  /** Bot không trả lời được (đề nghị liên hệ / không có thông tin / guard chặn) */
  unanswered: boolean;
}

export interface InsightRepository {
  record(i: MessageInsight): Promise<void>;
  byLabel(tenantId: string, range: DateRange): Promise<{ label: DecisionLabel; count: number }[]>;
  topTopics(tenantId: string, range: DateRange, limit: number): Promise<{ topic: string; count: number; unanswered: number; negative: number }[]>;
  sentiment(tenantId: string, range: DateRange): Promise<{ sentiment: string; count: number }[]>;
  handledBy(tenantId: string, range: DateRange): Promise<{ handledBy: HandledBy; count: number }[]>;
  daily(tenantId: string, range: DateRange): Promise<{ day: string; total: number; unanswered: number }[]>;
  /** Câu khách hỏi mà bot chưa trả lời được — gợi ý bổ sung kiến thức */
  unanswered(tenantId: string, range: DateRange, limit: number): Promise<{ text: string; topic: string; at: Date; conversationId: string }[]>;
  recentNeeds(tenantId: string, range: DateRange, limit: number): Promise<{ need: string; topic: string; label: DecisionLabel }[]>;
}

export interface FileStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<string>;
  get(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
}

export interface Notifier {
  notify(tenant: Tenant, kind: "lead" | "booking" | "handoff", text: string, data: Record<string, unknown>): Promise<void>;
}

export interface AdminUser {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  name: string;
}

export interface AdminUserRepository {
  findByEmail(email: string): Promise<AdminUser | null>;
}

export interface PasswordHasher {
  verify(password: string, hash: string): Promise<boolean>;
  hash(password: string): Promise<string>;
}

/* ---------- LLM ---------- */

export interface ChatTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  run(input: unknown): Promise<unknown>;
}

export interface LlmUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
}

export interface LlmTurnResult {
  text: string;
  history: unknown[];
  usage?: LlmUsage;
}

export type LlmTier = "simple" | "complex";

export interface LlmGateway {
  /** Định danh định dạng history ("openrouter", "rules") */
  readonly id: string;
  respond(input: { system: string; history: unknown[]; user: { text: string }; tools: ChatTool[]; tier: LlmTier }): Promise<LlmTurnResult>;
  /** Một lượt hỏi–đáp không tool (tóm tắt báo cáo). Không hỗ trợ → undefined */
  complete?(input: { system: string; user: string; tier: LlmTier; maxTokens?: number }): Promise<{ text: string; usage: LlmUsage }>;
  /** Model đang dùng cho từng tầng (hiển thị ở admin) */
  describe(): Record<LlmTier, string>;
}

/** Tầng quyết định (jev) — phân loại tin nhắn trước khi gọi LLM chính */
export interface DecisionGateway {
  readonly id: string;
  readonly model: string;
  classify(input: { text: string; recent: { role: string; text: string }[]; shop: string }): Promise<Decision & { usage?: LlmUsage }>;
}

/** LLM tạm thời không dùng được → use case hạ cấp sang bot theo luật. */
export class LlmUnavailableError extends Error {
  constructor(
    readonly provider: string,
    readonly reason: "rate_limited" | "overloaded" | "timeout" | "network" | "auth" | "payment" | "bad_response",
    message: string,
  ) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

export interface LlmCallRecord {
  tenantId: string;
  conversationId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  calls: number;
  latencyMs: number;
  outcome: "ok" | "fallback" | "guard_retry" | "guard_blocked" | "skipped";
  error?: string | null;
  /** Kết quả tầng jev */
  decisionLabel: DecisionLabel | null;
  decisionConfidence: number | null;
  decisionModel: string | null;
  decisionLatencyMs: number;
  decisionTokens: number;
  route: string;
}

export interface LlmCallSummary {
  turns: number;
  llmTurns: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  decisionTokens: number;
  fallbacks: number;
  guardRetries: number;
  guardBlocked: number;
  avgLatencyMs: number;
  avgDecisionLatencyMs: number;
  byRoute: { route: string; turns: number }[];
  byModel: { model: string; turns: number; inputTokens: number; outputTokens: number }[];
}

export interface LlmCallRepository {
  record(r: LlmCallRecord): Promise<void>;
  summary(tenantId: string, range: DateRange): Promise<LlmCallSummary>;
}
