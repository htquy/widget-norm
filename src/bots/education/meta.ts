import { storeMeta } from "../store/meta";
import type { BotMeta } from "../meta-types";

export const educationMeta: BotMeta = {
  kind: "education",
  slug: "luyen-thi-ielts",
  name: "AVI IELTS — Test đầu vào & lộ trình",
  shortName: "AVI IELTS",
  tagline: "Học viên làm test xếp lớp ngay trong chat, nhận band ước lượng và lộ trình bằng đúng các lớp bạn đang tuyển — kịp ngày thi hay không, tổng học phí bao nhiêu",
  description:
    "Chatbot cho trung tâm tiếng Anh và luyện thi IELTS: test xếp lớp 15 câu (A1–C1) chấm ở máy chủ, quy đổi band ước lượng; lộ trình từ band hiện tại tới mục tiêu ghép từ các khoá thật, xếp theo lớp đang tuyển, ra ngày học xong và có kịp ngày thi không; học phí, ưu đãi, trả góp do hệ thống tính. Lead về tư vấn viên kèm band, mục tiêu và lộ trình.",
  icon: "GraduationCap",
  tile: "bg-sky-50 text-sky-900 ring-1 ring-sky-100",
  accentHex: "#1d3a6e",
  status: "live",
  industries: ["Trung tâm luyện thi IELTS", "Trung tâm tiếng Anh có lớp IELTS", "Tư vấn du học có lớp luyện IELTS"],
  heroPoints: [
    "Câu hỏi đầu tiên của học viên là 'em đang ở mức nào' — bot cho làm test ngay, 10 phút có band",
    "'Từ 5.0 lên 7.0 trước tháng 6 có kịp không?' — trả lời bằng lớp thật, ngày thật, tiền thật",
    "Tư vấn viên nhận lead đã có band, mục tiêu, ngày thi và lộ trình",
  ],
  features: [
    ...storeMeta.features.filter((f) => ["Đặt lịch trong khung chat", "Chuyển nhân viên đúng lúc", "Kiến thức cửa hàng", "Phân tích nhu cầu", "Giao diện theo thương hiệu"].includes(f.title)),
    { icon: "ClipboardCheck", title: "Test xếp lớp trong chat", text: "15 câu ngữ pháp, từ vựng, đọc hiểu từ A1 đến C1; đáp án chỉ ở máy chủ; ra CEFR và band ước lượng, không đoán bừa." },
    { icon: "Route", title: "Lộ trình tới band mục tiêu", text: "Ghép các khoá của trung tâm theo band đầu vào/đầu ra, xếp vào lớp đang tuyển, báo ngày xong và có kịp ngày thi." },
    { icon: "Calculator", title: "Học phí & ưu đãi chính xác", text: "Tự áp ưu đãi tốt nhất (đăng ký sớm, học nhóm), chia kỳ trả góp; mỗi lần chỉ một ưu đãi, không cộng dồn nhầm." },
  ],
  steps: [
    { title: "Nhập khoá học theo band", text: "Mỗi khoá ghi trình độ dạng '4.5 → 5.5' để ghép lộ trình; thêm các đợt khai giảng: ngày, lịch, cơ sở, số chỗ." },
    { title: "Cài ưu đãi và dịch vụ học thử", text: "Ưu đãi đăng ký sớm, học nhóm; tạo dịch vụ 'Học thử' và 'Test trình độ' để khách tự đặt giờ." },
    { title: "Dán 1 dòng mã, nhận lead có ngữ cảnh", text: "Mỗi lead biết học viên ai, muốn gì, xem khoá nào — tư vấn viên gọi đúng việc." },
  ],
  useCases: [
    { title: "Mùa tuyển sinh cao điểm", text: "Hàng trăm câu 'em mất gốc học bao lâu' cùng lúc: bot cho test và trả lộ trình, tư vấn viên chỉ gọi lead đã sẵn sàng." },
    { title: "Học viên cần chứng chỉ có hạn chót", text: "Hạn nộp hồ sơ du học, xét tuyển: bot báo thẳng kịp hay không, đề xuất dời ngày thi hoặc lớp kèm." },
    { title: "Trung tâm nhiều cơ sở", text: "Lộ trình chọn lớp còn chỗ sớm nhất ở mọi cơ sở và online." },
  ],
  sampleQuestions: [
    "Em mất gốc muốn đạt IELTS 6.5 thì học bao lâu?",
    "Em 5.0, cần 7.0 trước tháng 6 có kịp không?",
    "Cho em làm test xem em đang ở mức nào",
    "Đăng ký 3 bạn thì giảm bao nhiêu?",
  ],
  faq: [
    { q: "Bài test có chính xác như thi thật không?", a: "Không. Test 15 câu ước lượng ngữ pháp, từ vựng và đọc hiểu để xếp lớp; bot luôn nói rõ Nghe/Nói/Viết cần giáo viên kiểm tra và mời học viên test trực tiếp miễn phí." },
    { q: "Lộ trình lấy từ đâu?", a: "Từ chính các khoá bạn nhập (trình độ dạng '4.5 → 5.5') và các lớp đang tuyển. Thiếu khoá ở một đoạn band, bot nói rõ để tư vấn viên xếp lớp kèm." },
    { q: "Bot có hứa điểm số hay cam kết quá mức không?", a: "Bot chỉ nhắc cam kết đầu ra mà trung tâm đã nhập. Học phí, ưu đãi, ngày khai giảng được đối chiếu với dữ liệu; sai thì tự sửa hoặc chuyển tư vấn viên." },
    { q: "Lớp hết chỗ thì sao?", a: "Số chỗ còn lại nằm trong từng đợt khai giảng. Hết chỗ, bot không giữ chỗ giả mà xin số điện thoại để báo khi mở lớp mới." },
    { q: "Có gắn được với phần mềm quản lý học viên không?", a: "Bản này lưu lead và lịch học thử trong hệ thống, xuất CSV. Kết nối phần mềm quản lý (CRM/LMS) nằm trong kế hoạch." },
    { q: "Dữ liệu học viên có an toàn không?", a: "Chỉ gọi nhà cung cấp AI cam kết không lưu dữ liệu ở chế độ vận hành thật. Bạn nên tránh nhập dữ liệu nhạy cảm của trẻ em vào kiến thức bot." },
  ],
  demoSlug: "trung-tam-demo",
  adminNav: [
    { href: "/admin/courses", label: "Khoá học", icon: "M22 10 12 5 2 10l10 5 10-5zM6 12v5c3 3 9 3 12 0v-5" },
  ],
};
