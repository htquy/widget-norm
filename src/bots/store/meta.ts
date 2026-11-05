import type { BotMeta } from "../meta-types";

export const storeMeta: BotMeta = {
  kind: "store",
  slug: "tro-ly-ban-hang",
  name: "Trợ lý bán hàng & đặt lịch",
  shortName: "Bán hàng & đặt lịch",
  tagline: "Tư vấn sản phẩm, nhận đặt lịch và chăm sóc khách 24/7 cho mọi cửa hàng",
  description:
    "Chatbot AI hiểu danh mục, chính sách và giờ mở cửa của shop: gợi ý đúng sản phẩm, báo giá theo dữ liệu thật, cho khách tự đặt lịch trong khung chat và chuyển ngay sang nhân viên khi gặp câu khó.",
  icon: "ShoppingBag",
  tile: "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
  accentHex: "#5f45e4",
  status: "live",
  industries: ["Mỹ phẩm & spa", "Thời trang", "Phòng khám, nha khoa", "Salon, nail", "Điện máy, nội thất", "Giáo dục, khoá học"],
  heroPoints: ["Trả lời đúng giá, đúng chính sách — có bộ kiểm tra chống bịa", "Khách tự chọn giờ trống và đặt lịch ngay trong chat", "Câu khó tự chuyển nhân viên: gọi lại, Zalo hoặc chat trực tiếp"],
  features: [
    { icon: "Search", title: "Tư vấn theo danh mục", text: "Tìm sản phẩm theo nhu cầu, ngân sách, loại da/đối tượng — hiện thẻ sản phẩm có giá và link mua." },
    { icon: "CalendarCheck", title: "Đặt lịch trong khung chat", text: "Dịch vụ, giờ mở cửa, sức chứa, ngày nghỉ — khách chọn giờ còn trống, shop xác nhận một chạm." },
    { icon: "Headset", title: "Chuyển nhân viên đúng lúc", text: "Khách phàn nàn, hỏi đơn hàng hay bot chưa trả lời được → thẻ liên hệ và live chat cho nhân viên." },
    { icon: "BookOpenCheck", title: "Kiến thức cửa hàng", text: "Giao hàng, đổi trả, bảo hành, thành viên… bot chỉ trả lời theo nội dung shop nhập." },
    { icon: "ChartNoAxesCombined", title: "Phân tích nhu cầu", text: "Chủ đề khách hỏi nhiều, câu chưa trả lời được, cảm xúc khách và báo cáo AI đề xuất việc nên làm." },
    { icon: "Palette", title: "Giao diện theo thương hiệu", text: "Màu, vị trí, kiểu nút, chế độ tối, tên & ảnh trợ lý — xem trước trực tiếp, không cần sửa mã nhúng." },
  ],
  steps: [
    { title: "Nhập danh mục & chính sách", text: "Thêm sản phẩm/dịch vụ hoặc nhập file CSV, dán FAQ giao hàng — đổi trả." },
    { title: "Chọn giao diện, dán 1 dòng mã", text: "Chỉnh màu và lời chào, dán thẻ <script> vào website (WordPress, Haravan, Sapo, LadiPage…)." },
    { title: "Theo dõi & chốt đơn", text: "Lead, lịch hẹn, hội thoại cần hỗ trợ và báo cáo nhu cầu cập nhật theo thời gian thực." },
  ],
  useCases: [
    { title: "Spa, thẩm mỹ", text: "Soi da, tư vấn liệu trình, đặt lịch chăm sóc — nhắc khách đến sớm 10 phút." },
    { title: "Phòng khám, nha khoa", text: "Giải đáp bảng giá dịch vụ, giờ làm việc, đặt lịch khám theo bác sĩ trống." },
    { title: "Bán lẻ online", text: "Gợi ý sản phẩm theo nhu cầu, phí ship, đổi trả; khiếu nại chuyển ngay CSKH." },
  ],
  sampleQuestions: ["Da dầu mụn nên dùng sữa rửa mặt nào?", "Phí giao hàng ra Hà Nội bao nhiêu?", "Mình muốn đặt lịch soi da cuối tuần", "Đơn hàng của mình giao tới đâu rồi?"],
  faq: [
    { q: "Bot có trả lời sai giá không?", a: "Mọi số tiền và mã sản phẩm trong câu trả lời được đối chiếu với dữ liệu shop. Sai thì bot tự sửa một lần; vẫn sai thì trả lời an toàn và mời khách để lại số." },
    { q: "Tôi cần biết lập trình không?", a: "Không. Bạn nhập sản phẩm trong trang quản trị (hoặc CSV), chỉnh giao diện rồi dán một dòng mã vào website." },
    { q: "Khi bot không trả lời được thì sao?", a: "Bot hiện thẻ liên hệ: để lại số gọi lại, gọi hotline, Zalo; nhân viên có thể vào chat trực tiếp, bot tự dừng." },
    { q: "Dữ liệu khách có bị dùng để huấn luyện AI không?", a: "Ở chế độ vận hành thật, hệ thống chỉ gọi nhà cung cấp AI cam kết không lưu dữ liệu (data_collection=deny)." },
  ],
  demoSlug: "lumi-demo",
  adminNav: [{ href: "/admin/products", label: "Sản phẩm", icon: "M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01" }],
};
