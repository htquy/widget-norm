import "server-only";
import { resolveTxt } from "node:dns/promises";
import { and, eq, isNull, lt } from "drizzle-orm";
import { normalizeDomain } from "@/domain/website-domain";
import { DomainError } from "@/domain/errors";
import { getDb } from "./db/client";
import { websiteDomains } from "./db/schema";

export async function listDomains(accountId: string) {
  return (await getDb())
    .select()
    .from(websiteDomains)
    .where(eq(websiteDomains.accountId, accountId));
}
export async function registerDomain(accountId: string, input: string) {
  const domain = normalizeDomain(input),
    db = await getDb();
  // Only unverified reservations expire. Verified domains retain their trial history indefinitely.
  await db
    .delete(websiteDomains)
    .where(
      and(
        eq(websiteDomains.domain, domain),
        isNull(websiteDomains.verifiedAt),
        lt(websiteDomains.createdAt, new Date(Date.now() - 86_400_000)),
      ),
    );
  await db
    .insert(websiteDomains)
    .values({ domain, accountId, token: crypto.randomUUID() })
    .onConflictDoNothing();
  const [row] = await db
    .select()
    .from(websiteDomains)
    .where(eq(websiteDomains.domain, domain));
  if (!row || row.accountId !== accountId)
    throw new DomainError(
      "DOMAIN_TAKEN",
      "Domain này đã đăng ký với tài khoản khác. Đăng nhập tài khoản sở hữu hoặc liên hệ hỗ trợ; không thể nhận thêm dùng thử bằng email khác.",
    );
  return row;
}
export async function verifyDomain(accountId: string, input: string) {
  const domain = normalizeDomain(input),
    db = await getDb();
  const [row] = await db
    .select()
    .from(websiteDomains)
    .where(
      and(
        eq(websiteDomains.domain, domain),
        eq(websiteDomains.accountId, accountId),
      ),
    );
  if (!row)
    throw new DomainError(
      "DOMAIN_NOT_FOUND",
      "Domain chưa được đăng ký bởi tài khoản của bạn.",
    );
  let values: string[][];
  try {
    values = await resolveTxt(`_avi-verify.${domain}`);
  } catch {
    throw new DomainError(
      "DNS_PENDING",
      "Chưa tìm thấy bản ghi DNS TXT. Kiểm tra tên, giá trị và thử lại sau khi DNS cập nhật.",
    );
  }
  if (
    !values.some((parts) => parts.join("") === `avi-verification=${row.token}`)
  )
    throw new DomainError(
      "DNS_PENDING",
      "Giá trị DNS TXT chưa khớp. Sao chép đầy đủ mã xác minh.",
    );
  await db
    .update(websiteDomains)
    .set({ verifiedAt: row.verifiedAt ?? new Date() })
    .where(
      and(
        eq(websiteDomains.domain, domain),
        eq(websiteDomains.accountId, accountId),
      ),
    );
}

export async function assertOwnedOrigins(accountId: string, origins: string[]) {
  const owned = await listDomains(accountId);
  for (const origin of origins) {
    const url = new URL(origin);
    if (
      url.origin !== origin.replace(/\/$/, "") ||
      !owned.some((d) => d.verifiedAt && d.domain === normalizeDomain(origin))
    )
      throw new DomainError(
        "DOMAIN_UNVERIFIED",
        "Chỉ nhúng trên domain đã xác minh tại mục Domain & thanh toán.",
      );
  }
}
