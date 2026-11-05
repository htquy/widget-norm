import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, rateLimit } from "@/infrastructure/http";
import { ownConversation, resolve, visitorIdSchema } from "../../_shared";

/** GET ?view=services | days&serviceId= | slots&serviceId=&date= */
export async function GET(req: Request, ctx: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant: slug } = await ctx.params;
    const url = new URL(req.url);
    const { c, tenant } = await resolve(slug);
    if (!tenant.settings.booking.enabled) return NextResponse.json({ error: "Cửa hàng chưa mở đặt lịch online" }, { status: 400 });
    const view = url.searchParams.get("view");
    const serviceId = url.searchParams.get("serviceId") ?? "";
    if (view === "services") {
      const list = await c.services.list(tenant.id, true);
      return NextResponse.json({ services: list.map((s) => ({ id: s.id, name: s.name, durationMin: s.durationMin, price: s.price, description: s.description })) });
    }
    if (view === "days") return NextResponse.json({ days: await c.bookings.availableDays(tenant, serviceId, 14) });
    if (view === "slots") {
      const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(url.searchParams.get("date"));
      return NextResponse.json({ slots: await c.bookings.slots(tenant, serviceId, date) });
    }
    return NextResponse.json({ error: "view không hợp lệ" }, { status: 400 });
  } catch (e) {
    return errorResponse(e);
  }
}

const body = z.object({
  visitorId: visitorIdSchema,
  conversationId: z.string().uuid().nullable().optional(),
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().min(1).max(80),
  phone: z.string().min(9).max(20),
  note: z.string().max(500).default(""),
});

export async function POST(req: Request, ctx: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant: slug } = await ctx.params;
    const input = body.parse(await req.json());
    if (!rateLimit(`booking:${slug}:${input.visitorId}`, 5, 60 * 60_000)) {
      return NextResponse.json({ error: "Bạn đã đặt nhiều lịch, vui lòng liên hệ hotline nếu cần thêm." }, { status: 429 });
    }
    const conversationId = input.conversationId && (await ownConversation(slug, input.visitorId, input.conversationId)) ? input.conversationId : null;
    const { c, tenant } = await resolve(slug);
    const b = await c.bookings.create({ tenant, visitorId: input.visitorId, conversationId, serviceId: input.serviceId, date: input.date, time: input.time, name: input.name, phone: input.phone, note: input.note });
    return NextResponse.json({ ok: true, booking: { id: b.id, startAt: b.startAt.toISOString(), status: b.status } });
  } catch (e) {
    return errorResponse(e);
  }
}
