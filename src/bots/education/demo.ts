import type { Course, Intake, Promo } from "./domain";

/** Dữ liệu demo của "Anh ngữ Sao Mai" (hư cấu, trung tâm luyện thi IELTS) — ngày khai giảng tính từ hôm nay để demo luôn còn lớp. */
type DemoCourse = Omit<Course, "id" | "tenantId" | "createdAt">;

const addDays = (today: string, n: number) => {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export function demoCourses(today: string): DemoCourse[] {
  const intake = (id: string, offset: number, schedule: string, mode: Intake["mode"], branch: string, seatsLeft: number): Intake => ({ id, startDate: addDays(today, offset), schedule, mode, branch, seatsLeft });
  const early = (percent: number, days: number): Promo => ({ kind: "early_bird", label: "Đăng ký sớm", percent, until: addDays(today, days) });
  const group = (percent: number, minPeople: number): Promo => ({ kind: "group", label: "Học nhóm", percent, minPeople });
  return [
    {
      code: "IELTS-F", name: "IELTS Foundation", category: "IELTS", level: "Mất gốc → 4.5", audience: "Học sinh THPT, sinh viên năm 1-2", durationWeeks: 16, sessionsPerWeek: 3, tuition: 9_600_000, active: true,
      description: "Xây nền từ vựng, ngữ pháp và phát âm; làm quen 4 kỹ năng IELTS. Lớp tối đa 15 học viên, có giáo viên trợ giảng chữa bài.",
      outcomes: "Đầu ra 4.5 IELTS cuối khoá, cam kết học lại miễn phí nếu không đạt khi đi học đủ 90% buổi và làm đủ bài tập.",
      intakes: [intake("k1", 6, "T2-T4-T6 18:30-20:30", "offline", "Quận 1", 9), intake("k2", 13, "T3-T5-T7 19:00-21:00", "online", "", 14)],
      promos: [early(10, 5), group(8, 3)],
    },
    {
      code: "IELTS-65", name: "IELTS Intensive 6.5+", category: "IELTS", level: "5.0 → 6.5", audience: "Sinh viên, người đi làm cần chứng chỉ du học/xét tuyển", durationWeeks: 20, sessionsPerWeek: 3, tuition: 14_800_000, active: true,
      description: "Luyện đề theo từng kỹ năng, chấm Writing và Speaking 1-1 hàng tuần, thi thử định kỳ mô phỏng thi thật.",
      outcomes: "Cam kết đầu ra 6.5 (không kỹ năng nào dưới 6.0). Không đạt được học lại miễn phí.",
      intakes: [intake("k1", 9, "T2-T4-T6 19:00-21:00", "offline", "Quận 3", 6), intake("k2", 20, "T7-CN 08:30-11:30", "offline", "Quận 1", 12)],
      promos: [early(8, 7), group(10, 3)],
    },
    {
      code: "GT-CB", name: "Tiếng Anh giao tiếp cơ bản", category: "Giao tiếp", level: "Mất gốc → giao tiếp tự tin", audience: "Người đi làm, sinh viên", durationWeeks: 12, sessionsPerWeek: 2, tuition: 5_400_000, active: true,
      description: "Luyện nghe nói theo tình huống công việc và du lịch. 70% thời gian thực hành nói theo cặp và nhóm nhỏ.",
      outcomes: "Giao tiếp được các tình huống hằng ngày, tự giới thiệu và họp ngắn bằng tiếng Anh.",
      intakes: [intake("k1", 4, "T3-T5 18:30-20:30", "offline", "Quận 1", 5), intake("k2", 11, "T2-T4 20:00-21:30", "online", "", 18)],
      promos: [early(10, 3), group(10, 2)],
    },
    {
      code: "KIDS-A1", name: "Tiếng Anh thiếu nhi Starters", category: "Thiếu nhi", level: "6-8 tuổi, chưa học", audience: "Trẻ 6-8 tuổi", durationWeeks: 24, sessionsPerWeek: 2, tuition: 7_200_000, active: true,
      description: "Học qua trò chơi, bài hát và hoạt động nhóm theo giáo trình Cambridge Starters. Lớp tối đa 10 bé, báo cáo tiến bộ gửi phụ huynh hằng tháng.",
      outcomes: "Bé đủ nền tảng thi chứng chỉ Cambridge Starters cuối khoá.",
      intakes: [intake("k1", 8, "T7-CN 09:00-10:30", "offline", "Quận 7", 4)],
      promos: [group(8, 2)],
    },
    {
      code: "IELTS-PRE", name: "IELTS Pre-Intermediate 5.5", category: "IELTS", level: "4.5 → 5.5", audience: "Học sinh, sinh viên đã có nền 4.0–4.5", durationWeeks: 14, sessionsPerWeek: 3, tuition: 11_200_000, active: true,
      description: "Lấp khoảng trống giữa nền tảng và luyện đề: mở rộng từ vựng học thuật, viết đoạn Task 1/Task 2, nghe ghi chú. Chữa Writing 2 bài/tuần.",
      outcomes: "Đầu ra 5.5, đủ đầu vào lớp Intensive 6.5+.",
      intakes: [intake("k1", 5, "T3-T5-T7 18:30-20:30", "offline", "Quận 1", 7), intake("k2", 30, "T2-T4-T6 19:00-21:00", "online", "", 15)],
      promos: [early(8, 4), group(8, 3)],
    },
    {
      code: "IELTS-75", name: "IELTS Advanced 7.5", category: "IELTS", level: "6.5 → 7.5", audience: "Người cần 7.0+ cho học bổng, định cư, xét tuyển", durationWeeks: 12, sessionsPerWeek: 3, tuition: 16_500_000, active: true,
      description: "Lớp tối đa 8 học viên; Speaking 1-1 với giám khảo cũ hằng tuần, Writing chấm theo 4 tiêu chí band descriptors, thi thử trên máy.",
      outcomes: "Cam kết 7.0 (không kỹ năng nào dưới 6.5).",
      intakes: [intake("k1", 18, "T7-CN 14:00-17:00", "offline", "Quận 3", 5)],
      promos: [early(5, 10)],
    },
  ];
}

export const DEMO_EDU_SERVICES = [
  { name: "Học thử miễn phí 1 buổi", durationMin: 90, price: 0, desc: "Học thử một buổi cùng lớp thật, gặp giáo viên và tư vấn viên." },
  { name: "Test trình độ & tư vấn lộ trình", durationMin: 45, price: 0, desc: "Làm bài test đầu vào, nhận lộ trình học và lớp phù hợp." },
];

export const DEMO_EDU_KNOWLEDGE = `HỌC PHÍ & THANH TOÁN
- Học phí tính cả khoá, đã gồm giáo trình điện tử. Tài liệu in và lệ phí thi chứng chỉ đóng riêng.
- Có thể đóng làm 2 kỳ, hoặc trả góp 0% lãi suất 3-6 tháng qua thẻ tín dụng.
- Mỗi lần chỉ áp dụng một ưu đãi có lợi nhất, không cộng dồn.

HOÀN PHÍ & BẢO LƯU
- Hoàn 100% học phí nếu huỷ trước ngày khai giảng; sau buổi học đầu tiên hoàn phần học phí các buổi chưa học trừ 10% phí xử lý.
- Bảo lưu tối đa 3 tháng, chỉ một lần cho mỗi khoá.

HỌC THỬ & TEST
- Học thử miễn phí 1 buổi tại lớp thật, không ràng buộc đăng ký. Test trình độ miễn phí 45 phút.

ĐỊA ĐIỂM
- Cơ sở Quận 1: 12 Nguyễn Du. Quận 3: 88 Võ Văn Tần. Quận 7: 45 Nguyễn Thị Thập. Lớp online học qua Zoom, có ghi hình xem lại 30 ngày.`;

export const DEMO_EDU_QUESTIONS = [
  { text: "Em mất gốc muốn thi IELTS 6.5 thì học lớp nào", label: "needs_consult", topic: "lộ trình IELTS", need: "Tư vấn lộ trình từ mất gốc lên 6.5", sentiment: "neutral", handledBy: "llm_complex" },
  { text: "IELTS Foundation học phí bao nhiêu", label: "product_query", topic: "học phí IELTS", need: "Hỏi học phí IELTS Foundation", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Đăng ký 3 bạn thì được giảm bao nhiêu", label: "product_query", topic: "ưu đãi học nhóm", need: "Hỏi ưu đãi đăng ký nhóm", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Khi nào có lớp khai giảng cho bé 7 tuổi", label: "product_query", topic: "lịch khai giảng thiếu nhi", need: "Hỏi lịch khai giảng cho bé 7 tuổi", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Cho mình học thử một buổi được không", label: "booking", topic: "học thử", need: "Đặt lịch học thử", sentiment: "neutral", handledBy: "template" },
  { text: "Có trả góp học phí không", label: "knowledge_query", topic: "trả góp học phí", need: "Hỏi trả góp học phí", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Nếu học xong không đạt thì sao", label: "knowledge_query", topic: "cam kết đầu ra", need: "Hỏi chính sách cam kết đầu ra", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Em 5.0 muốn 7.0 trước tháng 6 có kịp không", label: "needs_consult", topic: "lộ trình 7.0", need: "Hỏi lộ trình 5.0 lên 7.0 kịp hạn", sentiment: "neutral", handledBy: "llm_simple", unanswered: true },
  { text: "Mình muốn đổi lịch học sang lớp tối", label: "complaint", topic: "đổi lịch học", need: "Xin đổi lịch học", sentiment: "negative", handledBy: "handoff", unanswered: true },
];
