"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DomainError } from "@/domain/errors";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { LAYOUT_PATTERNS } from "../domain/quote";
import { MAX_DESCRIPTION_LENGTH, MAX_TILE_IMAGES } from "../domain/tile";
import { DEFAULT_TILE_SETTINGS } from "../repository";

export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;

const fail = (e: unknown): ActionState => {
  if (e instanceof DomainError) return { error: e.message };
  if (e instanceof z.ZodError) return { error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  console.error(e);
  return { error: "Có lỗi xảy ra" };
};

/** Chỉ bot loại "tile" mới dùng các thao tác này */
async function tileTenant() {
  const s = await requireSession();
  const c = await app();
  const t = await c.tenants.byId(s.tenantId);
  if (!t || t.kind !== "tile") throw new DomainError("WRONG_KIND", "Chatbot này không phải bot gạch ốp lát");
  return { s, c };
}

const tileSchema = z.object({
  sku: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  widthMm: z.coerce.number().int().min(10).max(3000),
  heightMm: z.coerce.number().int().min(10).max(3000),
  thicknessMm: z.coerce.number().min(1).max(50),
  piecesPerBox: z.coerce.number().int().min(1).max(500),
  pricePerM2: z.coerce.number().int().min(0).max(100_000_000),
  finish: z.enum(["glossy", "matte", "textured"]),
  style: z.string().max(200).default(""),
  color: z.string().max(100).default(""),
  stock: z.coerce.number().int().min(0),
  description: z.string().max(MAX_DESCRIPTION_LENGTH, `Mô tả tối đa ${MAX_DESCRIPTION_LENGTH} ký tự`).default(""),
});

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_IMAGE_BYTES = 5_000_000;

/** Kiểm tra loại + dung lượng và bỏ file lên storage (R2 hoặc đĩa). Trả về URL, hoặc null nếu không chọn file. */
async function uploadImage(tenantId: string, folder: "textures" | "products", sku: string, file: FormDataEntryValue | null, what: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = IMAGE_TYPES[file.type];
  if (!ext) throw new DomainError("BAD_FILE", `${what} phải là JPG, PNG hoặc WEBP`);
  if (file.size > MAX_IMAGE_BYTES) throw new DomainError("BAD_FILE", `${what} tối đa 5 MB`);
  const c = await app();
  const key = `${tenantId}/${folder}/${sku.replace(/[^A-Za-z0-9_-]/g, "_")}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  return c.files.put(key, new Uint8Array(await file.arrayBuffer()), file.type);
}

export async function saveTileAction(_: ActionState, form: FormData): Promise<ActionState> {
  let id = String(form.get("id") ?? "");
  try {
    const { s, c } = await tileTenant();
    const data = tileSchema.parse(Object.fromEntries(form));
    const usage = form.getAll("usage").map(String).filter((u): u is "floor" | "wall" => u === "floor" || u === "wall");
    if (usage.length === 0) throw new DomainError("NO_USAGE", "Chọn ít nhất một công dụng (lát sàn / ốp tường)");
    const active = form.get("active") === "on";
    const textureUrl = await uploadImage(s.tenantId, "textures", data.sku, form.get("texture"), "Ảnh vân gạch");

    // Ảnh sản phẩm: giữ ảnh cũ (trừ ảnh bị tick xoá) rồi thêm ảnh mới.
    const existing = id ? await c.tileCatalog.get(s.tenantId, id) : null;
    if (id && !existing) throw new DomainError("NOT_FOUND", "Không tìm thấy mẫu");
    const removed = new Set(form.getAll("removeImage").map(String));
    const kept = (existing?.images ?? []).filter((u) => !removed.has(u));
    const newFiles = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (kept.length + newFiles.length > MAX_TILE_IMAGES) throw new DomainError("TOO_MANY_IMAGES", `Tối đa ${MAX_TILE_IMAGES} ảnh sản phẩm (đang có ${kept.length}, thêm ${newFiles.length})`);
    const uploaded: string[] = [];
    for (const f of newFiles) uploaded.push((await uploadImage(s.tenantId, "products", data.sku, f, "Ảnh sản phẩm"))!);
    const images = [...kept, ...uploaded];

    if (id) {
      await c.tileCatalog.update(s.tenantId, id, { ...data, usage, active, images, ...(textureUrl ? { textureUrl } : {}) });
    } else {
      if (!textureUrl) throw new DomainError("NO_TEXTURE", "Cần tải ảnh vân gạch (ảnh chụp thẳng 1 viên)");
      id = (await c.tileCatalog.create({ ...data, usage, active, images, textureUrl, tenantId: s.tenantId })).id;
    }
    revalidatePath("/admin/tiles");
  } catch (e) {
    if (e instanceof Error && /tiles_tenant_sku|duplicate key/.test(e.message)) return { error: "SKU đã tồn tại" };
    return fail(e);
  }
  redirect("/admin/tiles");
}

export async function deleteTileAction(form: FormData) {
  const { s, c } = await tileTenant();
  await c.tileCatalog.remove(s.tenantId, z.string().uuid().parse(form.get("id")));
  revalidatePath("/admin/tiles");
  redirect("/admin/tiles");
}

export async function toggleTileAction(form: FormData) {
  const { s, c } = await tileTenant();
  await c.tileCatalog.update(s.tenantId, z.string().uuid().parse(form.get("id")), { active: form.get("active") === "true" });
  revalidatePath("/admin/tiles");
}

export async function importTilesAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { s, c } = await tileTenant();
    const file = form.get("csv");
    if (!(file instanceof File) || file.size === 0) throw new DomainError("NO_FILE", "Chọn file CSV");
    if (file.size > 2_000_000) throw new DomainError("BAD_FILE", "File tối đa 2 MB");
    const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
    if (parsed.data.length > 2000) throw new DomainError("BAD_FILE", "Tối đa 2000 dòng mỗi lần");
    const res = await c.tileCatalog.importRows(s.tenantId, parsed.data);
    revalidatePath("/admin/tiles");
    const errs = res.errors.slice(0, 10).map((e) => `dòng ${e.row}: ${e.message}`).join("; ");
    return { ok: res.errors.length === 0, message: `Thêm ${res.created}, cập nhật ${res.updated} mẫu.${res.errors.length ? ` ${res.errors.length} dòng lỗi — ${errs}` : ""}` };
  } catch (e) {
    return fail(e);
  }
}

/** Thông số báo giá (hao hụt, keo, ron) + % khách thấy trình xem thử (A/B) */
export async function saveTileSettingsAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const { s, c } = await tileTenant();
    const f = Object.fromEntries(form);
    const n = (k: string) => z.coerce.number().min(0).parse(f[k]);
    await c.tileRepos.settings.save(s.tenantId, {
      pricing: {
        wastePercent: Object.fromEntries(LAYOUT_PATTERNS.map((p) => [p, n(`waste_${p}`)])) as Record<(typeof LAYOUT_PATTERNS)[number], number>,
        adhesiveKgPerM2: n("adhesiveKgPerM2"),
        adhesiveBagKg: z.coerce.number().positive().parse(f.adhesiveBagKg),
        adhesiveBagPrice: n("adhesiveBagPrice"),
        groutPricePerKg: n("groutPricePerKg"),
      },
      abVisualizerPercent: z.coerce.number().int().min(0).max(100).parse(f.abVisualizerPercent ?? DEFAULT_TILE_SETTINGS.abVisualizerPercent),
    });
    revalidatePath("/admin/tile-settings");
    return { ok: true, message: "Đã lưu thông số báo giá" };
  } catch (e) {
    return fail(e);
  }
}
