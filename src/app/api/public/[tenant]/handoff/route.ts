import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, rateLimit } from "@/infrastructure/http";
import { ownConversation, visitorIdSchema } from "../../_shared";

/** Khách để lại SĐT để nhân viên gọi lại (thẻ "Gặp nhân viên") */
const body = z.object({
  visitorId: visitorIdSchema,
  conversationId: z.string().uuid(),
  name: z.string().min(1).max(80),
  phone: z.string().min(9).max(20),
  note: z.string().max(1000).default(""),
});

export async function POST(req: Request, ctx: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant: slug } = await ctx.params;
    const input = body.parse(await req.json());
    if (!rateLimit(`handoff:${slug}:${input.visitorId}`, 5, 60 * 60_000)) {
      return NextResponse.json({ error: "Bạn đã gửi yêu cầu rồi, nhân viên sẽ liên hệ sớm ạ." }, { status: 429 });
    }
    const own = await ownConversation(slug, input.visitorId, input.conversationId);
    if (!own) return NextResponse.json({ error: "Không tìm thấy hội thoại" }, { status: 404 });
    await own.c.support.requestCallback({ tenant: own.tenant, visitorId: input.visitorId, conversationId: input.conversationId, name: input.name, phone: input.phone, note: input.note });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
