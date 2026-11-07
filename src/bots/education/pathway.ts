import { DomainError } from "@/domain/errors";
import { fold } from "@/domain/text";
import { openIntakes, type Course } from "./domain";

/**
 * Lộ trình IELTS: từ band hiện tại → band mục tiêu bằng chuỗi khoá CÓ THẬT của trung tâm,
 * xếp theo lớp đang tuyển, ra ngày học xong, tổng học phí và có kịp ngày thi không.
 * Thuần tính toán — bot không tự ước lượng thời gian hay cộng tiền.
 */

/** "Mất gốc → 4.5" → {0, 4.5}; "5.0 → 6.5" → {5, 6.5}; khoá không theo band IELTS → null */
export function bandRange(level: string): { from: number; to: number } | null {
  const t = fold(level);
  const parts = t.split(/→|->|-+>|\bden\b|\blen\b/);
  if (parts.length < 2) return null;
  const n = (s: string) => {
    const m = s.match(/(\d(?:[.,]\d)?)/);
    const v = m ? Number(m[1].replace(",", ".")) : NaN;
    return v >= 0 && v <= 9 ? v : NaN;
  };
  const to = n(parts[parts.length - 1]);
  let from = n(parts[0]);
  if (Number.isNaN(from) && /(mat goc|chua|zero|0\b|bat dau)/.test(parts[0])) from = 0;
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return null;
  return { from, to };
}

export const isBand = (v: unknown): v is number => typeof v === "number" && v >= 0 && v <= 9 && Math.round(v * 2) === v * 2;

export interface PathwayStep {
  courseId: string;
  code: string;
  name: string;
  from: number;
  to: number;
  weeks: number;
  sessionsPerWeek: number;
  tuition: number;
  /** YYYY-MM-DD */
  start: string;
  end: string;
  /** Lớp thật đang tuyển; null = lớp chưa mở, ngày là dự kiến */
  intake: { schedule: string; mode: string; branch: string; seatsLeft: number } | null;
}

export interface Pathway {
  current: number;
  target: number;
  steps: PathwayStep[];
  reached: number;
  reachesTarget: boolean;
  totalWeeks: number;
  totalTuition: number;
  finishDate: string | null;
  examDate: string | null;
  onTime: boolean | null;
  notes: string[];
}

const addDays = (d: string, n: number) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

export function planPathway(courses: Course[], input: { current: number; target: number; today: string; examDate?: string }): Pathway {
  const { current, target, today } = input;
  if (!isBand(current) || !isBand(target)) throw new DomainError("BAD_BAND", "Band IELTS từ 0 đến 9, bước 0.5");
  if (target <= current) throw new DomainError("BAD_TARGET", "Band mục tiêu phải cao hơn band hiện tại");
  if (input.examDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.examDate)) throw new DomainError("BAD_DATE", "Ngày thi dạng YYYY-MM-DD");

  const ladder = courses
    .filter((c) => c.active)
    .map((c) => ({ c, r: bandRange(c.level) }))
    .filter((x): x is { c: Course; r: { from: number; to: number } } => !!x.r);
  const steps: PathwayStep[] = [];
  const notes: string[] = [];
  let cur = current;
  let date = today;
  const used = new Set<string>();

  while (cur < target && steps.length < 6) {
    // Vào được khoá nếu đầu vào ≤ band hiện tại; chỉ khi không có khoá nào như vậy mới nới thiếu nửa band
    const open = ladder.filter((x) => !used.has(x.c.id) && x.r.to > cur);
    const exact = open.filter((x) => x.r.from <= cur);
    const options = exact.length ? exact : open.filter((x) => x.r.from <= cur + 0.5);
    if (options.length === 0) {
      notes.push(`Trung tâm chưa có khoá đi tiếp từ band ${cur} — tư vấn viên sẽ xếp lớp kèm riêng hoặc lớp gần nhất.`);
      break;
    }
    const finishing = options.filter((x) => x.r.to >= target).sort((a, b) => a.c.durationWeeks - b.c.durationWeeks || a.c.tuition - b.c.tuition);
    const pick = finishing[0] ?? options.sort((a, b) => b.r.to - a.r.to || a.c.tuition - b.c.tuition)[0];
    used.add(pick.c.id);
    // Lớp đang tuyển sớm nhất sau khi xong khoá trước (khoá đầu: từ hôm nay, cho vào muộn 7 ngày)
    const intake = openIntakes(pick.c, steps.length ? date : today, steps.length ? 0 : 7)[0] ?? null;
    const start = intake ? (intake.startDate < date ? date : intake.startDate) : addDays(date, 7);
    if (!intake) notes.push(`${pick.c.name}: chưa có lớp mở sau ${date.split("-").reverse().join("/")}, ngày bắt đầu là dự kiến.`);
    const end = addDays(start, pick.c.durationWeeks * 7);
    steps.push({
      courseId: pick.c.id,
      code: pick.c.code,
      name: pick.c.name,
      from: pick.r.from,
      to: pick.r.to,
      weeks: pick.c.durationWeeks,
      sessionsPerWeek: pick.c.sessionsPerWeek,
      tuition: pick.c.tuition,
      start,
      end,
      intake: intake && { schedule: intake.schedule, mode: intake.mode, branch: intake.branch, seatsLeft: intake.seatsLeft },
    });
    if (pick.r.from > cur) notes.push(`${pick.c.name} yêu cầu đầu vào ${pick.r.from}, cao hơn band hiện tại ${cur} nửa band — nên ôn thêm hoặc test lại trước khi vào lớp.`);
    cur = pick.r.to;
    date = end;
  }

  const reachesTarget = cur >= target;
  const finishDate = steps.at(-1)?.end ?? null;
  const totalWeeks = steps.length ? Math.ceil(daysBetween(steps[0].start, finishDate!) / 7) : 0;
  let onTime: boolean | null = null;
  if (input.examDate && finishDate) {
    onTime = finishDate <= input.examDate;
    if (!onTime) {
      const lateWeeks = Math.ceil(daysBetween(input.examDate, finishDate) / 7);
      notes.push(`Học theo lộ trình sẽ xong sau ngày thi khoảng ${lateWeeks} tuần — nên dời ngày thi, hoặc hỏi tư vấn viên lớp cấp tốc/kèm 1-1.`);
    } else if (daysBetween(finishDate, input.examDate) < 14) {
      notes.push("Xong khoá sát ngày thi (dưới 2 tuần) — nên đăng ký thi muộn hơn một chút để có thời gian luyện đề.");
    }
  }
  if (!reachesTarget && steps.length) notes.push(`Các khoá hiện có đưa tới band ${cur}, chưa tới mục tiêu ${target}.`);
  if (target - current >= 2) notes.push("Tăng từ 2 band trở lên cần học đều và làm đủ bài tập; thời gian thực tế phụ thuộc kết quả test giữa kỳ.");
  notes.push("Học phí theo giá niêm yết; ưu đãi đăng ký sớm/học nhóm tính khi đăng ký từng khoá.");
  return {
    current,
    target,
    steps,
    reached: cur,
    reachesTarget,
    totalWeeks,
    totalTuition: steps.reduce((s, x) => s + x.tuition, 0),
    finishDate,
    examDate: input.examDate ?? null,
    onTime,
    notes,
  };
}
