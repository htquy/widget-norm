import { BOT_PRICING } from "./bot-pricing";

/** Workspace metadata owning bots. SSO identity/passwords belong to skill-pages; email here is a snapshot, not an authentication key. */
export interface Account {
  id: string;
  name: string;
  email: string;
  plan: PlanId;
  /** Hết hạn dùng thử (null = gói trả phí hoặc không giới hạn) */
  trialEndsAt: Date | null;
  createdAt: Date;
}

export const PLAN_IDS = ["trial", "starter", "pro", "business"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface Plan {
  id: PlanId;
  name: string;
  /** VND / tháng / bot; null = liên hệ */
  priceMonthly: number | null;
  tagline: string;
  /** Số bot tối đa trong tài khoản */
  maxBots: number;
  /** Số tin nhắn bot trả lời mỗi tháng (mỗi bot) */
  messagesPerMonth: number | null;
  features: string[];
  highlight?: boolean;
}

/**
 * Giới hạn tài khoản local/legacy. Giá AVI lấy từ BOT_PRICING; giá theo loại bot và checkout thật
 * dùng bot-pricing + skill-pages. messagesPerMonth hiện là metadata, chưa dùng để chặn tin nhắn.
 */
export const PLANS: Plan[] = [
  {
    id: "trial",
    name: "Dùng thử",
    priceMonthly: 0,
    tagline: "14 ngày, đủ tính năng gói Chuyên nghiệp",
    maxBots: 2,
    messagesPerMonth: 500,
    features: [
      "Mọi loại chatbot",
      "Tầng quyết định jev + LLM",
      "Đặt lịch, chuyển nhân viên",
      "Không cần thẻ thanh toán",
    ],
  },
  {
    id: "starter",
    name: "Cơ bản",
    priceMonthly: BOT_PRICING.store.monthly,
    tagline: "Cửa hàng nhỏ, một website",
    maxBots: 1,
    messagesPerMonth: 2_000,
    features: [
      "1 chatbot",
      "2.000 tin nhắn/tháng",
      "Đặt lịch & thu lead",
      "Tuỳ biến giao diện widget",
      "Báo cáo cơ bản",
    ],
  },
  {
    id: "pro",
    name: "Chuyên nghiệp",
    priceMonthly: BOT_PRICING.store.proMonthly,
    tagline: "Bán hàng nghiêm túc, cần nhân viên hỗ trợ",
    maxBots: 3,
    messagesPerMonth: 10_000,
    features: [
      "3 chatbot",
      "10.000 tin nhắn/tháng/bot",
      "Live chat nhân viên",
      "Phân tích nhu cầu + báo cáo AI",
      "Webhook Zalo/Slack/n8n",
      "Ẩn thương hiệu Widget Norm",
    ],
    highlight: true,
  },
  {
    id: "business",
    name: "Doanh nghiệp",
    priceMonthly: null,
    tagline: "Chuỗi cửa hàng, dữ liệu riêng",
    maxBots: 50,
    messagesPerMonth: null,
    features: [
      "Không giới hạn chatbot",
      "Model AI riêng / không lưu dữ liệu",
      "SSO, phân quyền nhân viên",
      "Hỗ trợ triển khai & SLA",
    ],
  },
];

export const planById = (id: string) =>
  PLANS.find((p) => p.id === id) ?? PLANS[0];

export const TRIAL_DAYS = 14;
