import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, rateLimit } from "@/infrastructure/http";
import { ownConversation, resolve, visitorIdSchema } from "../../_shared";

const body = z.object({
  visitorId: visitorIdSchema,
  conversationId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(80),
  phone: z.string().min(9).max(20),
  email: z.string().max(120).default(""),
  note: z.string().max(1000).default(""),
});

export async function POST(req: Request, ctx: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant: slug } = await ctx.params;
    const input = body.parse(await req.json());
    if (!rateLimit(`lead:${slug}:${input.visitorId}`, 5, 60 * 60_000)) {
      return NextResponse.json({ error: "Bạn đã gửi thông tin rồi, nhân viên sẽ liên hệ sớm ạ." }, { status: 429 });
    }
    const conversationId = input.conversationId && (await ownConversation(slug, input.visitorId, input.conversationId)) ? input.conversationId : null;
    const { c, tenant } = await resolve(slug);
    const lead = await c.leads.capture({ tenant, visitorId: input.visitorId, conversationId, name: input.name, phone: input.phone, email: input.email, note: input.note, source: "form" });
    return NextResponse.json({ ok: true, leadId: lead.id });
  } catch (e) {
    return errorResponse(e);
  }
}
