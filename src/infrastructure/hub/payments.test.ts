import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({
  hubAccessToken: vi.fn(),
  hubFetch: vi.fn(),
  seal: vi.fn(),
  unseal: vi.fn(),
}));
vi.mock("./billing", () => ({ activateLicense: vi.fn() }));
import { hubAccessToken, hubFetch, seal, unseal } from "./client";
import { activateLicense } from "./billing";
import { beginHubCheckout, listHubPrices, pollHubPayment } from "./payments";

const catalog = {
  data: {
    app: { slug: "avi" },
    plans: [
      {
        name: "Cơ bản",
        isActive: true,
        prices: [
          {
            id: "avi-monthly",
            months: 1,
            amount: 199000,
            currency: "VND",
            isActive: true,
          },
        ],
      },
    ],
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(hubAccessToken).mockResolvedValue("server-only-token");
  vi.mocked(seal).mockResolvedValue("opaque-payment-ticket");
  vi.mocked(unseal).mockResolvedValue({
    accountId: "owner",
    tenantId: "bot-a",
    kind: "store",
    orderId: "order-a",
  });
  vi.mocked(hubFetch).mockImplementation(async (url) => {
    if (url === "/api/apps/avi") return catalog;
    if (url === "/api/orders")
      return {
        order: {
          id: "order-a",
          orderCode: "AVI123",
          amount: 199000,
          currency: "VND",
          expiresAt: "2030-01-01T00:00:00Z",
          status: "PENDING",
        },
      };
    if (url.endsWith("/payment"))
      return {
        qrDataUrl: "data:image/png;base64,dGVzdA==",
        bankName: "Test bank",
        accountNumber: "123456",
        accountHolder: "TEST",
        description: "AVI123",
      };
    return { status: "PENDING" };
  });
});

describe("hub checkout API", () => {
  it("accepts the hub's legacy VietQR HTTPS image fallback", async () => {
    const original = vi.mocked(hubFetch).getMockImplementation()!;
    vi.mocked(hubFetch).mockImplementation(async (url, init) =>
      url.endsWith("/payment")
        ? {
            qrDataUrl: "https://img.vietqr.io/image/bank-account.png",
            bankName: "Test",
            accountNumber: "123",
            accountHolder: "TEST",
            description: "AVI123",
          }
        : original(url, init),
    );
    expect(
      (await beginHubCheckout("owner", "bot-a", "store", "avi-monthly"))
        .qrDataUrl,
    ).toMatch(/^https:\/\/img\.vietqr\.io\//);
  });
  it("uses hub catalogue/prices and never accepts an amount from the browser", async () => {
    expect(await listHubPrices("store")).toMatchObject([
      { id: "avi-monthly", amount: 199000 },
    ]);
    const payment = await beginHubCheckout(
      "owner",
      "bot-a",
      "store",
      "avi-monthly",
    );
    expect(hubFetch).toHaveBeenCalledWith(
      "/api/orders",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer server-only-token",
        }),
        body: JSON.stringify({ planPriceId: "avi-monthly" }),
      }),
    );
    expect(payment).toMatchObject({
      amount: 199000,
      orderCode: "AVI123",
      ticket: "opaque-payment-ticket",
    });
    expect(JSON.stringify(payment)).not.toContain("server-only-token");
    expect(seal).toHaveBeenCalledWith(
      {
        orderId: "order-a",
        accountId: "owner",
        tenantId: "bot-a",
        kind: "store",
      },
      "1h",
    );
  });
  it("rejects a different bot's price before creating any order", async () => {
    await expect(
      beginHubCheckout("owner", "bot-a", "store", "tile-monthly"),
    ).rejects.toMatchObject({ code: "BAD_PRICE" });
    expect(
      vi.mocked(hubFetch).mock.calls.every(([url]) => url !== "/api/orders"),
    ).toBe(true);
  });
  it("binds status polling to both the authenticated account and selected bot", async () => {
    await expect(
      pollHubPayment("other-owner", "bot-a", "ticket"),
    ).rejects.toThrow();
    await expect(
      pollHubPayment("owner", "other-bot", "ticket"),
    ).rejects.toThrow();
    expect(hubFetch).not.toHaveBeenCalled();
  });
  it("activates only after PAID and rechecks hub entitlements through the license service", async () => {
    expect(await pollHubPayment("owner", "bot-a", "ticket")).toBe("PENDING");
    expect(activateLicense).not.toHaveBeenCalled();
    vi.mocked(hubFetch).mockResolvedValue({ status: "PAID", unlocked: true });
    expect(await pollHubPayment("owner", "bot-a", "ticket")).toBe("PAID");
    expect(activateLicense).toHaveBeenCalledWith("owner", "store", "bot-a");
    vi.mocked(activateLicense).mockRejectedValueOnce(
      new Error("Hub entitlement revoked"),
    );
    await expect(pollHubPayment("owner", "bot-a", "ticket")).rejects.toThrow(
      "revoked",
    );
  });
});
