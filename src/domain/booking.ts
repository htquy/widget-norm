import { DomainError } from "./errors";
import { CLOSED_WORD, WEEKDAYS, type ChatLang } from "./chat-text";

/** Giờ Việt Nam cố định UTC+7 (không có giờ mùa hè) → tính khung giờ thuần, không cần thư viện múi giờ. */
export const TZ_OFFSET_MIN = 7 * 60;
export const TIMEZONE = "Asia/Ho_Chi_Minh";

/** 0 = Chủ nhật … 6 = Thứ bảy (giống Date.getDay) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAY_LABELS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"] as const;

export interface DayHours {
  open: string; // "08:00"
  close: string; // "20:00"
}
/** null = nghỉ */
export type WeeklyHours = Record<Weekday, DayHours | null>;

export const defaultHours = (): WeeklyHours => ({
  0: { open: "09:00", close: "17:00" },
  1: { open: "08:00", close: "20:00" },
  2: { open: "08:00", close: "20:00" },
  3: { open: "08:00", close: "20:00" },
  4: { open: "08:00", close: "20:00" },
  5: { open: "08:00", close: "20:00" },
  6: { open: "08:00", close: "20:00" },
});

export interface BookingSettings {
  enabled: boolean;
  /** Bước giữa 2 khung giờ (phút) */
  slotStepMin: number;
  /** Số khách tối đa cùng lúc (số nhân viên/phòng) */
  capacity: number;
  /** Phải đặt trước tối thiểu (phút) */
  minLeadMin: number;
  /** Cho đặt xa nhất (ngày) */
  maxDaysAhead: number;
  /** Ngày nghỉ đặc biệt YYYY-MM-DD */
  closedDates: string[];
  /** true = lịch mới cần shop xác nhận; false = tự xác nhận */
  requireConfirm: boolean;
}

export const defaultBookingSettings = (): BookingSettings => ({
  enabled: true,
  slotStepMin: 30,
  capacity: 2,
  minLeadMin: 60,
  maxDaysAhead: 30,
  closedDates: [],
  requireConfirm: true,
});

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  durationMin: number;
  /** VND; 0 = liên hệ/miễn phí */
  price: number;
  description: string;
  active: boolean;
  createdAt: Date;
}

export const BOOKING_STATUSES = ["pending", "confirmed", "done", "cancelled", "no_show"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  done: "Đã phục vụ",
  cancelled: "Đã huỷ",
  no_show: "Không đến",
};
/** Trạng thái còn giữ chỗ */
export const HOLDING: readonly BookingStatus[] = ["pending", "confirmed"];

export interface Booking {
  id: string;
  tenantId: string;
  serviceId: string;
  conversationId: string | null;
  name: string;
  phone: string;
  note: string;
  startAt: Date;
  endAt: Date;
  status: BookingStatus;
  createdAt: Date;
}

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const toMinutes = (hhmm: string) => {
  const m = HHMM.exec(hhmm);
  if (!m) throw new DomainError("BAD_TIME", `Giờ không hợp lệ: ${hhmm}`);
  return Number(m[1]) * 60 + Number(m[2]);
};
const pad = (n: number) => String(n).padStart(2, "0");
export const fromMinutes = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** Ngày (giờ VN) của một thời điểm, dạng YYYY-MM-DD */
export function localDate(d: Date): string {
  return new Date(d.getTime() + TZ_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}
/** Giờ:phút (giờ VN) của một thời điểm */
export function localTime(d: Date): string {
  return new Date(d.getTime() + TZ_OFFSET_MIN * 60_000).toISOString().slice(11, 16);
}
/** Thời điểm UTC của "ngày + giờ" theo giờ VN */
export function atLocal(date: string, hhmm: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new DomainError("BAD_DATE", "Ngày không hợp lệ");
  return new Date(Date.parse(`${date}T00:00:00Z`) + (toMinutes(hhmm) - TZ_OFFSET_MIN) * 60_000);
}
export function weekdayOf(date: string): Weekday {
  return new Date(`${date}T00:00:00Z`).getUTCDay() as Weekday;
}
export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

export interface Slot {
  time: string; // "09:30"
  startAt: string; // ISO
  remaining: number;
}

/**
 * Các khung giờ còn trống của một ngày cho dịch vụ dài `durationMin`.
 * Một khung hợp lệ khi: nằm trọn trong giờ mở cửa, đủ thời gian đặt trước, và số lịch đang giữ chỗ chồng lấn < capacity.
 */
export function computeSlots(input: {
  date: string;
  hours: WeeklyHours;
  settings: BookingSettings;
  durationMin: number;
  existing: { startAt: Date; endAt: Date; status: BookingStatus }[];
  now: Date;
}): Slot[] {
  const { date, hours, settings, durationMin, now } = input;
  if (!settings.enabled || settings.closedDates.includes(date)) return [];
  const today = localDate(now);
  if (date < today || date > addDays(today, settings.maxDaysAhead)) return [];
  const day = hours[weekdayOf(date)];
  if (!day) return [];
  const open = toMinutes(day.open);
  const close = toMinutes(day.close);
  const step = Math.max(5, settings.slotStepMin);
  const earliest = now.getTime() + settings.minLeadMin * 60_000;
  const holding = input.existing.filter((b) => HOLDING.includes(b.status));
  const out: Slot[] = [];
  for (let m = open; m + durationMin <= close; m += step) {
    const start = atLocal(date, fromMinutes(m));
    if (start.getTime() < earliest) continue;
    const end = new Date(start.getTime() + durationMin * 60_000);
    const overlapping = holding.filter((b) => b.startAt < end && b.endAt > start).length;
    const remaining = settings.capacity - overlapping;
    if (remaining > 0) out.push({ time: fromMinutes(m), startAt: start.toISOString(), remaining });
  }
  return out;
}

/** Shop có đang mở cửa vào thời điểm `now` không (dùng để nói "nhân viên sẽ gọi lại trong giờ làm việc"). */
export function isOpenAt(hours: WeeklyHours, closedDates: string[], now: Date): boolean {
  const date = localDate(now);
  if (closedDates.includes(date)) return false;
  const day = hours[weekdayOf(date)];
  if (!day) return false;
  const t = toMinutes(localTime(now));
  return t >= toMinutes(day.open) && t < toMinutes(day.close);
}

export function describeHours(hours: WeeklyHours, lang: ChatLang = "vi"): string {
  const labels = WEEKDAYS[lang];
  const closed = CLOSED_WORD[lang];
  return (Object.keys(WEEKDAY_LABELS) as unknown as Weekday[])
    .map((i) => Number(i) as Weekday)
    .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
    .map((i) => `${labels[i]}: ${hours[i] ? `${hours[i]!.open}–${hours[i]!.close}` : closed}`)
    .join("; ");
}

export function sanitizeHours(raw: unknown): WeeklyHours {
  const d = defaultHours();
  const r = (raw ?? {}) as Record<string, unknown>;
  const out = {} as WeeklyHours;
  for (let i = 0 as Weekday; i <= 6; i = (i + 1) as Weekday) {
    const v = r[i] as DayHours | null | undefined;
    if (v === null) out[i] = null;
    else if (v && HHMM.test(v.open) && HHMM.test(v.close) && toMinutes(v.open) < toMinutes(v.close)) out[i] = { open: v.open, close: v.close };
    else out[i] = d[i];
    if (i === 6) break;
  }
  return out;
}
