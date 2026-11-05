import "server-only";
import { z } from "zod";
import { DomainError } from "@/domain/errors";
import { app } from "@/infrastructure/container";
import { getSession } from "@/infrastructure/auth/session";
import { listDomains } from "@/infrastructure/domains";
import { checkEntitlement, licensedBot } from "@/infrastructure/hub/billing";
import { isPublicDemo } from "@/domain/demo";

export const visitorIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/, "visitorId không hợp lệ");

/** Lấy shop + container; shop xác định ở server từ slug, không tin dữ liệu client. */
export async function resolve(slug: string) {
  const c = await app();
  const tenant = await c.tenants.bySlug(slug);
  if (tenant.status !== "active")
    throw new DomainError("BOT_PAUSED", "Chatbot đang tạm dừng.");
  // Hết hạn dùng thử mà chưa chọn gói → chatbot tạm ngưng (dữ liệu giữ nguyên)
  const account = await c.tenants.account(tenant.accountId);
  const session = await getSession();
  const isOwner = session?.accountId === tenant.accountId;
  const demo = isPublicDemo(tenant, account);
  if (!isOwner && !demo) {
    const domains = await listDomains(tenant.accountId);
    if (
      !domains.some((d) => d.verifiedAt) ||
      !tenant.settings.allowedOrigins.length
    )
      throw new DomainError(
        "DOMAIN_UNVERIFIED",
        "Website chưa xác minh quyền sở hữu domain.",
      );
  }
  const expired =
    account?.plan === "trial" &&
    account.trialEndsAt &&
    account.trialEndsAt.getTime() < Date.now();
  if (
    !demo &&
    process.env.HUB_CLIENT_ID &&
    (expired || account?.plan !== "trial")
  ) {
    const access = await checkEntitlement(tenant.accountId, tenant.kind);
    if (!access?.hasActiveSubscription || !access.isPaid)
      throw new DomainError(
        "SUBSCRIPTION_REQUIRED",
        "Chatbot chưa có gói đang hoạt động. Kiểm tra Domain & thanh toán.",
      );
    if ((await licensedBot(tenant.accountId, tenant.kind)) !== tenant.id)
      throw new DomainError(
        "LICENSE_REQUIRED",
        "Kích hoạt gói cho chatbot này tại Domain & thanh toán.",
      );
  } else if (expired) {
    throw new DomainError(
      "TRIAL_EXPIRED",
      "Chatbot tạm ngưng vì tài khoản đã hết hạn dùng thử. Vui lòng liên hệ cửa hàng.",
    );
  }
  return { c, tenant };
}

/** Hội thoại phải thuộc đúng khách này (chặn đọc/ghi hội thoại người khác bằng id đoán được) */
export async function ownConversation(
  slug: string,
  visitorId: string,
  conversationId: string,
) {
  const { c, tenant } = await resolve(slug);
  const conv = await c.chat.get(tenant.id, conversationId);
  if (!conv || conv.visitorId !== visitorId) return null;
  return { c, tenant, conv };
}
