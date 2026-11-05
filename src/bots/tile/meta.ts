import { storeMeta } from "../store/meta";
import type { BotMeta } from "../meta-types";

export const tileMeta: BotMeta = {
  kind: "tile",
  slug: "tu-van-gach-op-lat",
  name: "AVI Gạch — Studio ốp lát",
  shortName: "AVI Gạch",
  tagline:
    "Khách chụp ảnh phòng, thấy ngay gạch phủ lên sàn/tường và nhận báo giá trong một khung chat",
  description:
    "Chatbot chuyên ngành vật liệu: gợi ý mẫu theo phong cách và ngân sách, AI tự nhận diện sàn/tường trên ảnh phòng để ướm thử gạch theo đúng phối cảnh, tự tính số thùng, keo, ron và tổng tiền — rồi thu số điện thoại kèm ảnh phối cảnh cho nhân viên chốt đơn.",
  icon: "Grid3x3",
  tile: "bg-slate-100 text-[#15476d] ring-1 ring-slate-200",
  accentHex: "#15476d",
  status: "live",
  industries: [
    "Cửa hàng gạch ốp lát",
    "Showroom vật liệu xây dựng",
    "Đại lý thiết bị vệ sinh",
    "Nhà thầu hoàn thiện nội thất",
  ],
  heroPoints: [
    "Xem thử gạch trên ảnh phòng thật — AI chạy ngay trên trình duyệt",
    "Báo giá tự động: số thùng có hao hụt, keo dán, keo ron",
    "Lead kèm ảnh phối cảnh và báo giá gửi thẳng cho nhân viên",
  ],
  features: [
    ...storeMeta.features,
    {
      icon: "ScanEye",
      title: "Ướm thử trên ảnh phòng",
      text: "SlimSAM tự tách sàn/tường, nắn phối cảnh 4 góc, giữ ánh sáng & bóng đổ của ảnh gốc.",
    },
    {
      icon: "Calculator",
      title: "Báo giá theo kiểu lát",
      text: "Thẳng, so le, xương cá — cộng hao hụt theo thông số shop, tính keo dán và ron theo kích thước viên.",
    },
    {
      icon: "LayoutGrid",
      title: "Gợi ý mẫu theo phong cách",
      text: "Vân đá, vân gỗ, xi măng, terrazzo, gạch bông… lọc theo sàn/tường, màu, ngân sách, còn hàng.",
    },
    {
      icon: "CalendarCheck",
      title: "Hẹn khảo sát, đến showroom",
      text: "Khách đặt lịch đo đạc tại nhà hoặc xem mẫu thật ngay trong chat.",
    },
    {
      icon: "FlaskConical",
      title: "A/B test có kiểm định",
      text: "Chia nhóm khách có/không trình xem thử, so tỉ lệ để lại SĐT kèm p-value.",
    },
    {
      icon: "Headset",
      title: "Chuyển nhân viên khi cần",
      text: "Hỏi giá nhân công, gạch lỗi, công nợ… bot chuyển ngay sang nhân viên hoặc Zalo.",
    },
  ],
  steps: [
    {
      title: "Nhập catalogue gạch",
      text: "Kích thước, quy cách thùng, giá/m², ảnh vân gạch — thêm tay hoặc nhập CSV.",
    },
    {
      title: "Cài thông số báo giá",
      text: "Hao hụt theo kiểu lát, giá keo, ron; chỉnh giao diện widget rồi dán mã nhúng.",
    },
    {
      title: "Nhận lead kèm phối cảnh",
      text: "Mỗi lead có ảnh phòng đã phủ gạch và báo giá — nhân viên gọi chốt đơn ngay.",
    },
  ],
  useCases: [
    {
      title: "Cửa hàng gạch",
      text: "Khách không cần tới showroom vẫn thấy mẫu trên chính ngôi nhà của mình.",
    },
    {
      title: "Đại lý vật liệu",
      text: "Báo giá nhanh cho thợ và chủ nhà, giảm thời gian tính tay số thùng, keo, ron.",
    },
    {
      title: "Nhà thầu hoàn thiện",
      text: "Gửi link chat cho khách chọn mẫu và ước tính chi phí trước buổi khảo sát.",
    },
  ],
  sampleQuestions: [
    "Phòng khách 25m2 nên lát gạch gì?",
    "Gạch vân gỗ có chống trơn không?",
    "Báo giá mẫu 1 cho phòng 4x5m",
    "Đặt lịch khảo sát nhà mình thứ 7",
  ],
  faq: [
    {
      q: "Ảnh phòng của khách có bị gửi lên server không?",
      a: "Không. Nhận diện sàn/tường và phủ gạch chạy ngay trên trình duyệt của khách. Ảnh chỉ được gửi khi khách chủ động để lại liên hệ kèm phối cảnh.",
    },
    {
      q: "Báo giá có chính xác không?",
      a: "Số thùng tính từ diện tích, quy cách thùng và hao hụt theo kiểu lát do shop cài; keo ron tính theo kích thước viên và độ rộng mạch. Bot không tự nhẩm tiền — luôn gọi công cụ tính.",
    },
    {
      q: "Máy yếu có chạy được trình xem thử không?",
      a: "Có. Ảnh hiện ngay với vùng lát ước lượng; AI tải ~15 MB lần đầu, chạy WebGPU nếu có, nếu không tự dùng WASM. Khách luôn chỉnh được 4 góc bằng tay.",
    },
    {
      q: "Tôi có dùng chung được tính năng đặt lịch, chuyển nhân viên không?",
      a: "Có — mọi chatbot trên nền tảng dùng chung tầng quyết định jev, đặt lịch, live chat, phân tích nhu cầu.",
    },
  ],
  demoSlug: "gach-dep-demo",
  pricingNote:
    "Toàn bộ tiện ích AVI, cộng báo giá m², studio phối cảnh và A/B test. Từ 499.000 ₫/tháng.",
  adminNav: [
    ...storeMeta.adminNav,
    {
      href: "/admin/tiles",
      label: "Mẫu gạch",
      icon: "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18",
    },
    {
      href: "/admin/tile-settings",
      label: "Báo giá & A/B test",
      icon: "M4 2h16v20H4zM8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14v4",
    },
  ],
};
