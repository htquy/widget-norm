import "server-only";
import { BOT_PRICING } from "@/domain/bot-pricing";
import type { BotKind } from "@/domain/tenant";
import { hubAccessToken, hubFetch } from "./client";
import { DomainError } from "@/domain/errors";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { botLicenses, tenants } from "../db/schema";

const entitlement = z.object({
  success: z.literal(true),
  data: z.object({
    hasActiveSubscription: z.boolean(),
    isPaid: z.boolean(),
    unlockedFeatures: z.array(z.string()),
    subscription: z
      .object({ endsAt: z.string().nullable(), planName: z.string() })
      .nullable(),
  }),
});
export async function checkEntitlement(accountId: string, kind: BotKind) {
  const token = await hubAccessToken(accountId);
  if (!token) return null;
  const slug =
    process.env[BOT_PRICING[kind].hubEnv] ||
    BOT_PRICING[kind].hubSlug;
  const parsed = entitlement.parse(
    await hubFetch(`/api/apps/${encodeURIComponent(slug)}/check-access`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
  return parsed.data;
}
/** Hub subscriptions are user/app-scoped; bind each app license to one selected bot locally. */
export async function licensedBot(accountId: string, kind: BotKind) {
  const [license] = await (
    await getDb()
  )
    .select()
    .from(botLicenses)
    .where(eq(botLicenses.key, `${accountId}:${kind}`));
  return license?.tenantId ?? null;
}
export async function activateLicense(
  accountId: string,
  kind: BotKind,
  tenantId: string,
) {
  const db = await getDb();
  const [owned] = await db
    .select()
    .from(tenants)
    .where(
      and(
        eq(tenants.id, tenantId),
        eq(tenants.accountId, accountId),
        eq(tenants.kind, kind),
      ),
    );
  if (!owned)
    throw new DomainError(
      "FORBIDDEN",
      "Chatbot không thuộc tài khoản hoặc loại gói này.",
    );
  const access = await checkEntitlement(accountId, kind);
  if (!access?.isPaid || !access.hasActiveSubscription)
    throw new DomainError(
      "PAYMENT_PENDING",
      "Trung tâm chưa xác nhận gói trả phí đang hoạt động.",
    );
  const key = `${accountId}:${kind}`;
  await (
    await getDb()
  )
    .insert(botLicenses)
    .values({ key, accountId, kind, tenantId })
    .onConflictDoUpdate({ target: botLicenses.key, set: { tenantId } });
}
