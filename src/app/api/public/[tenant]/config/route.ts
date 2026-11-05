import { NextResponse } from "next/server";
import { publicEntry, visibleToCustomer } from "@/domain/conversation";
import { errorResponse } from "@/infrastructure/http";
import { resolve, visitorIdSchema } from "../../_shared";

export async function GET(req: Request, ctx: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant: slug } = await ctx.params;
    const url = new URL(req.url);
    const visitorId = visitorIdSchema.parse(url.searchParams.get("visitorId"));
    const { c, tenant } = await resolve(slug);
    if (!c.tenants.isOriginAllowed(tenant, url.searchParams.get("origin"))) {
      return NextResponse.json({ error: "Website này chưa được phép nhúng chatbot" }, { status: 403 });
    }
    const conv = await c.chat.start(tenant, visitorId, "web");
    const ids = [...new Set(conv.transcript.flatMap((e) => e.productIds ?? []))];
    const products = await c.catalog.cardsByIds(tenant.id, ids);
    return NextResponse.json({
      config: c.tenants.publicConfig(tenant),
      conversationId: conv.conversationId,
      mode: conv.mode,
      rating: conv.rating,
      transcript: conv.transcript.filter(visibleToCustomer).map(publicEntry),
      products,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
