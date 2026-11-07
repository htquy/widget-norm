import { storeMeta } from "../store/meta";
import type { BotMeta } from "../meta-types";

export const furnitureMeta: BotMeta = {
  kind: "furniture",
  slug: "tu-van-noi-that",
  name: "AVI Nội thất — Thiết kế từ ảnh phòng",
  shortName: "AVI Nội thất",
  tagline: "Khách chụp ảnh phòng, AI nhận ra phong cách và đồ đã có, kê thử bộ nội thất của shop đúng kích thước thật — rồi gửi phương án cho nhân viên",
  description:
    "Chatbot cho showroom nội thất: khách gửi ảnh phòng, AI chạy ngay trên trình duyệt nhận ra loại phòng, phong cách, màu chủ đạo và đồ đã có; bot gợi ý trọn bộ theo ngân sách (mỗi món hợp phong cách, vừa phòng, không vượt 40% diện tích sàn) và kê thử vào chính ảnh đó theo kích thước thật. Phương án kèm ảnh về thẳng nhân viên.",
  icon: "Sofa",
  tile: "bg-amber-50 text-amber-900 ring-1 ring-amber-100",
  accentHex: "#9a5b2e",
  status: "live",
  industries: ["Showroom sofa, bàn ăn, giường tủ", "Nội thất căn hộ trọn gói", "Xưởng đồ gỗ có catalogue kích thước"],
  heroPoints: [
    "Khách thấy sofa của bạn nằm trong phòng khách của họ, đúng tỉ lệ — trước khi đến showroom",
    "Gợi ý trọn bộ theo phong cách và ngân sách, không gợi lại món khách đã có",
    "Lead kèm ảnh phương án, danh sách món và tổng tiền — nhân viên gọi là chốt",
  ],
  features: [
    ...storeMeta.features.filter((f) => ["Đặt lịch trong khung chat", "Chuyển nhân viên đúng lúc", "Kiến thức cửa hàng", "Phân tích nhu cầu", "Giao diện theo thương hiệu"].includes(f.title)),
    { icon: "Camera", title: "Thiết kế từ ảnh phòng", text: "AI trên trình duyệt (CLIP, DETR, SlimSAM) nhận ra loại phòng, phong cách, đồ đã có và vùng sàn. Ảnh không rời máy khách." },
    { icon: "Ruler", title: "Kê thử đúng kích thước thật", text: "Đồ được đặt lên sàn theo phối cảnh, kéo thả, xoay tự do bằng nút tròn quanh món (mô hình 3D xoay đúng mọi hướng); viền đỏ khi ra ngoài phòng hoặc chồng lên món khác." },
    { icon: "Camera", title: "3D thật, AR và ảnh thật của shop", text: "Món có file .glb: khách xoay xem 3D, xem trong phòng bằng camera điện thoại. Chỉ có ảnh: AI tách nền ngay trên trình duyệt, dựng ảnh thật lên sàn. Muốn có 3D từ ảnh: tạo bản nháp bằng AI, nhân viên duyệt rồi mới hiện cho khách." },
    { icon: "Search", title: "Tìm món giống ảnh mẫu", text: "Khách gửi ảnh Pinterest hay nhà người quen, AI so với ảnh sản phẩm của shop và gợi ý món giống nhất; shop đánh dấu món hợp đi kèm để bot phối đồ đúng bộ." },
    { icon: "Palette", title: "Gợi ý trọn bộ theo ngân sách", text: "Mỗi danh mục thiết yếu một món hợp phong cách và màu phòng, chia ngân sách, cảnh báo đồ chiếm quá 40% sàn và lối đi." },
    { icon: "Calculator", title: "Kiểm tra đặt vừa", text: "Nhập rộng × sâu (và chiều cao trần), bot tính vừa hay không, có cần xoay, còn lối đi bao nhiêu — bằng phép tính, không đoán." },
    { icon: "LayoutGrid", title: "Tạm tính combo & tồn kho", text: "Cộng nhiều món theo số lượng, cảnh báo hàng chỉ còn ít hoặc hết; phí vận chuyển và lắp đặt nhân viên xác nhận." },
  ],
  steps: [
    { title: "Nhập danh mục kèm kích thước & phong cách", text: "Mỗi món: rộng × sâu × cao, phong cách, màu, phòng phù hợp, giá, tồn kho. Chưa có ảnh? Hệ thống vẽ hình minh hoạ đúng tỉ lệ." },
    { title: "Cài chính sách & dịch vụ", text: "Giao hàng, lắp đặt, bảo hành; tạo dịch vụ 'Khảo sát đo đạc' và 'Tham quan showroom' để khách tự đặt giờ." },
    { title: "Dán 1 dòng mã, nhận lead có ngữ cảnh", text: "Lead biết khách cần phòng nào, kích thước, ngân sách và đã xem món nào." },
  ],
  useCases: [
    { title: "Showroom sofa & phòng khách", text: "Khách hỏi 'sofa này có vừa phòng 4x5 không' lúc nào cũng được trả lời đúng ngay." },
    { title: "Xưởng đóng theo kích thước", text: "Thu kích thước và nhu cầu ngay từ chat, nhân viên chỉ cần gọi chốt." },
    { title: "Nội thất căn hộ", text: "Tư vấn combo theo từng phòng và tổng ngân sách, hẹn khảo sát tại nhà." },
  ],
  sampleQuestions: [
    "Thiết kế phòng khách 4x5m phong cách Japandi, 20 triệu",
    "Sofa góc L có vừa góc phòng 3m x 2,5m không?",
    "Bàn ăn 6 người kèm 6 ghế hết bao nhiêu?",
    "Cho mình đặt lịch khảo sát đo đạc tại nhà",
  ],
  faq: [
    { q: "Bot có biết món nào vừa phòng không?", a: "Có. Bot dùng kích thước bạn nhập cho từng món và phép tính kiểm tra khoảng trống (có xoay 90°, lối đi tối thiểu, chiều cao); không để AI tự so kích thước." },
    { q: "Báo giá có gồm vận chuyển, lắp đặt không?", a: "Bot chỉ tạm tính tiền hàng và nói rõ chưa gồm vận chuyển, lắp đặt; nhân viên xác nhận phần này sau khảo sát hoặc theo địa chỉ." },
    { q: "Khách có xem thử nội thất trong ảnh phòng của mình được không?", a: "Có. Khách chụp ảnh, AI chạy ngay trên trình duyệt nhận ra phòng và vùng sàn, rồi kê đồ của shop đúng tỉ lệ. Ảnh chỉ gửi cho shop khi khách bấm gửi phương án." },
    { q: "Ảnh kê thử chính xác tới đâu?", a: "Đúng tỉ lệ theo kích thước khách nhập cho vùng sàn. Món có file 3D hiện đúng hình dáng thật; món chỉ có ảnh hiện ảnh thật đã tách nền; món chưa có gì hiện hình vẽ theo số đo và màu. Nhân viên vẫn nên khảo sát trước khi đóng theo kích thước." },
    { q: "Shop không có file 3D thì sao?", a: "Vẫn dùng được: tải ảnh sản phẩm lên, AI tách nền ngay trên máy bạn. Muốn có 3D, bạn tải file .glb hoặc dùng nút tạo bản nháp từ ảnh (cần máy chủ GPU riêng, chi phí theo lượt); mọi mô hình do AI tạo đều phải được nhân viên duyệt trước khi khách thấy." },
    { q: "Dữ liệu có an toàn không?", a: "Ở chế độ vận hành thật chỉ gọi nhà cung cấp AI cam kết không lưu dữ liệu (data_collection=deny)." },
  ],
  demoSlug: "noi-that-demo",
  adminNav: [{ href: "/admin/furniture", label: "Nội thất", icon: "M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0zM4 18v2M20 18v2" }],
};
