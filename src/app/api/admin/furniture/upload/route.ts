import { NextResponse } from "next/server";
import { z } from "zod";
import { inspectGlb, MAX_GLB_BYTES } from "@/bots/furniture/model3d";
import { DomainError } from "@/domain/errors";
import { getSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { errorResponse } from "@/infrastructure/http";

/**
 * Tải ảnh/mô hình của một món nội thất lên kho (R2 hoặc đĩa). Dùng route thay vì server action
 * vì file .glb lớn hơn giới hạn 4 MB của server action. Chỉ chủ bot nội thất được gọi.
 *
 * multipart: file, kind = image | cutout | model, sku, (model) widthCm, depthCm, heightCm
 */
const KINDS = {
  image: { types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }, max: 8_000_000, folder: "furniture" },
  cutout: { types: { "image/png": "png", "image/webp": "webp" }, max: 8_000_000, folder: "furniture-cutouts" },
  model: { types: { "model/gltf-binary": "glb", "application/octet-stream": "glb", "": "glb" }, max: MAX_GLB_BYTES, folder: "furniture-models" },
} as const;

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    const c = await app();
    const tenant = await c.tenants.byId(session.tenantId);
    if (!tenant || tenant.kind !== "furniture") throw new DomainError("WRONG_KIND", "Chatbot này không phải bot nội thất");

    const form = await req.formData();
    const kind = z.enum(["image", "cutout", "model"]).parse(form.get("kind"));
    const spec = KINDS[kind];
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new DomainError("NO_FILE", "Chưa chọn file");
    if (file.size > spec.max) throw new DomainError("BAD_FILE", `File tối đa ${Math.round(spec.max / 1_000_000)} MB`);
    const ext = (spec.types as Record<string, string>)[file.type] ?? (kind === "model" && /\.glb$/i.test(file.name) ? "glb" : undefined);
    if (!ext) throw new DomainError("BAD_FILE", kind === "model" ? "Chọn file .glb" : "Ảnh phải là PNG/WEBP (tách nền) hoặc JPG/PNG/WEBP");

    const bytes = new Uint8Array(await file.arrayBuffer());
    let report;
    if (kind === "model") {
      const n = (k: string) => Number(form.get(k));
      const expected = n("widthCm") > 0 && n("depthCm") > 0 && n("heightCm") > 0 ? { widthCm: n("widthCm"), depthCm: n("depthCm"), heightCm: n("heightCm") } : undefined;
      report = await inspectGlb(bytes, expected);
    }
    const sku = String(form.get("sku") ?? "item").replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 40) || "item";
    const key = `${tenant.id}/${spec.folder}/${sku}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const contentType = kind === "model" ? "model/gltf-binary" : file.type;
    const url = await c.files.put(key, bytes, contentType);
    return NextResponse.json({ url, report });
  } catch (e) {
    return errorResponse(e);
  }
}
