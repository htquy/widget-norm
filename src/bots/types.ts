import type { ChatTool, LlmGateway } from "@/application/ports";
import type { WidgetAction } from "@/domain/conversation";
import type { FunnelStep } from "@/domain/events";
import type { BotKind, Tenant } from "@/domain/tenant";

/** Trạng thái một lượt chat mà tool của module được ghi vào */
export interface TurnState {
  /** Id mục trong danh mục của bot → widget hiện thẻ */
  productIds: string[];
  action?: WidgetAction;
  /** Dữ liệu riêng của module kèm câu trả lời (vd quoteId) */
  extras: Record<string, string>;
}

export interface ToolContext {
  tenant: Tenant;
  visitorId: string;
  conversationId: string;
  /** Nhóm A/B của khách (nếu module có thử nghiệm) */
  variant: string;
  turn: TurnState;
}

/** Ngữ cảnh khi module xử lý API công khai riêng (/api/public/[tenant]/x/...) */
export interface PublicApiContext {
  tenant: Tenant;
  path: string[];
  req: Request;
  /** Kiểm tra hội thoại thuộc đúng khách (null nếu không) */
  ownConversation(visitorId: string, conversationId: string | null | undefined): Promise<string | null>;
  /** Ghi lead dùng chung (schema public) */
  captureLead(input: { visitorId: string; conversationId: string | null; name: string; phone: string; note: string; meta: Record<string, string | number> }): Promise<{ id: string }>;
  trackEvent(input: { visitorId: string; type: string; conversationId?: string | null; refId?: string | null; value?: number | null; variant?: string | null }): Promise<void>;
  rateLimit(key: string, limit: number, windowMs: number): boolean;
}

/**
 * Module nghiệp vụ của một loại chatbot. Chat engine chung (jev, chuyển nhân viên, live chat, guard, phân tích)
 * gọi module qua interface này — không join chéo schema, không chứa logic ngành trong engine.
 */
export interface BotModule {
  kind: BotKind;
  /** Tool riêng của ngành (tool đặt lịch & gọi nhân viên do engine cung cấp) */
  tools(ctx: ToolContext): ChatTool[];
  /** Dòng bổ sung cho system prompt: vai trò, mục tiêu, cách tư vấn của ngành */
  promptLines(tenant: Tenant, variant: string): string[];
  /** Số tiền và mã sản phẩm có thật — để guard chống bịa */
  groundingFacts(tenant: Tenant): Promise<{ amounts: number[]; skus: string[] }>;
  /** Tóm tắt danh mục 1 dòng cho tầng quyết định jev */
  shopSummary(tenantId: string): Promise<string>;
  /** Thẻ hiển thị cho các id trong danh mục */
  cards(tenantId: string, ids: string[]): Promise<unknown[]>;
  /** Tên hiển thị của mục danh mục (báo cáo "sản phẩm được quan tâm") */
  namesByIds(tenantId: string, ids: string[]): Promise<Map<string, string>>;
  /** Biến dữ liệu extras của câu trả lời thành dữ liệu cho widget (vd quoteId → báo giá) */
  resolveExtras(tenantId: string, extras: Record<string, string>): Promise<Record<string, unknown>>;
  /** Bot theo luật của ngành — trả lời khi LLM lỗi/hết hạn mức hoặc chưa có API key */
  fallbackLlm: LlmGateway;
  /** Cấu hình công khai riêng cho widget (vd nhóm A/B, danh mục cho trình xem thử) */
  publicConfig(tenant: Tenant, visitorId: string): Promise<Record<string, unknown>>;
  /** Nhóm A/B của khách (mặc định "default") */
  variantFor(tenant: Tenant, visitorId: string): Promise<string>;
  /** Sự kiện trình duyệt được phép gửi thêm */
  clientEvents: readonly string[];
  /** Sự kiện đo "mục được quan tâm" trên dashboard (refId = id mục danh mục) */
  interestEvent: string;
  /** Phễu riêng (thay phễu mặc định trên dashboard) */
  funnel?: FunnelStep[];
  /** API công khai riêng: /api/public/[tenant]/x/<path> */
  handlePublic?(ctx: PublicApiContext): Promise<Response>;
  /** Khởi tạo dữ liệu riêng khi tạo bot mới (vd thông số báo giá mặc định) */
  onCreate(tenantId: string): Promise<void>;
  /** Nạp dữ liệu demo (chỉ shop demo) — trả về id các mục để sinh số liệu mẫu */
  seedDemo(tenantId: string): Promise<string[]>;
}

/** Mục menu quản trị riêng của loại bot */
export interface AdminNavItem {
  href: string;
  label: string;
  /** path SVG (lucide) */
  icon: string;
}
