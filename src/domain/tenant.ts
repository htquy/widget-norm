import { defaultBookingSettings, defaultHours, sanitizeHours, type BookingSettings, type WeeklyHours } from "./booking";
import { defaultTheme, sanitizeTheme, type WidgetTheme } from "./theme";

export interface HandoffSettings {
  /** Bật gợi ý liên hệ nhân viên khi bot gặp câu khó */
  enabled: boolean;
  /** Link Zalo (https://zalo.me/...) — trống = ẩn */
  zaloUrl: string;
  /** Link Messenger (https://m.me/...) — trống = ẩn */
  messengerUrl: string;
  /** Sau N lượt bot chưa giải quyết được thì tự đề nghị chuyển nhân viên */
  escalateAfter: number;
  /** Cho phép nhân viên trả lời trực tiếp trong widget (live chat) */
  liveChat: boolean;
}

export const defaultHandoff = (): HandoffSettings => ({ enabled: true, zaloUrl: "", messengerUrl: "", escalateAfter: 2, liveChat: true });

export interface TenantSettings {
  shopName: string;
  /** Ngành hàng, vd "mỹ phẩm & spa" — giúp bot hiểu bối cảnh */
  industry: string;
  greeting: string;
  phone: string;
  email: string;
  address: string;
  /** Domain được phép nhúng widget; rỗng = cho phép mọi nơi */
  allowedOrigins: string[];
  /** Webhook nhận lead / lịch hẹn / yêu cầu hỗ trợ (Zalo bot, Slack, n8n...) */
  webhookUrl: string;
  /** Hướng dẫn thêm cho bot (giọng điệu, khuyến mãi...) */
  botInstructions: string;
  /** FAQ, chính sách — nguồn duy nhất cho câu hỏi ngoài danh mục */
  knowledgeBase: string;
  /** Nút gợi ý nhanh dưới khung chat */
  quickReplies: string[];
  hours: WeeklyHours;
  booking: BookingSettings;
  handoff: HandoffSettings;
  theme: WidgetTheme;
}

export const MAX_KNOWLEDGE_LENGTH = 20_000;

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  settings: TenantSettings;
  createdAt: Date;
}

export const defaultSettings = (shopName: string): TenantSettings => ({
  shopName,
  industry: "",
  greeting: `Xin chào! Mình là trợ lý của ${shopName}. Mình có thể tư vấn sản phẩm, đặt lịch hẹn hoặc kết nối bạn với nhân viên.`,
  phone: "",
  email: "",
  address: "",
  allowedOrigins: [],
  webhookUrl: "",
  botInstructions: "",
  knowledgeBase: "",
  quickReplies: ["Tư vấn sản phẩm", "Đặt lịch hẹn", "Giờ mở cửa", "Gặp nhân viên"],
  hours: defaultHours(),
  booking: defaultBookingSettings(),
  handoff: defaultHandoff(),
  theme: defaultTheme(shopName),
});

/** Ghép cài đặt lưu trong DB với mặc định (DB cũ thiếu trường mới không làm vỡ app). */
export function normalizeSettings(raw: Partial<TenantSettings> & { shopName: string }): TenantSettings {
  const d = defaultSettings(raw.shopName);
  return {
    ...d,
    ...raw,
    quickReplies: Array.isArray(raw.quickReplies) ? raw.quickReplies.slice(0, 6) : d.quickReplies,
    hours: sanitizeHours(raw.hours),
    booking: { ...d.booking, ...raw.booking },
    handoff: { ...d.handoff, ...raw.handoff },
    theme: sanitizeTheme(raw.theme as Partial<Record<keyof WidgetTheme, unknown>> | undefined, raw.shopName),
  };
}
