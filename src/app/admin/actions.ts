"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { BOOKING_STATUSES, sanitizeHours, type Weekday } from "@/domain/booking";
import { DomainError } from "@/domain/errors";
import { LEAD_STATUSES } from "@/domain/lead";
import { MAX_DESCRIPTION_LENGTH } from "@/bots/store/product";
import { MAX_KNOWLEDGE_LENGTH } from "@/domain/tenant";
import { sanitizeTheme } from "@/domain/theme";
import { createSession, destroySession, requireAccount, requireSession } from "@/infrastructure/auth/session";
import { isBotKind } from "@/domain/tenant";
import { app } from "@/infrastructure/container";
import { rateLimit } from "@/infrastructure/http";
import { rangeFor } from "@/components/admin/ui";

export type ActionState = { ok?: boolean; error?: string; message?: string; text?: string } | undefined;

const fail = (e: unknown): ActionState => {
  if (e instanceof DomainError) return { error: e.message };
  if (e instanceof z.ZodError) return { error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  console.error(e);
  return { error: "Có lỗi xảy ra" };
};

async function tenantOf(tenantId: string) {
  const c = await app();
  const t = await c.tenants.byId(tenantId);
  if (!t) throw new DomainError("TENANT_NOT_FOUND", "Không tìm thấy shop");
  return { c, tenant: t };
}

/* ---------- Đăng nhập ---------- */

export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "");
  if (!rateLimit(`login:${email}`, 10, 15 * 60_000)) return { error: "Thử quá nhiều lần, vui lòng đợi 15 phút" };
  try {
    const c = await app();
    await createSession(await c.auth.login(email, String(form.get("password") ?? "")));
  } catch (e) {
    return fail(e);
  }
  redirect("/admin");
}

/** Đăng ký dùng thử: tạo tài khoản + chatbot đầu tiên rồi vào thẳng trang quản trị */
export async function signupAction(_: ActionState, form: FormData): Promise<ActionState> {
  const f = Object.fromEntries(form);
  const email = String(f.email ?? "").trim().toLowerCase();
  if (!rateLimit(`signup:${email}`, 5, 60 * 60_000) || !rateLimit("signup:all", 60, 60 * 60_000)) return { error: "Quá nhiều lượt đăng ký, vui lòng thử lại sau" };
  try {
    const kind = isBotKind(f.kind) ? f.kind : "store";
    const c = await app();
    const s = await c.auth.signup({ name: String(f.name ?? ""), email, password: String(f.password ?? ""), shopName: String(f.shopName ?? ""), kind });
    await createSession(s);
  } catch (e) {
    return fail(e);
  }
  redirect("/admin");
}

/** Đổi bot đang quản lý — chỉ được chọn bot thuộc tài khoản của mình */
export async function switchBotAction(form: FormData) {
  const s = await requireAccount();
  const id = z.string().uuid().parse(form.get("id"));
  const bots = await (await app()).tenants.listByAccount(s.accountId);
  if (!bots.some((b) => b.id === id)) throw new DomainError("FORBIDDEN", "Không có quyền với chatbot này");
  await createSession({ ...s, tenantId: id });
  redirect("/admin");
}

