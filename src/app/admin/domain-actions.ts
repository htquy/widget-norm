"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/infrastructure/auth/session";
import { registerDomain, verifyDomain } from "@/infrastructure/domains";
import { activateLicense } from "@/infrastructure/hub/billing";
import { app } from "@/infrastructure/container";
import { DomainError } from "@/domain/errors";
import { normalizeDomain } from "@/domain/website-domain";
import type { ActionState } from "./actions";

const failure = (e: unknown) => ({
  error:
    e instanceof DomainError
      ? e.message
      : "Không thể xử lý lúc này. Vui lòng thử lại.",
});
export async function registerDomainAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  try {
    await registerDomain(session.accountId, String(form.get("domain") ?? ""));
    revalidatePath("/admin/billing");
    return {
      ok: true,
      message:
        "Đã giữ domain trong 24 giờ. Thêm bản ghi DNS bên dưới để xác minh.",
    };
  } catch (e) {
    return failure(e);
  }
}
export async function verifyDomainAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  try {
    const domain = normalizeDomain(String(form.get("domain") ?? ""));
    await verifyDomain(session.accountId, domain);
    const c = await app(),
      tenant = await c.tenants.byId(session.tenantId);
    if (!tenant || tenant.accountId !== session.accountId)
      throw new Error("Forbidden");
    await c.tenants.updateSettings(tenant.id, {
      ...tenant.settings,
      allowedOrigins: [`https://${domain}`, `https://www.${domain}`],
    });
    revalidatePath("/admin", "layout");
    return {
      ok: true,
      message: "Đã xác minh và kết nối domain với chatbot đang chọn.",
    };
  } catch (e) {
    return failure(e);
  }
}
export async function activateLicenseAction(
  _: ActionState,
): Promise<ActionState> {
  const s = await requireSession(),
    c = await app(),
    tenant = await c.tenants.byId(s.tenantId);
  try {
    if (!tenant || tenant.accountId !== s.accountId)
      throw new Error("Forbidden");
    await activateLicense(s.accountId, tenant.kind, tenant.id);
    revalidatePath("/admin/billing");
    return {
      ok: true,
      message:
        "Đã kích hoạt gói cho chatbot này. Gói của loại bot này chỉ phục vụ chatbot được chọn.",
    };
  } catch (e) {
    return failure(e);
  }
}
