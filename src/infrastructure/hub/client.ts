import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { hubIdentities, accounts } from "../db/schema";
import { DomainError } from "@/domain/errors";

/**
 * Địa chỉ công khai của widget để dựng redirect_uri. Production luôn dùng PUBLIC_BASE_URL.
 * Khi dev (localhost) lấy theo địa chỉ trình duyệt đang mở, để đổi cổng (3000/3001/3101…) không làm
 * redirect_uri lệch với lúc đăng nhập; hub chấp nhận mọi cổng loopback của client công khai.
 */
export function publicBase(req?: Request): string {
  const configured = (process.env.PUBLIC_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  if (!req || process.env.NODE_ENV === "production") return configured;
  try {
    const u = new URL(req.url);
    if (["localhost", "127.0.0.1"].includes(u.hostname)) return u.origin;
  } catch {
    /* dùng cấu hình */
  }
  return configured;
}

export function hubConfig(req?: Request) {
  const base = process.env.HUB_BASE_URL?.replace(/\/$/, "");
  if (!base || !process.env.HUB_CLIENT_ID)
    throw new DomainError(
      "HUB_CONFIG",
      "Đăng nhập trung tâm chưa được cấu hình. Vui lòng liên hệ quản trị viên.",
    );
  const url = new URL(base);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("HUB_BASE_URL phải dùng HTTPS");
  return {
    base,
    clientId: process.env.HUB_CLIENT_ID,
    redirect: `${publicBase(req)}/api/auth/hub/callback`,
  };
}
const key = () => {
  const s =
    process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 16
      ? process.env.AUTH_SECRET
      : "widget-norm-default-fallback-secret-key-32chars";
  return createHash("sha256").update(s).digest();
};
export const randomToken = () => randomBytes(32).toString("base64url");
export const challenge = (verifier: string) =>
  createHash("sha256").update(verifier).digest("base64url");
export const seal = (payload: Record<string, unknown>, age = "30d") =>
  new EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(age)
    .encrypt(key());
export const unseal = async (value: string) =>
  (
    await jwtDecrypt(value, key(), {
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256GCM"],
    })
  ).payload;

export async function hubFetch(path: string, init: RequestInit = {}) {
  const response = await fetch(`${hubConfig().base}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok)
    throw new DomainError(
      "HUB_ERROR",
      response.status === 401
        ? "Phiên trung tâm đã hết hạn. Vui lòng đăng nhập lại."
        : response.status === 403
          ? "Đăng nhập SSO lại để cấp quyền cho thao tác này."
          : "Trung tâm tạm thời chưa phản hồi. Vui lòng thử lại.",
    );
  return response.json();
}

export async function hubAccessToken(
  accountId: string,
): Promise<string | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    // Row lock serializes refresh-token rotation across requests and server instances.
    const [identity] = await tx
      .select()
      .from(hubIdentities)
      .where(eq(hubIdentities.accountId, accountId))
      .for("update");
    if (!identity) return null;
    const saved = await unseal(identity.tokens);
    if (Number(saved.expiresAt) > Date.now() + 60_000)
      return String(saved.accessToken);
    const cfg = hubConfig();
    const refreshed = await hubFetch("/api/auth/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: cfg.clientId,
        refresh_token: String(saved.refreshToken),
        ...(process.env.HUB_CLIENT_SECRET
          ? { client_secret: process.env.HUB_CLIENT_SECRET }
          : {}),
      }),
    });
    await tx
      .update(hubIdentities)
      .set({
        tokens: await seal({
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          expiresAt: Date.now() + refreshed.expires_in * 1000,
        }),
      })
      .where(
        and(
          eq(hubIdentities.subject, identity.subject),
          eq(hubIdentities.tokens, identity.tokens),
        ),
      );
    return refreshed.access_token;
  });
}

export async function connectIdentity(
  profile: { sub: string; email: string; name?: string },
  tokens: { access_token: string; refresh_token: string; expires_in: number },
  linkAccountId?: string,
) {
  const db = await getDb();
  const encrypted = await seal({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  });
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(hubIdentities)
      .where(eq(hubIdentities.subject, profile.sub));
    if (existing) {
      if (linkAccountId && existing.accountId !== linkAccountId)
        throw new DomainError(
          "HUB_ALREADY_LINKED",
          "Tài khoản trung tâm đã liên kết với workspace khác.",
        );
      await tx
        .update(hubIdentities)
        .set({ tokens: encrypted })
        .where(eq(hubIdentities.subject, profile.sub));
      return existing.accountId;
    }
    const id = linkAccountId ?? crypto.randomUUID();
    if (!linkAccountId)
      await tx.insert(accounts).values({
        id,
        name: profile.name || profile.email,
        email: profile.email,
        plan: "trial",
        trialEndsAt: new Date(Date.now() + 14 * 86_400_000),
      });
    else if (
      !(
        await tx.select().from(accounts).where(eq(accounts.id, linkAccountId))
      )[0]
    )
      throw new Error("Account not found");
    await tx
      .insert(hubIdentities)
      .values({ subject: profile.sub, accountId: id, tokens: encrypted });
    return id;
  });
}
