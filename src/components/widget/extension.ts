"use client";

import type { ReactNode } from "react";
import type { PublicConfig } from "./api";

/** Những gì module bot được dùng từ khung chat chung */
export interface ExtHelpers {
  tenant: string;
  visitorId: string;
  conversationId: string | null;
  config: PublicConfig;
  send(text: string): void;
  openPanel(name: string, data?: unknown): void;
  closePanel(): void;
  /** Thêm tin nhắn của trợ lý ngay trên máy khách (kèm dữ liệu module, vd báo giá vừa lập) */
  pushLocal(text: string, extras?: Record<string, unknown>): void;
}

/**
 * Phần mở rộng widget của một loại bot: thẻ danh mục riêng, dữ liệu kèm câu trả lời (vd báo giá),
 * nút nhanh và panel riêng (vd trình xem thử gạch toàn màn hình).
 */
export interface WidgetExtension {
  renderCards?(items: unknown[], h: ExtHelpers): ReactNode;
  renderExtras?(extras: Record<string, unknown>, h: ExtHelpers): ReactNode;
  quickActions?(h: ExtHelpers): ReactNode;
  renderPanel?(name: string, data: unknown, h: ExtHelpers): ReactNode;
  /** Panel chiếm toàn bộ khung chat (không phải dạng trượt lên) */
  fullScreenPanels?: string[];
}
