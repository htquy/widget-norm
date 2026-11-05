import type { HandoffReason } from "./decision";

export type Channel = "web" | "zalo" | "messenger";

/** Hành động kèm theo câu trả lời — widget hiện form/thẻ tương ứng */
export type WidgetAction =
  | { type: "booking"; serviceId?: string }
  | { type: "handoff"; reason: HandoffReason }
  | { type: "lead" };

export interface TranscriptEntry {
  /** Định danh ổn định để widget hỏi tin mới (poll) và chấm điểm từng câu trả lời */
  id: string;
  /** user = khách, assistant = bot, agent = nhân viên trả lời trực tiếp, system = thông báo */
  role: "user" | "assistant" | "agent" | "system";
  text: string;
  at: string;
  productIds?: string[];
  action?: WidgetAction;
  agentName?: string;
  /** Khách đánh giá câu trả lời này: 1 = hữu ích, -1 = chưa tốt */
  feedback?: 1 | -1;
  /** Thông tin nội bộ (chỉ admin thấy): nhãn jev, tuyến xử lý, có giải quyết được không */
  meta?: EntryMeta;
  /** Ghi chú hệ thống chỉ hiện ở trang quản trị, không gửi cho widget */
  internal?: boolean;
}

export interface EntryMeta {
  label?: string;
  confidence?: number;
  sentiment?: "positive" | "neutral" | "negative";
  route?: string;
  model?: string;
  unresolved?: boolean;
}

/** Bỏ phần nội bộ trước khi gửi cho widget */
export const publicEntry = ({ meta: _meta, internal: _internal, ...e }: TranscriptEntry): Omit<TranscriptEntry, "meta" | "internal"> => e;

/** Các tin khách được thấy trong widget */
export const visibleToCustomer = (e: TranscriptEntry) => !e.internal;

export type ConversationMode = "bot" | "human";
export type HandoffStatus = "none" | "open" | "resolved";

export interface Conversation {
  id: string;
  tenantId: string;
  visitorId: string;
  channel: Channel;
  /** bot = bot trả lời; human = nhân viên đã nhận cuộc chat, bot tạm dừng */
  mode: ConversationMode;
  handoffStatus: HandoffStatus;
  handoffReason: HandoffReason | null;
  /** Đánh giá chung 1–5 sao khi kết thúc */
  rating: number | null;
  /** Gateway đã tạo history (history của gateway khác không dùng lại được) */
  historyProvider: string;
  /** Lịch sử định dạng LLM — chỉ nối thêm, không sửa */
  history: unknown[];
  transcript: TranscriptEntry[];
  createdAt: Date;
  updatedAt: Date;
}

export const newEntry = (e: Omit<TranscriptEntry, "id" | "at"> & { at?: string }): TranscriptEntry => ({
  id: crypto.randomUUID(),
  at: e.at ?? new Date().toISOString(),
  ...e,
});
