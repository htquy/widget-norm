import type { BotKind } from "./tenant";
import type { PlanId } from "./account";

/** Per bot/month; the hub remains authoritative when creating payment orders. */
export const BOT_PRICING: Record<
  BotKind,
  { monthly: number; proMonthly: number; hubSlug: string; includes: string[] }
> = {
  store: {
    monthly: 199_000,
    proMonthly: 399_000,
    hubSlug: "avi",
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
    includes: [
      "Toàn bộ tiện ích AVI",
      "Catalogue gạch chuyên ngành",
      "Báo giá m², số thùng, keo & ron",
      "Ướm gạch trên ảnh phòng",
      "Phối cảnh kèm lead & A/B test",
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
