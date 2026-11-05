import {
  BOOKING_STATUS_LABELS,
  addDays,
  atLocal,
  computeSlots,
  localDate,
  localTime,
  type Booking,
  type BookingStatus,
  type Slot,
} from "@/domain/booking";
import { newEntry } from "@/domain/conversation";
import { DomainError } from "@/domain/errors";
import { normalizeVnPhone } from "@/domain/lead";
import { formatVnd } from "@/domain/text";
import type { Tenant } from "@/domain/tenant";
import { withLock } from "../locks";
import type { BookingRepository, ConversationRepository, DateRange, EventRepository, LeadRepository, Notifier, ServiceRepository } from "../ports";

export function makeBookings(deps: {
  bookings: BookingRepository;
  services: ServiceRepository;
  leads: LeadRepository;
  events: EventRepository;
  conversations: ConversationRepository;
  notifier: Notifier;
  now?: () => Date;
}) {
  const now = () => deps.now?.() ?? new Date();

  async function slotsFor(tenant: Tenant, serviceId: string, date: string): Promise<Slot[]> {
    const service = await deps.services.findById(tenant.id, serviceId);
    if (!service || !service.active) throw new DomainError("SERVICE_NOT_FOUND", "Dịch vụ không tồn tại");
    const from = atLocal(date, "00:00");
    const existing = await deps.bookings.overlapping(tenant.id, from, new Date(from.getTime() + 86_400_000));
    return computeSlots({ date, hours: tenant.settings.hours, settings: tenant.settings.booking, durationMin: service.durationMin, existing, now: now() });
  }

  return {
    slots: slotsFor,

    /** Các ngày sắp tới còn ít nhất 1 khung trống (tối đa `days` ngày) — widget hiển thị dải ngày */
    async availableDays(tenant: Tenant, serviceId: string, days = 14): Promise<{ date: string; slots: number }[]> {
      const start = localDate(now());
      const out: { date: string; slots: number }[] = [];
      for (let i = 0; i < Math.min(days, tenant.settings.booking.maxDaysAhead + 1); i++) {
        const date = addDays(start, i);
        out.push({ date, slots: (await slotsFor(tenant, serviceId, date)).length });
      }
      return out;
    },

    async create(input: {
      tenant: Tenant;
      visitorId: string;
      conversationId: string | null;
      serviceId: string;
      date: string;
      time: string;
      name: string;
      phone: string;
      note: string;
    }): Promise<Booking> {
      const { tenant } = input;
      if (!tenant.settings.booking.enabled) throw new DomainError("BOOKING_DISABLED", "Cửa hàng chưa mở đặt lịch online");
      const phone = normalizeVnPhone(input.phone);
      const name = input.name.trim().slice(0, 80);
      if (!name) throw new DomainError("NO_NAME", "Vui lòng nhập tên");
      const service = await deps.services.findById(tenant.id, input.serviceId);
      if (!service || !service.active) throw new DomainError("SERVICE_NOT_FOUND", "Dịch vụ không tồn tại");

      // Khoá theo shop để 2 khách không cùng giữ chỗ cuối cùng của một khung giờ
      const booking = await withLock(`booking:${tenant.id}`, async () => {
        const slots = await slotsFor(tenant, input.serviceId, input.date);
        if (!slots.some((s) => s.time === input.time)) throw new DomainError("SLOT_TAKEN", "Khung giờ này vừa hết chỗ hoặc không hợp lệ, vui lòng chọn giờ khác");
        const startAt = atLocal(input.date, input.time);
        return deps.bookings.create({
          tenantId: tenant.id,
          serviceId: service.id,
          conversationId: input.conversationId,
          name,
          phone,
          note: input.note.trim().slice(0, 500),
          startAt,
          endAt: new Date(startAt.getTime() + service.durationMin * 60_000),
          status: tenant.settings.booking.requireConfirm ? "pending" : "confirmed",
        });
      });

      const when = `${localTime(booking.startAt)} ngày ${booking.startAt.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}`;
      await deps.leads.create({
        tenantId: tenant.id,
        conversationId: input.conversationId,
        name,
        phone,
        email: "",
        note: `Đặt lịch ${service.name} lúc ${when}${booking.note ? ` — ${booking.note}` : ""}`,
        source: "booking",
        status: "new",
        wonValue: null,
        meta: { serviceId: service.id },
      });
      await deps.events.record({ tenantId: tenant.id, visitorId: input.visitorId, type: "booking_created", conversationId: input.conversationId, refId: service.id, value: service.price || null });

      if (input.conversationId) {
        const conv = await deps.conversations.findById(tenant.id, input.conversationId);
        if (conv) {
          conv.transcript = [...conv.transcript, newEntry({ role: "system", internal: true, text: `Khách đã đặt lịch ${service.name} lúc ${when} (${BOOKING_STATUS_LABELS[booking.status]}).` })];
          conv.updatedAt = new Date();
          await deps.conversations.save(conv);
        }
      }

      const text = [`Lịch hẹn mới — ${tenant.settings.shopName}`, `${name} — ${phone}`, `${service.name}${service.price ? ` (${formatVnd(service.price)})` : ""} lúc ${when}`, booking.note && `Ghi chú: ${booking.note}`]
        .filter(Boolean)
        .join("\n");
      deps.notifier.notify(tenant, "booking", text, { booking, service: { id: service.id, name: service.name } }).catch((e) => console.error("notify failed", e));
      return booking;
    },

    list: (tenantId: string, filter: { range?: DateRange; status?: BookingStatus }) => deps.bookings.list(tenantId, filter),
    get: (tenantId: string, id: string) => deps.bookings.findById(tenantId, id),
    setStatus: (tenantId: string, id: string, status: BookingStatus) => deps.bookings.updateStatus(tenantId, id, status),
  };
}

export type Bookings = ReturnType<typeof makeBookings>;
