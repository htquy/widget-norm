import type { BotKind } from "./tenant";
import type { PlanId } from "./account";

/** Per bot/month; the hub remains authoritative when creating payment orders. */
export const BOT_PRICING: Record<
  BotKind,
  { monthly: number; proMonthly: number; hubSlug: string; hubEnv: string; includes: string[] }
> = {
  store: {
    monthly: 199_000,
    proMonthly: 399_000,
    hubSlug: "avi",
    hubEnv: "HUB_APP_AVI",
    includes: [
      "Danh mục sản phẩm & nhập CSV",
      "Kiến thức, chính sách cửa hàng",
      "Đặt lịch & quản lý khách tiềm năng",
      "Chuyển nhân viên & live chat",
      "Báo cáo nhu cầu & tùy chỉnh widget",
    ],
  },
  tile: {
    monthly: 499_000,
    proMonthly: 899_000,
    hubSlug: "avi-tile",
    hubEnv: "HUB_APP_TILE",
    includes: [
      "Toàn bộ tiện ích AVI",
      "Catalogue gạch chuyên ngành",
      "Báo giá m², số thùng, keo & ron",
      "Ướm gạch trên ảnh phòng",
      "Phối cảnh kèm lead & A/B test",
    ],
  },
  education: {
    monthly: 399_000,
    proMonthly: 799_000,
    hubSlug: "avi-edu",
    hubEnv: "HUB_APP_EDU",
    includes: [
      "Toàn bộ tiện ích AVI",
      "Test xếp lớp 15 câu ngay trong chat",
      "Lộ trình đến band mục tiêu, kịp ngày thi không",
      "Học phí, ưu đãi sớm/nhóm, trả góp, lớp còn chỗ",
      "Lead kèm band, mục tiêu và lộ trình",
    ],
  },
  furniture: {
    monthly: 449_000,
    proMonthly: 849_000,
    hubSlug: "avi-furniture",
    hubEnv: "HUB_APP_FURNITURE",
    includes: [
      "Toàn bộ tiện ích AVI",
      "Thiết kế từ ảnh phòng: AI nhận diện phong cách & đồ đã có",
      "Kê thử đúng kích thước thật; xem 3D và AR khi có file .glb",
      "Gợi ý trọn bộ theo ngân sách, kiểm tra đặt vừa",
      "Lead kèm ảnh phương án và tổng tiền",
    ],
  },
};
export const botPrice = (kind: BotKind, plan: PlanId = "starter") =>
  plan === "trial"
    ? 0
    : plan === "business"
      ? null
      : plan === "pro"
        ? BOT_PRICING[kind].proMonthly
        : BOT_PRICING[kind].monthly;
