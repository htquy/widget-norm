/** Sự kiện dùng chung mọi loại bot. Module bot khai báo thêm sự kiện riêng (vd preview_rendered của bot gạch). */
export const EVENT_TYPES = ["widget_open", "message_sent", "product_clicked", "booking_opened", "booking_created", "handoff_requested", "lead_created"] as const;
export type EventType = string;

/** Sự kiện được phép gửi từ trình duyệt (còn lại ghi ở server) */
export const CLIENT_EVENTS = ["widget_open", "product_clicked", "booking_opened"] as const;

export interface FunnelStep {
  type: EventType;
  label: string;
}

export const FUNNEL: FunnelStep[] = [
  { type: "widget_open", label: "Mở chat" },
  { type: "message_sent", label: "Nhắn tin" },
  { type: "product_clicked", label: "Xem sản phẩm" },
  { type: "booking_opened", label: "Mở form đặt lịch" },
  { type: "booking_created", label: "Đặt lịch" },
  { type: "lead_created", label: "Để lại liên hệ" },
];

/** Gán nhóm A/B ổn định theo visitorId (FNV-1a) — module dùng khi cần thử nghiệm tính năng */
export function assignVariant(visitorId: string, percentB: number, a = "control", b = "treatment"): string {
  let h = 2166136261;
  for (let i = 0; i < visitorId.length; i++) h = Math.imul(h ^ visitorId.charCodeAt(i), 16777619);
  return (h >>> 0) % 100 < percentB ? b : a;
}
