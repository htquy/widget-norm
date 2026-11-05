import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, rateLimit } from "@/infrastructure/http";
import { ownConversation, visitorIdSchema } from "../../_shared";

/** 👍/👎 cho một câu trả lời, hoặc đánh giá 1–5 sao cho cả cuộc chat */
const body = z.union([
  z.object({ visitorId: visitorIdSchema, conversationId: z.string().uuid(), entryId: z.string().uuid(), value: z.union([z.literal(1), z.literal(-1)]) }),
  z.object({ visitorId: visitorIdSchema, conversationId: z.string().uuid(), rating: z.number().int().min(1).max(5) }),
]);

export async function POST(req: Request, ctx: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant: slug } = await ctx.params;
    const input = body.parse(await req.json());
    if (!rateLimit(`fb:${slug}:${input.visitorId}`, 60, 10 * 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
    const own = await ownConversation(slug, input.visitorId, input.conversationId);
    if (!own) return NextResponse.json({ error: "Không tìm thấy hội thoại" }, { status: 404 });
    if ("rating" in input) await own.c.support.rate(own.tenant.id, input.conversationId, input.rating);
    else await own.c.support.feedback(own.tenant.id, input.conversationId, input.entryId, input.value);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
