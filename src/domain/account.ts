/** Tài khoản khách hàng của nền tảng — sở hữu một hoặc nhiều bot (tenant). */
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
 * Bảng giá tham khảo — chỉnh tại đây. Thanh toán chưa tích hợp: nút "Bắt đầu" dẫn tới đăng ký dùng thử,
 * nâng cấp qua liên hệ (hoặc nối hub thanh toán skill-pages sau).
 */
export const PLANS: Plan[] = [
  {
    id: "trial",
    name: "Dùng thử",
    priceMonthly: 0,
    tagline: "14 ngày, đủ tính năng gói Chuyên nghiệp",
    maxBots: 2,
    messagesPerMonth: 500,
    features: ["Mọi loại chatbot", "Tầng quyết định jev + LLM", "Đặt lịch, chuyển nhân viên", "Không cần thẻ thanh toán"],
  },
  {
    id: "starter",
    name: "Cơ bản",
    priceMonthly: 299_000,
    tagline: "Cửa hàng nhỏ, một website",
    maxBots: 1,
    messagesPerMonth: 2_000,
    features: ["1 chatbot", "2.000 tin nhắn/tháng", "Đặt lịch & thu lead", "Tuỳ biến giao diện widget", "Báo cáo cơ bản"],
  },
  {
    id: "pro",
    name: "Chuyên nghiệp",
    priceMonthly: 699_000,
    tagline: "Bán hàng nghiêm túc, cần nhân viên hỗ trợ",
    maxBots: 3,
    messagesPerMonth: 10_000,
    features: ["3 chatbot", "10.000 tin nhắn/tháng/bot", "Live chat nhân viên", "Phân tích nhu cầu + báo cáo AI", "Webhook Zalo/Slack/n8n", "Ẩn thương hiệu Widget Norm"],
    highlight: true,
  },
  {
    id: "business",
    name: "Doanh nghiệp",
    priceMonthly: null,
    tagline: "Chuỗi cửa hàng, dữ liệu riêng",
    maxBots: 50,
    messagesPerMonth: null,
    features: ["Không giới hạn chatbot", "Model AI riêng / không lưu dữ liệu", "SSO, phân quyền nhân viên", "Hỗ trợ triển khai & SLA"],
  },
];

export const planById = (id: string) => PLANS.find((p) => p.id === id) ?? PLANS[0];

export const TRIAL_DAYS = 14;
