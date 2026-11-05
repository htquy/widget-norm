import { NextResponse } from "next/server";
import { publicEntry } from "@/domain/conversation";
import { errorResponse, rateLimit } from "@/infrastructure/http";
import { ownConversation, visitorIdSchema } from "../../_shared";

/** Widget hỏi tin mới (tin nhân viên, thông báo hệ thống) khi đang chờ / đang chat với nhân viên. */
export async function GET(req: Request, ctx: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant: slug } = await ctx.params;
    const url = new URL(req.url);
    const visitorId = visitorIdSchema.parse(url.searchParams.get("visitorId"));
    const conversationId = url.searchParams.get("conversationId") ?? "";
    if (!rateLimit(`poll:${slug}:${visitorId}`, 400, 10 * 60_000)) return NextResponse.json({ entries: [], mode: "bot" }, { status: 429 });
    const own = await ownConversation(slug, visitorId, conversationId);
    if (!own) return NextResponse.json({ error: "Không tìm thấy hội thoại" }, { status: 404 });
    const res = await own.c.support.since(own.tenant.id, conversationId, url.searchParams.get("after"));
    return NextResponse.json({ entries: res.entries.map(publicEntry), mode: res.mode });
  } catch (e) {
    return errorResponse(e);
  }
}
