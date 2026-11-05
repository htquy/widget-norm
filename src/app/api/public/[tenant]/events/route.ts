import { NextResponse } from "next/server";
import { z } from "zod";
import { CLIENT_EVENTS } from "@/domain/events";
import { errorResponse, rateLimit } from "@/infrastructure/http";
import { resolve, visitorIdSchema } from "../../_shared";

const body = z.object({
  visitorId: visitorIdSchema,
  type: z.enum(CLIENT_EVENTS),
  conversationId: z.string().uuid().nullable().optional(),
  refId: z.string().uuid().nullable().optional(),
});

export async function POST(req: Request, ctx: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant: slug } = await ctx.params;
    const input = body.parse(await req.json());
    if (!rateLimit(`ev:${slug}:${input.visitorId}`, 120, 10 * 60_000)) return NextResponse.json({ ok: false }, { status: 429 });
    const { c, tenant } = await resolve(slug);
    await c.analytics.track({ tenantId: tenant.id, visitorId: input.visitorId, type: input.type, conversationId: input.conversationId, refId: input.refId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
