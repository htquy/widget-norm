import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  connectIdentity,
  hubConfig,
  hubFetch,
  publicBase,
  unseal,
} from "@/infrastructure/hub/client";
import { createSession, getSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";

export async function GET(req: Request) {
  const base = publicBase(req);
  const jar = await cookies();
  const value = jar.get("wn_oauth")?.value;
  jar.set("wn_oauth", "", { path: "/api/auth/hub", maxAge: 0 });
  try {
    const url = new URL(req.url),
      cfg = hubConfig(req);
    if (!value || url.searchParams.has("error"))
      throw new Error("OAuth cancelled");
    const saved = await unseal(value);
    if (!saved.state || saved.state !== url.searchParams.get("state"))
      throw new Error("Invalid state");
    const code = z
      .string()
      .min(1)
      .max(1000)
      .parse(url.searchParams.get("code"));
    const tokens = z
      .object({
        access_token: z.string().min(1),
        refresh_token: z.string().min(1),
        expires_in: z.number().positive(),
      })
      .parse(
        await hubFetch("/api/auth/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: cfg.clientId,
            code,
            redirect_uri: cfg.redirect,
            code_verifier: String(saved.verifier),
            ...(process.env.HUB_CLIENT_SECRET
              ? { client_secret: process.env.HUB_CLIENT_SECRET }
              : {}),
          }),
        }),
      );
    const profile = z
      .object({
        sub: z.string().min(1),
        email: z.email(),
        name: z.string().nullable().optional(),
        status: z.literal("ACTIVE"),
      })
      .parse(
        await hubFetch("/api/auth/oauth/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        }),
      );
    const current = await getSession();
    if (saved.linkAccountId && current?.accountId !== saved.linkAccountId)
      throw new Error("Link session changed");
    const accountId = await connectIdentity(
      { ...profile, name: profile.name ?? undefined },
      tokens,
      saved.linkAccountId ? String(saved.linkAccountId) : undefined,
    );
    const bots = await (await app()).tenants.listByAccount(accountId);
    await createSession({
      userId: `hub:${profile.sub}`,
      accountId,
      tenantId: bots[0]?.id ?? "",
      name: profile.name || profile.email,
    });
    return NextResponse.redirect(
      new URL(
        typeof saved.returnTo === "string" &&
          (saved.returnTo === "/signup" ||
            saved.returnTo.startsWith("/signup?"))
          ? saved.returnTo
          : bots.length
            ? "/admin"
            : "/signup",
        base,
      ),
    );
  } catch (error) {
    console.error(
      "[hub] OAuth callback failed",
      error instanceof Error ? error.name : "Unknown error",
    );
    return NextResponse.redirect(
      new URL("/admin/login?error=oauth_failed", base),
    );
  }
}
