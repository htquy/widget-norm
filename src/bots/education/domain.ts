import { z } from "zod";
import { DomainError } from "@/domain/errors";

/** Một đợt khai giảng của khoá học */
export const intakeSchema = z.object({
  id: z.string().min(1).max(40),
  /** YYYY-MM-DD */
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** "T2-T4-T6 18:30-20:30" */
  schedule: z.string().trim().max(80),
  mode: z.enum(["offline", "online"]),
  branch: z.string().trim().max(80).default(""),
  seatsLeft: z.number().int().min(0).max(500),
});
export type Intake = z.infer<typeof intakeSchema>;

/** Ưu đãi — mỗi lần tính học phí chỉ áp MỘT ưu đãi có lợi nhất (không cộng dồn) */
export const promoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("early_bird"), label: z.string().trim().min(1).max(60), percent: z.number().min(1).max(60), until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ kind: z.literal("group"), label: z.string().trim().min(1).max(60), percent: z.number().min(1).max(60), minPeople: z.number().int().min(2).max(50) }),
]);
export type Promo = z.infer<typeof promoSchema>;

export interface Course {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  category: string;
  /** Trình độ đầu vào → đầu ra, ví dụ "Mất gốc → 4.5" */
  level: string;
  /** Đối tượng: trẻ em, sinh viên, người đi làm… */
  audience: string;
  durationWeeks: number;
  sessionsPerWeek: number;
  /** Học phí cả khoá (VND) */
  tuition: number;
  description: string;
  /** Cam kết đầu ra / kết quả */
  outcomes: string;
  active: boolean;
  intakes: Intake[];
  promos: Promo[];
  createdAt: Date;
}

export type NewCourse = Omit<Course, "id" | "createdAt">;

const ceilSafe = (n: number) => Math.ceil(n - 1e-9);

/** Các đợt còn chỗ và chưa khai giảng quá lâu (cho phép vào muộn tối đa lateDays), sớm nhất trước */
export function openIntakes(course: Pick<Course, "intakes">, today: string, lateDays = 7): Intake[] {
  const limit = new Date(`${today}T00:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() - lateDays);
  const min = limit.toISOString().slice(0, 10);
  return course.intakes.filter((i) => i.seatsLeft > 0 && i.startDate >= min).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export interface TuitionQuote {
  listPrice: number;
  people: number;
  discountPercent: number;
  discountLabel: string | null;
  discount: number;
  /** Học phí mỗi người sau ưu đãi */
  perPerson: number;
  total: number;
  installments: number | null;
  perInstallment: number | null;
  notes: string[];
}

/** Tính học phí: chọn ưu đãi tốt nhất đủ điều kiện, chia kỳ không lãi suất. Thuần tính toán — bot không tự nhẩm. */
export function calculateTuition(course: Pick<Course, "tuition" | "promos">, opts: { people?: number; today: string; installments?: number }): TuitionQuote {
  const people = opts.people ?? 1;
  if (!Number.isInteger(people) || people < 1 || people > 50) throw new DomainError("BAD_PEOPLE", "Số học viên phải từ 1 đến 50");
  if (!(course.tuition > 0)) throw new DomainError("NO_PRICE", "Khoá học chưa có học phí để tính");
  if (opts.installments !== undefined && (!Number.isInteger(opts.installments) || opts.installments < 2 || opts.installments > 12)) throw new DomainError("BAD_INSTALLMENTS", "Chia kỳ từ 2 đến 12 tháng");

  const notes: string[] = [];
  let best: { percent: number; label: string } | null = null;
  for (const p of course.promos) {
    const eligible = p.kind === "early_bird" ? opts.today <= p.until : people >= p.minPeople;
    if (eligible && (!best || p.percent > best.percent)) best = { percent: p.percent, label: p.label };
    if (!eligible && p.kind === "early_bird" && opts.today > p.until) notes.push(`Ưu đãi "${p.label}" đã hết hạn`);
    if (!eligible && p.kind === "group") notes.push(`Đăng ký từ ${p.minPeople} người được "${p.label}" giảm ${p.percent}%`);
  }
  const percent = best?.percent ?? 0;
  const perPerson = Math.round((course.tuition * (100 - percent)) / 100);
  const total = perPerson * people;
  const discount = course.tuition * people - total;
  if (best) notes.push("Chỉ áp dụng một ưu đãi có lợi nhất, không cộng dồn");
  return {
    listPrice: course.tuition,
    people,
    discountPercent: percent,
    discountLabel: best?.label ?? null,
    discount,
    perPerson,
    total,
    installments: opts.installments ?? null,
    perInstallment: opts.installments ? ceilSafe(total / opts.installments) : null,
    notes,
  };
}

/** Form admin: mỗi dòng "2026-12-01|T2-T4-T6 18:30-20:30|offline|Quận 1|12" */
export function parseIntakes(text: string): Intake[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => {
      const [startDate, schedule, mode, branch, seats] = l.split("|").map((x) => x.trim());
      const parsed = intakeSchema.safeParse({ id: `k${i + 1}`, startDate, schedule: schedule ?? "", mode: mode || "offline", branch: branch ?? "", seatsLeft: Number(seats ?? 0) });
      if (!parsed.success) throw new DomainError("BAD_INTAKE", `Lớp khai giảng sai định dạng: "${l}" (đúng: 2026-12-01|T2-T4-T6 18:30|offline|Quận 1|12)`);
      return parsed.data;
    });
}

/** Form admin: "early|Đăng ký sớm|10|2026-12-31" hoặc "group|Học nhóm|10|3" */
export function parsePromos(text: string): Promo[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [type, label, percent, extra] = l.split("|").map((x) => x.trim());
      const raw = type === "early" ? { kind: "early_bird", label, percent: Number(percent), until: extra } : type === "group" ? { kind: "group", label, percent: Number(percent), minPeople: Number(extra) } : null;
      const parsed = raw && promoSchema.safeParse(raw);
      if (!parsed || !parsed.success) throw new DomainError("BAD_PROMO", `Ưu đãi sai định dạng: "${l}" (đúng: early|Đăng ký sớm|10|2026-12-31 hoặc group|Học nhóm|10|3)`);
      return parsed.data;
    });
}

export const intakesToText = (list: Intake[]) => list.map((i) => `${i.startDate}|${i.schedule}|${i.mode}|${i.branch}|${i.seatsLeft}`).join("\n");
export const promosToText = (list: Promo[]) => list.map((p) => (p.kind === "early_bird" ? `early|${p.label}|${p.percent}|${p.until}` : `group|${p.label}|${p.percent}|${p.minPeople}`)).join("\n");
