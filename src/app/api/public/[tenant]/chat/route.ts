import { NextResponse } from "next/server";
import { z } from "zod";
import { publicEntry } from "@/domain/conversation";
import { errorResponse, rateLimit } from "@/infrastructure/http";
import { resolve, visitorIdSchema } from "../../_shared";

const body = z.object({ visitorId: visitorIdSchema, text: z.string().min(1).max(2000) });

export async function POST(req: Request, ctx: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant: slug } = await ctx.params;
    const input = body.parse(await req.json());
    if (!input.text.trim()) return NextResponse.json({ error: "Tin nhắn trống" }, { status: 400 });
    if (!rateLimit(`chat:${slug}:${input.visitorId}`, 30, 10 * 60_000)) {
      return NextResponse.json({ error: "Bạn nhắn hơi nhanh, chờ một chút rồi thử lại nhé." }, { status: 429 });
    }
    const { c, tenant } = await resolve(slug);
    const res = await c.chat.handleMessage({ tenant, visitorId: input.visitorId, channel: "web", text: input.text });
    return NextResponse.json({ ...res, reply: res.reply ? publicEntry(res.reply) : null });
  } catch (e) {
    return errorResponse(e);
  }
}