export async function createBotAction(_: ActionState, form: FormData): Promise<ActionState> {
  const s = await requireAccount();
  let id = "";
  try {
    const kind = z.string().parse(form.get("kind"));
    if (!isBotKind(kind)) throw new DomainError("BAD_KIND", "Loại chatbot không hợp lệ");
    const bot = await (await app()).tenants.createBot(s.accountId, kind, String(form.get("shopName") ?? ""));
    id = bot.id;
    await createSession({ ...s, tenantId: id });
  } catch (e) {
    return fail(e);
  }
  redirect("/admin/widget");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

/* ---------- Hội thoại & chuyển nhân viên ---------- */

export async function takeOverAction(form: FormData) {
  const s = await requireSession();
  const id = z.string().uuid().parse(form.get("id"));
  await (await app()).support.takeOver(s.tenantId, id, s.name);
  revalidatePath(`/admin/conversations/${id}`);
}

export async function resolveAction(form: FormData) {
  const s = await requireSession();
  const id = z.string().uuid().parse(form.get("id"));
  await (await app()).support.resolve(s.tenantId, id);
  revalidatePath(`/admin/conversations/${id}`);
  revalidatePath("/admin/conversations");
}

export async function agentReplyAction(_: ActionState, form: FormData): Promise<ActionState> {
  const s = await requireSession();
  try {
    const id = z.string().uuid().parse(form.get("id"));
    await (await app()).support.agentReply(s.tenantId, id, s.name, String(form.get("text") ?? ""));
    revalidatePath(`/admin/conversations/${id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ---------- Lead ---------- */

export async function updateLeadAction(_: ActionState, form: FormData): Promise<ActionState> {
  const s = await requireSession();
  try {
    const input = z.object({ id: z.string().uuid(), status: z.enum(LEAD_STATUSES), note: z.string().max(2000), wonValue: z.string().optional() }).parse(Object.fromEntries(form));
    const raw = (input.wonValue ?? "").replace(/[^\d]/g, "");
    await (await app()).leads.update(s.tenantId, input.id, { status: input.status, note: input.note, wonValue: raw ? Number(raw) : null });
    revalidatePath("/admin/leads");
    revalidatePath(`/admin/leads/${input.id}`);
    return { ok: true, message: "Đã lưu" };
  } catch (e) {
    return fail(e);
  }
}

/* ---------- Lịch hẹn & dịch vụ ---------- */

export async function setBookingStatusAction(form: FormData) {
  const s = await requireSession();
  const id = z.string().uuid().parse(form.get("id"));
  const status = z.enum(BOOKING_STATUSES).parse(form.get("status"));
  await (await app()).bookings.setStatus(s.tenantId, id, status);
  revalidatePath("/admin/bookings");
}

export async function saveServiceAction(_: ActionState, form: FormData): Promise<ActionState> {
  const s = await requireSession();
  try {
    const f = Object.fromEntries(form);
    const id = f.id ? z.string().uuid().parse(f.id) : null;
    await (await app()).services.save(s.tenantId, id, {
      name: z.string().trim().min(1, "Nhập tên dịch vụ").max(120).parse(f.name),
      durationMin: z.coerce.number().int().parse(f.durationMin),
      price: z.coerce.number().int().min(0).parse(String(f.price ?? "0").replace(/[^\d]/g, "") || 0),
      description: z.string().max(1000).parse(f.description ?? ""),
      active: f.active === "on",
    });
    revalidatePath("/admin/services");
    return { ok: true, message: id ? "Đã lưu dịch vụ" : "Đã thêm dịch vụ" };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteServiceAction(form: FormData) {
  const s = await requireSession();
  await (await app()).services.remove(s.tenantId, z.string().uuid().parse(form.get("id")));
  revalidatePath("/admin/services");
}

/* ---------- Sản phẩm ---------- */

const productSchema = z.object({
  sku: z.string().trim().min(1, "Nhập mã SKU").max(40),
  name: z.string().trim().min(1, "Nhập tên").max(160),
  category: z.string().trim().max(80).default(""),
  price: z.string().default("0"),
  description: z.string().max(MAX_DESCRIPTION_LENGTH).default(""),
  url: z.string().trim().max(500).default(""),
  imageUrl: z.string().trim().max(500).default(""),
  tags: z.string().max(300).default(""),
});

const okUrl = (u: string) => (!u || /^https?:\/\//.test(u) ? u : (() => { throw new DomainError("BAD_URL", "Link phải bắt đầu bằng http:// hoặc https://"); })());

export async function saveProductAction(_: ActionState, form: FormData): Promise<ActionState> {
  const s = await requireSession();
  const id = String(form.get("id") ?? "");
  try {
    const d = productSchema.parse(Object.fromEntries(form));
    const c = await app();
    const data = {
      sku: d.sku,
      name: d.name,
      category: d.category,
      price: Number(d.price.replace(/[^\d]/g, "") || 0),
      description: d.description,
      url: okUrl(d.url),
      imageUrl: okUrl(d.imageUrl),
      tags: d.tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean),
      inStock: form.get("inStock") === "on",
      active: form.get("active") === "on",
    };
    if (id) await c.catalog.update(s.tenantId, id, data);
    else await c.catalog.create({ ...data, tenantId: s.tenantId });
    revalidatePath("/admin/products");
  } catch (e) {
    if (e instanceof Error && /products_tenant_sku|duplicate key/.test(e.message)) return { error: "SKU đã tồn tại" };
    return fail(e);
  }
  redirect("/admin/products");
}

export async function deleteProductAction(form: FormData) {
  const s = await requireSession();
  await (await app()).catalog.remove(s.tenantId, z.string().uuid().parse(form.get("id")));
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function toggleProductAction(form: FormData) {
  const s = await requireSession();
  await (await app()).catalog.update(s.tenantId, z.string().uuid().parse(form.get("id")), { active: form.get("active") === "true" });
  revalidatePath("/admin/products");
}

export async function importProductsAction(_: ActionState, form: FormData): Promise<ActionState> {
  const s = await requireSession();
  try {
    const file = form.get("csv");
    if (!(file instanceof File) || file.size === 0) throw new DomainError("NO_FILE", "Chọn file CSV");
    if (file.size > 2_000_000) throw new DomainError("BAD_FILE", "File tối đa 2 MB");
    const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
    if (parsed.data.length > 3000) throw new DomainError("BAD_FILE", "Tối đa 3000 dòng mỗi lần");
    const res = await (await app()).catalog.importRows(s.tenantId, parsed.data);
    revalidatePath("/admin/products");
    const errs = res.errors.slice(0, 10).map((e) => `dòng ${e.row}: ${e.message}`).join("; ");
    return { ok: res.errors.length === 0, message: `Thêm ${res.created}, cập nhật ${res.updated} sản phẩm.${res.errors.length ? ` ${res.errors.length} dòng lỗi — ${errs}` : ""}` };
  } catch (e) {
    return fail(e);
  }
}

/* ---------- Cài đặt ---------- */

export async function saveSettingsAction(_: ActionState, form: FormData): Promise<ActionState> {
  const s = await requireSession();
  try {
    const f = Object.fromEntries(form);
    const { c, tenant } = await tenantOf(s.tenantId);
    const webhook = String(f.webhookUrl ?? "").trim();
    if (webhook && !/^https:\/\//.test(webhook)) throw new DomainError("BAD_URL", "Webhook phải là URL https://");
    const url = (k: string, prefix: RegExp, what: string) => {
      const v = String(f[k] ?? "").trim();
      if (v && !prefix.test(v)) throw new DomainError("BAD_URL", `${what} chưa đúng định dạng`);
      return v;
    };
    const hoursRaw: Record<number, { open: string; close: string } | null> = {};
    for (let i = 0; i <= 6; i++) hoursRaw[i] = f[`open_${i}`] === "on" ? { open: String(f[`from_${i}`]), close: String(f[`to_${i}`]) } : null;
    const hours = sanitizeHours(hoursRaw);
    for (let i = 0 as Weekday; i <= 6; i++) {
      const v = hoursRaw[i];
      if (v && (hours[i]?.open !== v.open || hours[i]?.close !== v.close)) throw new DomainError("BAD_HOURS", "Giờ đóng cửa phải sau giờ mở cửa");
      if (i === 6) break;
    }
    const int = (k: string, min: number, max: number) => z.coerce.number().int().min(min).max(max).parse(f[k]);
    await c.tenants.updateSettings(s.tenantId, {
      ...tenant.settings,
      shopName: z.string().trim().min(1).max(80).parse(f.shopName),
      industry: z.string().trim().max(120).parse(f.industry ?? ""),
      greeting: z.string().max(500).parse(f.greeting),
      phone: z.string().max(30).parse(f.phone),
      email: z.string().max(120).parse(f.email ?? ""),
      address: z.string().max(200).parse(f.address),
      botInstructions: z.string().max(3000).parse(f.botInstructions),
      knowledgeBase: z.string().max(MAX_KNOWLEDGE_LENGTH, `Kiến thức cửa hàng tối đa ${MAX_KNOWLEDGE_LENGTH} ký tự`).parse(f.knowledgeBase ?? ""),
      quickReplies: String(f.quickReplies ?? "")
        .split("\n")
        .map((q) => q.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 6),
      allowedOrigins: String(f.allowedOrigins ?? "")
        .split(/[\s,]+/)
        .map((o) => o.trim())
        .filter(Boolean),
      webhookUrl: webhook,
      hours,
      booking: {
        ...tenant.settings.booking,
        enabled: f.bookingEnabled === "on",
        slotStepMin: int("slotStepMin", 5, 240),
        capacity: int("capacity", 1, 100),
        minLeadMin: int("minLeadMin", 0, 7 * 24 * 60),
        maxDaysAhead: int("maxDaysAhead", 1, 365),
        requireConfirm: f.requireConfirm === "on",
        closedDates: String(f.closedDates ?? "")
          .split(/[\s,]+/)
          .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
      },
      handoff: {
        enabled: f.handoffEnabled === "on",
        liveChat: f.liveChat === "on",
        escalateAfter: int("escalateAfter", 1, 10),
        zaloUrl: url("zaloUrl", /^https:\/\//, "Link Zalo"),
        messengerUrl: url("messengerUrl", /^https:\/\//, "Link Messenger"),
      },
    });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Đã lưu cài đặt" };
  } catch (e) {
    return fail(e);
  }
}

export async function saveThemeAction(_: ActionState, form: FormData): Promise<ActionState> {
  const s = await requireSession();
  try {
    const f = Object.fromEntries(form);
    const { c, tenant } = await tenantOf(s.tenantId);
    const theme = sanitizeTheme({ ...f, showBranding: f.showBranding === "on" }, tenant.settings.shopName);
    if (f.primaryColor && theme.primaryColor !== String(f.primaryColor).toLowerCase()) throw new DomainError("BAD_COLOR", "Màu phải dạng #RRGGBB");
    if (f.avatarUrl && !theme.avatarUrl) throw new DomainError("BAD_URL", "Ảnh đại diện phải là link https://");
    await c.tenants.updateSettings(s.tenantId, { ...tenant.settings, theme, greeting: z.string().max(500).parse(f.greeting ?? tenant.settings.greeting) });
    revalidatePath("/admin/widget");
    return { ok: true, message: "Đã lưu giao diện — widget trên website cập nhật trong ~1 phút" };
  } catch (e) {
    return fail(e);
  }
}

/* ---------- Phân tích nhu cầu ---------- */

export async function summarizeNeedsAction(_: ActionState, form: FormData): Promise<ActionState> {
  const s = await requireSession();
  try {
    const days = [7, 30, 90].includes(Number(form.get("days"))) ? Number(form.get("days")) : 30;
    const { c, tenant } = await tenantOf(s.tenantId);
    const r = await c.insights.summarizeNeeds(s.tenantId, rangeFor(days), tenant.settings.shopName);
    return { ok: true, text: r.text, message: r.source === "llm" ? `Tạo bởi ${r.model}` : "Tổng hợp theo từ khoá (chưa cấu hình LLM)" };
  } catch (e) {
    return fail(e);
  }
}
