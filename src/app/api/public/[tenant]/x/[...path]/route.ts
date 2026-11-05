import { NextResponse } from "next/server";
import { errorResponse, rateLimit } from "@/infrastructure/http";
import { ownConversation, resolve } from "../../../_shared";

/** API công khai riêng của module bot: /api/public/[tenant]/x/<path> (vd bot gạch: catalog, quote, lead) */
async function handle(req: Request, ctx: { params: Promise<{ tenant: string; path: string[] }> }) {
  try {
    const { tenant: slug, path } = await ctx.params;
    const { c, tenant } = await resolve(slug);
    const mod = c.moduleOf(tenant);
    if (!mod.handlePublic) return NextResponse.json({ error: "Không tìm thấy" }, { status: 404 });
    return await mod.handlePublic({
      tenant,
      path,
      req,
      rateLimit,
      ownConversation: async (visitorId, conversationId) => (conversationId && (await ownConversation(slug, visitorId, conversationId)) ? conversationId : null),
      captureLead: async (input) => c.leads.capture({ tenant, ...input, source: "form", variant: await mod.variantFor(tenant, input.visitorId) }),
      trackEvent: (e) => c.analytics.track({ tenantId: tenant.id, ...e }),
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export const GET = handle;
export const POST = handle;
