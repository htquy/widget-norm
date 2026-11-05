import { DomainError } from "./errors";

export const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Mới",
  contacted: "Đã liên hệ",
  qualified: "Có nhu cầu rõ",
  won: "Chốt đơn",
  lost: "Không mua",
};

export const LEAD_SOURCES = ["form", "handoff", "booking"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = { form: "Để lại liên hệ", handoff: "Yêu cầu nhân viên", booking: "Đặt lịch" };

export interface Lead {
  id: string;
  tenantId: string;
  conversationId: string | null;
  name: string;
  phone: string;
  email: string;
  note: string;
  source: LeadSource;
  status: LeadStatus;
  /** Giá trị đơn khi chốt (VND) */
  wonValue: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Chuẩn hoá SĐT di động VN về dạng 0xxxxxxxxx; ném lỗi nếu không hợp lệ. */
export function normalizeVnPhone(raw: string): string {
  const digits = raw.replace(/[\s.\-()]/g, "");
  let local = digits;
  if (digits.startsWith("+84")) local = "0" + digits.slice(3);
  else if (digits.startsWith("84") && digits.length === 11) local = "0" + digits.slice(2);
  if (!/^0(3|5|7|8|9)\d{8}$/.test(local)) throw new DomainError("BAD_PHONE", "Số điện thoại chưa đúng (VD: 0912 345 678)");
  return local;
}
