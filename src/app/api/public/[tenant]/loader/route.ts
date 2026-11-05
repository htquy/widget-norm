import { NextResponse } from "next/server";
import { errorResponse } from "@/infrastructure/http";
import { resolve } from "../../_shared";

const CORS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60" };

/** Cấu hình nút chat cho widget.js (gọi từ web của shop, trước khi mở iframe) — đổi giao diện ở admin là áp dụng ngay. */
export async function GET(req: Request, ctx: { params: Promise<{ tenant: string }> }) {
  try {
    const { tenant: slug } = await ctx.params;
    const { c, tenant } = await resolve(slug);
    const origin = new URL(req.url).searchParams.get("origin");
    if (!c.tenants.isOriginAllowed(tenant, origin)) return NextResponse.json({ allowed: false }, { headers: CORS });
    const t = tenant.settings.theme;
    return NextResponse.json(
      {
        allowed: true,
        primaryColor: t.primaryColor,
        onPrimary: t.onPrimary,
        position: t.position,
        launcherStyle: t.launcherStyle,
        launcherLabel: t.launcherLabel,
        radius: t.radius,
        autoOpenSeconds: t.autoOpenSeconds,
        proactiveMessage: t.proactiveMessage,
        offsetX: t.offsetX,
        offsetY: t.offsetY,
        title: `Chat với ${tenant.settings.shopName}`,
      },
      { headers: CORS },
    );
  } catch (e) {
    return errorResponse(e, CORS);
  }
}
