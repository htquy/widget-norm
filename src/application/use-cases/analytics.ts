import { FUNNEL, type EventType } from "@/domain/events";
import type { BookingRepository, DateRange, EventRepository, LeadRepository, ProductRepository } from "../ports";

export interface Dashboard {
  range: { from: string; to: string };
  kpis: {
    visitors: number;
    conversations: number;
    leads: number;
    bookings: number;
    handoffs: number;
    won: number;
    revenue: number;
    leadRate: number;
  };
  daily: { day: string; visitors: number; conversations: number; leads: number; bookings: number }[];
  funnel: { label: string; visitors: number }[];
  topProducts: { id: string; name: string; visitors: number }[];
  leadStatus: { status: string; count: number }[];
  bookingStatus: { status: string; count: number }[];
}

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function makeAnalytics(deps: { events: EventRepository; leads: LeadRepository; bookings: BookingRepository; products: ProductRepository }) {
  return {
    track: deps.events.record.bind(deps.events),

    async dashboard(tenantId: string, range: DateRange): Promise<Dashboard> {
      const [byType, daily, top, leads, bookings] = await Promise.all([
        deps.events.visitorsByType(tenantId, range),
        deps.events.daily(tenantId, range),
        deps.events.topRefs(tenantId, "product_clicked", range, 8),
        deps.leads.list(tenantId, { range }),
        deps.bookings.list(tenantId, { range: { from: range.from, to: new Date(range.to.getTime() + 60 * 86_400_000) } }),
      ]);
      const total = (type: EventType) => byType.find((r) => r.type === type)?.visitors ?? 0;
      const opened = total("widget_open");
      const won = leads.filter((l) => l.status === "won");
      const days: string[] = [];
      for (let d = new Date(range.from); d <= range.to; d = new Date(d.getTime() + 86_400_000)) days.push(dayKey(d));
      const at = (day: string, type: EventType) => daily.find((r) => r.day === day && r.type === type)?.visitors ?? 0;
      const names = new Map((await deps.products.findManyByIds(tenantId, top.map((t) => t.refId))).map((p) => [p.id, p.name]));
      const createdInRange = bookings.filter((b) => b.createdAt >= range.from && b.createdAt <= range.to);
      return {
        range: { from: dayKey(range.from), to: dayKey(range.to) },
        kpis: {
          visitors: opened,
          conversations: total("message_sent"),
          leads: leads.length,
          bookings: createdInRange.length,
          handoffs: total("handoff_requested"),
          won: won.length,
          revenue: won.reduce((a, l) => a + (l.wonValue ?? 0), 0),
          leadRate: opened ? leads.length / opened : 0,
        },
        daily: days.map((day) => ({ day, visitors: at(day, "widget_open"), conversations: at(day, "message_sent"), leads: at(day, "lead_created"), bookings: at(day, "booking_created") })),
        funnel: FUNNEL.map((f) => ({ label: f.label, visitors: total(f.type) })),
        topProducts: top.map((t) => ({ id: t.refId, name: names.get(t.refId) ?? "(đã xoá)", visitors: t.visitors })),
        leadStatus: ["new", "contacted", "qualified", "won", "lost"].map((status) => ({ status, count: leads.filter((l) => l.status === status).length })),
        bookingStatus: ["pending", "confirmed", "done", "cancelled", "no_show"].map((status) => ({ status, count: createdInRange.filter((b) => b.status === status).length })),
      };
    },
  };
}

export type Analytics = ReturnType<typeof makeAnalytics>;
