/**
 * ĐĂNG KÝ NGÔN NGỮ — một chỗ duy nhất khai báo các ngôn ngữ hệ thống hỗ trợ.
 *
 * Thêm ngôn ngữ mới (ví dụ tiếng Nhật "ja") — làm đúng 4 việc:
 *  1. Thêm một dòng vào LANGUAGES dưới đây.
 *  2. Giao diện website + admin: tạo `messages/ja/index.ts` (khoá = câu tiếng Việt gốc, giá trị = bản dịch),
 *     đăng ký trong `messages/index.ts`. Trang admin "Ngôn ngữ" có nút tải file JSON các câu còn thiếu để gửi dịch.
 *  3. Chữ trong widget chat: tạo `widget/ja.ts`, đăng ký trong `widget/index.ts`.
 *  4. Chatbot trả lời bằng ngôn ngữ đó (nếu `chat: true`): thêm gói câu mẫu `src/domain/chat-packs/ja.ts`
 *     (TypeScript báo thiếu trường nào), đăng ký trong `chat-packs/index.ts`.
 * Thiếu bản dịch thì giao diện tự rơi về tiếng Anh rồi tiếng Việt — không bao giờ vỡ trang.
 */
export interface LanguageDef {
  code: string;
  /** Tên gọi bằng chính ngôn ngữ đó */
  name: string;
  /** Tên tiếng Anh — dùng trong chỉ thị cho AI ("Reply ONLY in …") */
  english: string;
  /** Mã BCP 47 để định dạng ngày/số */
  intl: string;
  /** Hướng chữ */
  dir?: "ltr" | "rtl";
  /** Cho phép chọn làm ngôn ngữ giao diện website/admin */
  ui: boolean;
  /** Cho phép chọn làm ngôn ngữ trả lời của chatbot */
  chat: boolean;
}

export const LANGUAGES = [
  { code: "vi", name: "Tiếng Việt", english: "Vietnamese", intl: "vi-VN", ui: true, chat: true },
  { code: "en", name: "English", english: "English", intl: "en-GB", ui: true, chat: true },
] as const satisfies readonly LanguageDef[];

export type LangCode = (typeof LANGUAGES)[number]["code"];

/** Ngôn ngữ gốc: khoá của mọi câu trong mã nguồn (không cần file dịch) */
export const BASE_LANGUAGE: LangCode = "vi";
/** Ngôn ngữ dự phòng khi một ngôn ngữ chưa có bản dịch cho câu nào đó */
export const FALLBACK_LANGUAGE: LangCode = "en";

export const languageByCode = (code: string) => LANGUAGES.find((l) => l.code === code) as (typeof LANGUAGES)[number] | undefined;
export const languageName = (code: string) => languageByCode(code)?.name ?? code;
/** Tên tiếng Anh để đưa vào chỉ thị cho AI */
export const languageEnglish = (code: string) => languageByCode(code)?.english ?? code;
export const intlLocale = (code: string) => languageByCode(code)?.intl ?? "vi-VN";
