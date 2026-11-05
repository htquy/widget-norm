import "server-only";
import { z } from "zod";
import { DomainError } from "@/domain/errors";
import { app } from "@/infrastructure/container";

export const visitorIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "visitorId không hợp lệ");

/** Lấy shop + container; shop xác định ở server từ slug, không tin dữ liệu client. */
export async function resolve(slug: string) {
  const c = await app();
  const tenant = await c.tenants.bySlug(slug);
  if (tenant.status !== "active") throw new DomainError("BOT_PAUSED", "Chatbot đang tạm dừng.");
  // Hết hạn dùng thử mà chưa chọn gói → chatbot tạm ngưng (dữ liệu giữ nguyên)
  const account = await c.tenants.account(tenant.accountId);
  if (account?.plan === "trial" && account.trialEndsAt && account.trialEndsAt.getTime() < Date.now()) {
    throw new DomainError("TRIAL_EXPIRED", "Chatbot tạm ngưng vì tài khoản đã hết hạn dùng thử. Vui lòng liên hệ cửa hàng.");
  }
  return { c, tenant };
}

/** Hội thoại phải thuộc đúng khách này (chặn đọc/ghi hội thoại người khác bằng id đoán được) */
export async function ownConversation(slug: string, visitorId: string, conversationId: string) {
  const { c, tenant } = await resolve(slug);
  const conv = await c.chat.get(tenant.id, conversationId);
  if (!conv || conv.visitorId !== visitorId) return null;
  return { c, tenant, conv };
}
