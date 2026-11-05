import { beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import * as schema from "./db/schema";
import type { DB } from "./db/client";

vi.mock("server-only", () => ({}));
let db: DB;
vi.mock("./db/client", () => ({ getDb: async () => db }));
vi.mock("node:dns/promises", () => ({ resolveTxt: vi.fn() }));
import { resolveTxt } from "node:dns/promises";
import {
  assertOwnedOrigins,
  listDomains,
  registerDomain,
  verifyDomain,
} from "./domains";
import { connectIdentity, seal, unseal } from "./hub/client";
import { activateLicense, licensedBot } from "./hub/billing";
import { defaultSettings } from "@/domain/tenant";

beforeAll(async () => {
  db = drizzle(new PGlite(), { schema }) as unknown as DB;
  for (const statement of schema.DDL) await db.execute(sql.raw(statement));
  vi.stubEnv("AUTH_SECRET", "avi-test-secret-that-is-long-enough");
});

describe("domain ownership", () => {
  it("blocks a second account even when scheme, www, case and path differ", async () => {
    const first = await registerDomain("owner-a", "www.Shop.Example/hello");
    expect(
      await registerDomain("owner-a", "https://shop.example"),
    ).toMatchObject({ token: first.token });
    await expect(
      registerDomain("other-email", "https://WWW.SHOP.EXAMPLE/"),
    ).rejects.toMatchObject({ code: "DOMAIN_TAKEN" });
  });
  it("database uniqueness chooses exactly one winner under concurrent signup", async () => {
    const result = await Promise.allSettled([
      registerDomain("racer-a", "race.example"),
      registerDomain("racer-b", "www.race.example"),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(result.filter((r) => r.status === "rejected")).toHaveLength(1);
  });
  it("requires exact DNS proof, preserves verified ownership and prevents unauthorized origin changes", async () => {
    const record = await registerDomain("owner-dns", "dns.example");
    vi.mocked(resolveTxt).mockResolvedValueOnce([["wrong-token"]]);
    await expect(
      verifyDomain("owner-dns", "dns.example"),
    ).rejects.toMatchObject({ code: "DNS_PENDING" });
    await expect(
      assertOwnedOrigins("owner-dns", ["https://dns.example"]),
    ).rejects.toMatchObject({ code: "DOMAIN_UNVERIFIED" });
    vi.mocked(resolveTxt).mockResolvedValueOnce([
      ["avi-verification=", record.token],
    ]);
    await verifyDomain("owner-dns", "www.dns.example");
    await expect(
      assertOwnedOrigins("owner-dns", [
        "https://dns.example",
        "https://www.dns.example",
      ]),
    ).resolves.toBeUndefined();
    await expect(
      assertOwnedOrigins("other", ["https://dns.example"]),
    ).rejects.toMatchObject({ code: "DOMAIN_UNVERIFIED" });
    await db
      .update(schema.websiteDomains)
      .set({ createdAt: new Date(0) })
      .where(eq(schema.websiteDomains.domain, "dns.example"));
    await expect(
      registerDomain("new-email", "dns.example"),
    ).rejects.toMatchObject({ code: "DOMAIN_TAKEN" });
    expect((await listDomains("owner-dns"))[0].verifiedAt).toBeInstanceOf(Date);
  });
  it("expires unverified reservations without recycling verified domains", async () => {
    await registerDomain("abandoned", "pending.example");
    await db
      .update(schema.websiteDomains)
      .set({ createdAt: new Date(0) })
      .where(eq(schema.websiteDomains.domain, "pending.example"));
    expect(
      await registerDomain("actual-owner", "pending.example"),
    ).toMatchObject({ accountId: "actual-owner" });
  });
});

describe("hub identity boundary", () => {
  const tokens = {
    access_token: "not-a-real-access-token",
    refresh_token: "not-a-real-refresh-token",
    expires_in: 3600,
  };
  it("encrypts credentials and rejects tampering", async () => {
    const encrypted = await seal({ accessToken: tokens.access_token });
    expect(encrypted).not.toContain(tokens.access_token);
    expect(await unseal(encrypted)).toMatchObject({
      accessToken: tokens.access_token,
    });
    const parts = encrypted.split(".");
    parts[3] = `${parts[3][0] === "a" ? "b" : "a"}${parts[3].slice(1)}`;
    await expect(unseal(parts.join("."))).rejects.toThrow();
  });
  it("uses subject as identity, never silently merges two identities sharing an email", async () => {
    const a = await connectIdentity(
      { sub: "hub-one", email: "same@example.com" },
      tokens,
    );
    const b = await connectIdentity(
      { sub: "hub-two", email: "same@example.com" },
      tokens,
    );
    expect(a).not.toBe(b);
    expect(
      await connectIdentity(
        { sub: "hub-one", email: "changed@example.com" },
        tokens,
      ),
    ).toBe(a);
    await expect(
      connectIdentity({ sub: "hub-one", email: "same@example.com" }, tokens, b),
    ).rejects.toMatchObject({ code: "HUB_ALREADY_LINKED" });
  });
});

describe("paid bot license", () => {
  it("requires server-confirmed payment, enforces ownership and binds one bot per subscription type", async () => {
    const accountId = await connectIdentity(
      { sub: "licensed-user", email: "licensed@example.com" },
      {
        access_token: "test-access",
        refresh_token: "test-refresh",
        expires_in: 3600,
      },
    );
    await db.insert(schema.tenants).values([
      {
        id: "licensed-a",
        accountId,
        kind: "store",
        slug: "licensed-a",
        name: "A",
        settings: defaultSettings("A"),
      },
      {
        id: "licensed-b",
        accountId,
        kind: "store",
        slug: "licensed-b",
        name: "B",
        settings: defaultSettings("B"),
      },
      {
        id: "foreign-bot",
        accountId: "other",
        kind: "store",
        slug: "foreign-bot",
        name: "Other",
        settings: defaultSettings("Other"),
      },
    ]);
    vi.stubEnv("HUB_BASE_URL", "https://hub.example");
    vi.stubEnv("HUB_CLIENT_ID", "test-client");
    const access = {
      success: true,
      data: {
        hasActiveSubscription: true,
        isPaid: true,
        unlockedFeatures: [],
        subscription: { endsAt: "2030-01-01T00:00:00.000Z", planName: "AVI" },
      },
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => Response.json(access));
    try {
      await activateLicense(accountId, "store", "licensed-a");
      expect(await licensedBot(accountId, "store")).toBe("licensed-a");
      await activateLicense(accountId, "store", "licensed-b");
      expect(await licensedBot(accountId, "store")).toBe("licensed-b");
      await expect(
        activateLicense(accountId, "store", "foreign-bot"),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      access.data.isPaid = false;
      await expect(
        activateLicense(accountId, "store", "licensed-a"),
      ).rejects.toMatchObject({ code: "PAYMENT_PENDING" });
      expect(await licensedBot(accountId, "store")).toBe("licensed-b");
    } finally {
      fetchMock.mockRestore();
    }
  });
});
