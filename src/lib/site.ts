/** Thông tin nền tảng dùng ở trang marketing — đổi tên thương hiệu tại đây. */
export const siteConfig = {
  name: "Widget Norm",
  tagline: "Hệ sinh thái chatbot bán hàng cho cửa hàng Việt",
  description:
    "Chọn đúng chatbot cho ngành của bạn: tư vấn theo dữ liệu thật, đặt lịch, chuyển nhân viên, phân tích nhu cầu khách. Dùng thử 14 ngày, dán một dòng mã là chạy.",
  url: (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  /** Email liên hệ gói Doanh nghiệp — để trống thì ẩn nút liên hệ */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
};
