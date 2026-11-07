import { NextResponse } from "next/server";
import { z } from "zod";
import { inspectGlb } from "@/bots/furniture/model3d";
import { trellisFromEnv } from "@/bots/furniture/trellis";
import { DomainError } from "@/domain/errors";
import { getSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { errorResponse } from "@/infrastructure/http";

/** Tạo 3D nháp từ ảnh sản phẩm bằng AI (máy chủ GPU riêng). Chỉ chủ bot nội thất. */
async function ctx() {
  const session = await getSession();
  if (!session) throw new DomainError("UNAUTHORIZED", "Chưa đăng nhập");
  const c = await app();
  const tenant = await c.tenants.byId(session.tenantId);
  if (!tenant || tenant.kind !== "furniture") throw new DomainError("WRONG_KIND", "Chatbot này không phải bot nội thất");
  return { c, tenant };
}

const idOf = (v: unknown) => z.string().uuid().parse(v);

/** GET ?id= → trạng thái; nếu AI xong thì tải .glb về kho và chuyển sang "review" (chờ duyệt). */
export async function GET(req: Request) {
  try {
    const { c, tenant } = await ctx();
    const id = idOf(new URL(req.url).searchParams.get("id"));
    const item = await c.furnitureCatalog.get(tenant.id, id);
    if (!item) throw new DomainError("NOT_FOUND", "Không tìm thấy sản phẩm");
    const gen = trellisFromEnv();
    const enabled = !!gen;
    if (item.modelStatus !== "pending" || !item.modelJob || !gen) return NextResponse.json({ enabled, status: item.modelStatus, modelUrl: item.modelUrl });
    const state = await gen.poll(item.modelJob);
    if (state.status === "pending") return NextResponse.json({ enabled, status: "pending" });
    if (state.status === "failed") {
      await c.furnitureCatalog.update(tenant.id, id, { modelStatus: "failed", modelJob: "" });
      return NextResponse.json({ enabled, status: "failed", error: state.error });
    }
    const report = await inspectGlb(state.glb!, { widthCm: item.widthCm, depthCm: item.depthCm, heightCm: item.heightCm });
    const key = `${tenant.id}/furniture-models/${item.sku.replace(/[^A-Za-z0-9_-]/g, "_")}-ai-${Date.now()}.glb`;
    const url = await c.files.put(key, state.glb!, "model/gltf-binary");
    await c.furnitureCatalog.update(tenant.id, id, { modelUrl: url, modelStatus: "review", modelJob: "" });
    return NextResponse.json({ enabled, status: "review", modelUrl: url, report });
  } catch (e) {
    return errorResponse(e);
  }
}

/** POST { itemId } → gửi ảnh tách nền (hoặc ảnh sản phẩm) cho AI */
export async function POST(req: Request) {
  try {
    const { c, tenant } = await ctx();
    const gen = trellisFromEnv();
    if (!gen) throw new DomainError("NO_TRELLIS", "Chưa cấu hình máy chủ tạo 3D (TRELLIS_API_URL). Xem docs/PLAN-FURNITURE-3D.md");
    const id = idOf(((await req.json()) as { itemId?: unknown }).itemId);
    const item = await c.furnitureCatalog.get(tenant.id, id);
    if (!item) throw new DomainError("NOT_FOUND", "Không tìm thấy sản phẩm");
    const src = item.cutoutUrl || item.imageUrl;
    const m = src.match(/^\/api\/files\/(.+)$/);
    if (!m) throw new DomainError("NO_IMAGE", "Cần ảnh sản phẩm hoặc ảnh tách nền đã tải lên trước khi tạo 3D");
    const file = await c.files.get(m[1].split("/").map(decodeURIComponent).join("/"));
    if (!file) throw new DomainError("NO_IMAGE", "Không đọc được ảnh sản phẩm");
    const { jobId } = await gen.start(file.bytes, file.contentType);
    await c.furnitureCatalog.update(tenant.id, id, { modelStatus: "pending", modelJob: jobId });
    return NextResponse.json({ status: "pending" });
  } catch (e) {
    return errorResponse(e);
  }
}
