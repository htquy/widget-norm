export const EVENT_TYPES = [
  "widget_open",
  "message_sent",
  "product_clicked",
  "booking_opened",
  "booking_created",
  "handoff_requested",
  "lead_created",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Sự kiện được phép gửi từ trình duyệt (còn lại ghi ở server) */
export const CLIENT_EVENTS = ["widget_open", "product_clicked", "booking_opened"] as const;

export const FUNNEL: { type: EventType; label: string }[] = [
  { type: "widget_open", label: "Mở chat" },
  { type: "message_sent", label: "Nhắn tin" },
  { type: "product_clicked", label: "Xem sản phẩm" },
  { type: "booking_opened", label: "Mở form đặt lịch" },
  { type: "booking_created", label: "Đặt lịch" },
  { type: "lead_created", label: "Để lại liên hệ" },
];
