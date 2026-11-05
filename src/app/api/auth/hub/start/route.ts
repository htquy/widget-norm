import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  challenge,
  hubConfig,
  randomToken,
  seal,
} from "@/infrastructure/hub/client";
import { getSession } from "@/infrastructure/auth/session";

export async function GET(req: Request) {
  try {
    const cfg = hubConfig();
    const state = randomToken(),
      verifier = randomToken();
    const requested = new URL(req.url).searchParams.get("returnTo") ?? "";
    const returnTo =
      requested.startsWith("/signup?") || requested === "/signup"
        ? requested
        : undefined;
    const link =
      new URL(req.url).searchParams.get("link") === "1"
        ? await getSession()
        : null;
    (await cookies()).set(
      "wn_oauth",
      await seal(
        { state, verifier, linkAccountId: link?.accountId, returnTo },
        "10m",
      ),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 600,
        path: "/api/auth/hub",
      },
    );
    const target = new URL(`${cfg.base}/api/auth/oauth/authorize`);
    target.search = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirect,
      response_type: "code",
      scope: "openid profile email orders:read orders:write",
      state,
      code_challenge: challenge(verifier),
      code_challenge_method: "S256",
    }).toString();
    return NextResponse.redirect(target);
  } catch {
    return NextResponse.redirect(
      new URL(
        "/admin/login?error=hub_unavailable",
        process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
      ),
    );
  }
}
