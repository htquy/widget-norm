import "server-only";
import { z } from "zod";
import { app } from "@/infrastructure/container";

export const visitorIdSchema = z.string().regex(/^[A-Za-z0-9_-]{8,64}$/, "visitorId không hợp lệ");

/** Lấy shop + container; shop xác định ở server từ slug, không tin dữ liệu client. */
export async function resolve(slug: string) {
  const c = await app();
  const tenant = await c.tenants.bySlug(slug);
  return { c, tenant };
}

/** Hội thoại phải thuộc đúng khách này (chặn đọc/ghi hội thoại người khác bằng id đoán được) */
export async function ownConversation(slug: string, visitorId: string, conversationId: string) {
  const { c, tenant } = await resolve(slug);
  const conv = await c.chat.get(tenant.id, conversationId);
  if (!conv || conv.visitorId !== visitorId) return null;
  return { c, tenant, conv };
}
