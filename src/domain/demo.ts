/** Only platform-owned fixtures may bypass customer domain/subscription checks. */
export function isPublicDemo(
  tenant: { slug: string; kind: string },
  account: { email: string } | null,
) {
  return (
    account?.email === "admin@demo.vn" &&
    ((tenant.kind === "store" &&
      ["avi-demo", "lumi-demo"].includes(tenant.slug)) ||
      (tenant.kind === "tile" && tenant.slug === "gach-dep-demo"))
  );
}
