import { describe, expect, it } from "vitest";
import { isPublicDemo } from "./demo";
describe("public sample widgets", () => {
  it("allows only the correctly typed platform fixtures", () => {
    expect(
      isPublicDemo(
        { slug: "avi-demo", kind: "store" },
        { email: "admin@demo.vn" },
      ),
    ).toBe(true);
    expect(
      isPublicDemo(
        { slug: "gach-dep-demo", kind: "tile" },
        { email: "admin@demo.vn" },
      ),
    ).toBe(true);
    expect(
      isPublicDemo(
        { slug: "avi-demo", kind: "tile" },
        { email: "admin@demo.vn" },
      ),
    ).toBe(false);
  });
  it("does not turn customer bots into public demos merely by naming them avi-demo", () => {
    expect(
      isPublicDemo(
        { slug: "avi-demo", kind: "store" },
        { email: "customer@example.com" },
      ),
    ).toBe(false);
    expect(isPublicDemo({ slug: "gach-dep-demo", kind: "tile" }, null)).toBe(
      false,
    );
    expect(
      isPublicDemo(
        { slug: "my-shop", kind: "store" },
        { email: "admin@demo.vn" },
      ),
    ).toBe(false);
  });
});
