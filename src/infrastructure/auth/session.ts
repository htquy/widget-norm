import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "wn_session";
const MAX_AGE = 7 * 24 * 3600;

export interface Session {
  userId: string;
  /** Tài khoản sở hữu các bot */
  accountId: string;
  /** Bot đang quản lý (đổi ở menu chọn bot; luôn thuộc accountId — kiểm tra khi đổi) */
  tenantId: string;
  name: string;
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16)
    throw new Error("AUTH_SECRET chưa được cấu hình (tối thiểu 16 ký tự)");
  return new TextEncoder().encode(s);
}

export async function createSession(s: Session) {
  const token = await new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    // Phiên của bản cũ (chưa có accountId) coi như hết hạn
    if (!payload.accountId) return null;
    return {
      userId: String(payload.userId),
      accountId: String(payload.accountId),
      tenantId: String(payload.tenantId ?? ""),
      name: String(payload.name),
    };
  } catch {
    return null;
  }
}

/** Dùng trong trang/server action admin: chưa đăng nhập → trang login; chưa có bot → trang tạo bot. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  if (process.env.HUB_CLIENT_ID && !s.userId.startsWith("hub:"))
    redirect("/api/auth/hub/start?link=1");
  if (!s.tenantId) redirect("/admin/bots");
  return s;
}

/** Chỉ cần đăng nhập (trang quản lý tài khoản / tạo bot) */
export async function requireAccount(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  if (process.env.HUB_CLIENT_ID && !s.userId.startsWith("hub:"))
    redirect("/api/auth/hub/start?link=1");
  return s;
}
