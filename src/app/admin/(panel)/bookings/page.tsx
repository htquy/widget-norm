import Link from "next/link";
import { BOOKING_STATUSES, BOOKING_STATUS_LABELS, addDays, atLocal, localDate, type BookingStatus } from "@/domain/booking";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { BOOKING_TONE, Badge, Empty, PageHeader, btnSecondary, fieldCls, fmtDay, fmtTime } from "@/components/admin/ui";
import { setBookingStatusAction } from "../../actions";

/** Thao tác nhanh theo trạng thái hiện tại */
const NEXT: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["done", "no_show", "cancelled"],
  done: [],
  cancelled: ["confirmed"],
  no_show: ["done"],
};
const ACTION_TEXT: Record<BookingStatus, string> = { pending: "Chờ", confirmed: "Xác nhận", done: "Đã phục vụ", cancelled: "Huỷ", no_show: "Không đến" };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<{ from?: string; days?: string; status?: string }> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const today = localDate(new Date());
  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? sp.from! : today;
  const span = [7, 14, 30].includes(Number(sp.days)) ? Number(sp.days) : 14;
  const status = (BOOKING_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as BookingStatus) : undefined;
  const c = await app();
  const [bookings, services] = await Promise.all([
    c.bookings.list(s.tenantId, { range: { from: atLocal(from, "00:00"), to: atLocal(addDays(from, span), "00:00") }, status }),
    c.services.list(s.tenantId),
  ]);
  const svc = new Map(services.map((x) => [x.id, x]));
  const byDay = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const d = localDate(b.startAt);
    byDay.set(d, [...(byDay.get(d) ?? []), b]);
  }
  const nav = (f: string) => `/admin/bookings?from=${f}&days=${span}${status ? `&status=${status}` : ""}`;

  return (
    <>
      <PageHeader
        title="Lịch hẹn"
        subtitle={`${bookings.length} lịch từ ${from} trong ${span} ngày`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={nav(addDays(from, -span))} className={btnSecondary} aria-label="Khoảng trước">
              ←
            </Link>
            <Link href={nav(today)} className={btnSecondary}>
              Hôm nay
            </Link>
            <Link href={nav(addDays(from, span))} className={btnSecondary} aria-label="Khoảng sau">
              →
            </Link>
            <a href={`/admin/export/bookings?from=${from}&days=${span}`} className={btnSecondary}>
              Xuất CSV
            </a>
          </div>
        }
      />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        <input type="hidden" name="from" value={from} />
        <label className="text-[13px]">
          <span className="mb-1 block text-[var(--fg-muted)]">Trạng thái</span>
          <select name="status" defaultValue={status ?? ""} className={`${fieldCls} w-auto`}>
            <option value="">Tất cả</option>
            {BOOKING_STATUSES.map((st) => (
              <option key={st} value={st}>
                {BOOKING_STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-[13px]">
          <span className="mb-1 block text-[var(--fg-muted)]">Số ngày</span>
          <select name="days" defaultValue={span} className={`${fieldCls} w-auto`}>
            {[7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d} ngày
              </option>
            ))}
          </select>
        </label>
        <button className={btnSecondary}>Lọc</button>
        <Link href="/admin/services" className="ml-auto self-center text-[13px] underline">
          Quản lý dịch vụ đặt lịch
        </Link>
      </form>

      {bookings.length === 0 ? (
        <Empty>Không có lịch hẹn nào trong khoảng này.</Empty>
      ) : (
        <div className="space-y-4">
          {[...byDay.entries()].map(([day, list]) => (
            <section key={day} className="overflow-hidden rounded-xl border border-[var(--border)] bg-white">
              <h2 className="border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 text-[14px] font-semibold capitalize">
                {fmtDay(atLocal(day, "12:00"))} {day === today && <Badge tone="blue">Hôm nay</Badge>}
              </h2>
              <ul className="divide-y divide-[var(--border)]">
                {list.map((b) => (
                  <li key={b.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="w-28 shrink-0 text-[15px] font-semibold tabular-nums">
                      {fmtTime(b.startAt)}–{fmtTime(b.endAt)}
                    </div>
                    <div className="min-w-0 flex-1 text-[14px]">
                      <p className="font-medium">
                        {b.name} ·{" "}
                        <a href={`tel:${b.phone}`} className="tabular-nums underline">
                          {b.phone}
                        </a>
                      </p>
                      <p className="text-[13px] text-[var(--fg-muted)]">
                        {svc.get(b.serviceId)?.name ?? "(dịch vụ đã xoá)"}
                        {b.note && ` · ${b.note}`}
                        {b.conversationId && !b.conversationId.startsWith("demo-") && (
                          <>
                            {" · "}
                            <Link href={`/admin/conversations/${b.conversationId}`} className="underline">
                              xem chat
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <Badge tone={BOOKING_TONE[b.status]}>{BOOKING_STATUS_LABELS[b.status]}</Badge>
                    <div className="flex flex-wrap gap-1.5">
                      {NEXT[b.status].map((st) => (
                        <form key={st} action={setBookingStatusAction}>
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="status" value={st} />
                          <button className={`min-h-9 rounded-lg border px-3 text-[13px] font-medium ${st === "confirmed" || st === "done" ? "border-transparent bg-[var(--fg)] text-white" : "border-[var(--border)] hover:bg-[var(--surface-2)]"}`}>
                            {ACTION_TEXT[st]}
                          </button>
                        </form>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
