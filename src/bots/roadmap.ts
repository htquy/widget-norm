import type { BotKind } from "@/domain/tenant";

/**
 * Lộ trình chatbot tương lai — hiển thị ở landing ("Sắp ra mắt") và docs/PLAN.md.
 * Khi làm xong một bot: thêm vào BOT_KINDS (domain/tenant.ts), tạo src/bots/<kind>/, đăng ký ở catalog.ts + container.ts
 * rồi xoá khỏi danh sách này.
 */
export interface PlannedBot {
  id: string;
  name: string;
  tagline: string;
  /** Nghiệp vụ riêng dự kiến → schema DB riêng của bot */
  schemaIdeas: string[];
  /** Bot tái dùng được những phần dùng chung nào của nền tảng */
  reuses: string[];
  /** Có thể trộn vào bot "store" trước khi tách bot riêng */
  derivedFrom?: BotKind;
}

export const PLANNED_BOTS: PlannedBot[] = [
  {
    id: "restaurant",
    name: "Đặt bàn & thực đơn nhà hàng",
    tagline: "Gợi ý món theo khẩu vị, nhận đặt bàn theo số khách, báo món hết trong ngày",
    schemaIdeas: ["menu_items (món, nguyên liệu, dị ứng)", "tables (sơ đồ bàn, sức chứa)", "reservations (số khách, khung giờ)"],
    reuses: ["jev", "live chat", "đặt lịch (khung giờ)", "phân tích nhu cầu"],
    derivedFrom: "store",
  },
  {
    id: "realestate",
    name: "Tư vấn bất động sản",
    tagline: "Lọc căn theo ngân sách, hướng, tiện ích; hẹn xem nhà; tính khoản vay ước tính",
    schemaIdeas: ["listings (dự án, căn, giá, hướng)", "viewings (lịch xem nhà)", "loan_scenarios (khoản vay ước tính)"],
    reuses: ["jev", "đặt lịch xem nhà", "chuyển nhân viên", "lead CRM"],
  },
  {
    id: "clinic",
    name: "Đặt khám & tư vấn phòng khám",
    tagline: "Hỏi triệu chứng chung (không chẩn đoán), chọn chuyên khoa, đặt lịch theo bác sĩ",
    schemaIdeas: ["doctors (chuyên khoa, ca trực)", "specialties", "visits (lịch khám, nhắc lịch)"],
    reuses: ["jev", "đặt lịch theo tài nguyên (bác sĩ)", "chuyển nhân viên"],
  },
  {
    id: "support",
    name: "Chăm sóc sau bán & bảo hành",
    tagline: "Tra cứu bảo hành theo số serial, mở phiếu hỗ trợ, hướng dẫn xử lý sự cố thường gặp",
    schemaIdeas: ["warranties (serial, thời hạn)", "tickets (phiếu hỗ trợ, SLA)", "kb_articles (hướng dẫn sự cố)"],
    reuses: ["jev", "live chat", "chuyển nhân viên", "phân tích nhu cầu"],
  },
];
