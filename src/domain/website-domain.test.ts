import { describe, expect, it } from "vitest";
import { normalizeDomain } from "./website-domain";
import { BOT_PRICING } from "./bot-pricing";

describe("website identity and pricing", () => {
  it("collapses case, scheme, www, paths and trailing dots into one ownership key", () => {
    for (const input of [
      "EXAMPLE.COM",
      "www.example.com",
      "https://WWW.Example.COM./shop?a=1",
      "http://example.com/",
    ])
      expect(normalizeDomain(input)).toBe("example.com");
    expect(normalizeDomain("https://đẹp.vn")).toMatch(/^xn--/);
  });
  it("rejects local endpoints, credentials, IP addresses, invalid labels and custom ports", () => {
    for (const input of [
      "",
      "localhost",
      "127.0.0.1",
      "https://[::1]",
      "ftp://example.com",
      "https://user:pass@example.com",
      "https://example.com:8080",
      "x.local",
      "x.localhost",
      "-bad.vn",
      "*.example.com",
      "bad_domain.vn",
    ])
      expect(() => normalizeDomain(input), input).toThrow();
  });
  it("industry pricing always exceeds AVI and includes the common capabilities", () => {
    expect(BOT_PRICING.tile.monthly).toBeGreaterThan(BOT_PRICING.store.monthly);
    expect(BOT_PRICING.tile.proMonthly).toBeGreaterThan(
      BOT_PRICING.store.proMonthly,
    );
    expect(BOT_PRICING.tile.includes[0]).toContain("AVI");
  });
});
