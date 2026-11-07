import type { BotKind } from "@/domain/tenant";
import type { AdminNavItem } from "./types";

/** Nội dung giới thiệu một loại chatbot — dùng ở landing, trang giới thiệu, đăng ký, admin. An toàn cho client. */
export interface BotMeta {
  kind: BotKind;
  /** Đường dẫn trang giới thiệu: /bots/<slug> */
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  /** Tên icon lucide-react */
  icon: "ShoppingBag" | "Grid3x3" | "GraduationCap" | "Sofa" | "Bot";
  /** Lớp Tailwind cho ô icon + màu nhấn của bot (không thay màu thương hiệu chung) */
  tile: string;
  accentHex: string;
  status: "live" | "beta";
  industries: string[];
  heroPoints: string[];
  features: { title: string; text: string; icon: string }[];
  steps: { title: string; text: string }[];
  useCases: { title: string; text: string }[];
  /** Câu khách hỏi mẫu (hiện ở trang giới thiệu, bấm để thử ngay trong demo) */
  sampleQuestions: string[];
  faq: { q: string; a: string }[];
  /** Slug shop demo để nhúng widget thật vào trang giới thiệu */
  demoSlug: string;
  /** Giá cộng thêm / ghi chú gói riêng của bot (nếu có) */
  pricingNote?: string;
  adminNav: AdminNavItem[];
}
