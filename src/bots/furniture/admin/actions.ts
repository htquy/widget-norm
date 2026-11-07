"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DomainError } from "@/domain/errors";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { NO_ASSETS, isRoom } from "../domain";

export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;

const fail = (e: unknown): ActionState => {
  if (e instanceof DomainError) return { error: e.message };
  if (e instanceof z.ZodError) return { error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  if (e instanceof Error && /furniture_items_tenant_sku|duplicate key/.test(e.message)) return { error: "Mã SKU đã tồn tại" };
  console.error(e);
  return { error: "Có lỗi xảy ra" };
};

/** Chỉ bot loại "furniture" dùng các thao tác này */
async function furnitureTenant() {
  const s = await requireSession();
  const c = await app();
  const t = await c.tenants.byId(s.tenantId);
  if (!t || t.kind !== "furniture") throw new DomainError("WRONG_KIND", "Chatbot này không phải bot nội thất");
  return { s, c };
}

const itemSchema = z.object({
  sku: z.string().trim().min(1, "Nhập mã SKU").max(40),
  name: z.string().trim().min(1, "Nhập tên").max(160),
  category: z.string().trim().max(80).default(""),
  style: z.string().trim().max(80).default(""),
  material: z.string().trim().max(160).default(""),
  color: z.string().trim().max(80).default(""),
  widthCm: z.coerce.number().int().min(5).max(1000),
  depthCm: z.coerce.number().int().min(5).max(1000),
  heightCm: z.coerce.number().int().min(5).max(1000),
  price: z.string().default("0"),
  stock: z.coerce.number().int().min(0).max(100000).default(0),
  description: z.string().max(4000).default(""),
  imageUrl: z.string().trim().max(500).default(""),
  cutoutUrl: z.string().trim().max(500).default(""),
  modelUrl: z.string().trim().max(500).default(""),
  collection: z.string().trim().max(80).default(""),
  /** SKU các món hợp đi kèm, cách nhau bằng dấu phẩy */
  pairs: z.string().max(400).default(""),
  /** Vector CLIP (JSON mảng 512 số) do trình duyệt tính khi tải ảnh */
  embedding: z.string().max(20000).default(""),
  /** "1" = duyệt mô hình 3D cho khách thấy */
  approveModel: z.string().optional(),
});

const fileUrl = (v: string, what: string) => {
  if (v && !/^(\/api\/files\/|https:\/\/)/.test(v)) throw new DomainError("BAD_URL", `${what} phải là file đã tải lên hoặc link https`);
  return v;
};
const parseEmbedding = (raw: string): number[] | null => {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.length === 512 && v.every((x) => typeof x === "number" && Number.isFinite(x)) ? v : null;
  } catch {
    return null;
  }
};

export async function saveFurnitureAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id") ?? "");
  try {
    const { s, c } = await furnitureTenant();
    const d = itemSchema.parse(Object.fromEntries(form));
    fileUrl(d.imageUrl, "Ảnh");
    const { approveModel, embedding, pairs, ...rest } = d;
    const cutoutUrl = fileUrl(rest.cutoutUrl, "Ảnh tách nền");
    const modelUrl = fileUrl(rest.modelUrl, "Mô hình 3D");
    const existing = id ? await c.furnitureCatalog.get(s.tenantId, id) : null;
    // Shop tự tải .glb lên (modelUrl đổi) hoặc tick "Duyệt" → khách thấy; bản AI mới tạo giữ "review" tới khi duyệt
    const unchanged = !!existing && existing.modelUrl === modelUrl;
    const modelStatus = !modelUrl ? "" : approveModel === "1" || !unchanged ? "ready" : existing!.modelStatus || "ready";
    const data = {
      ...rest,
      cutoutUrl,
      modelUrl,
      modelStatus,
      pairs: pairs.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 12),
      // Chỉ ghi vector mới khi trình duyệt vừa tính; không có thì giữ nguyên
      ...(parseEmbedding(embedding) ? { embedding: parseEmbedding(embedding) } : {}),
      price: Number(d.price.replace(/[^\d]/g, "") || 0),
      rooms: form.getAll("rooms").map(String).filter(isRoom),
      active: form.get("active") === "on",
    };
    if (id) await c.furnitureCatalog.update(s.tenantId, id, data);
    else await c.furnitureCatalog.create({ ...NO_ASSETS, ...data, embedding: parseEmbedding(embedding), tenantId: s.tenantId });
    revalidatePath("/admin/furniture");
  } catch (e) {
    return fail(e);
  }
  redirect("/admin/furniture");
}

export async function deleteFurnitureAction(form: FormData) {
  const { s, c } = await furnitureTenant();
  await c.furnitureCatalog.remove(s.tenantId, z.string().uuid().parse(form.get("id")));
  revalidatePath("/admin/furniture");
  redirect("/admin/furniture");
}

export async function toggleFurnitureAction(form: FormData) {
  const { s, c } = await furnitureTenant();
  await c.furnitureCatalog.update(s.tenantId, z.string().uuid().parse(form.get("id")), { active: form.get("active") === "true" });
  revalidatePath("/admin/furniture");
}

