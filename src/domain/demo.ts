/** Only platform-owned fixtures may bypass customer domain/subscription checks. */
export function isPublicDemo(
  tenant: { slug: string; kind: string },
  account: { email: string } | null,
) {
  const isDemoSlug =
    (tenant.kind === "store" &&
      ["avi-demo", "lumi-demo"].includes(tenant.slug)) ||
    (tenant.kind === "tile" && tenant.slug === "gach-dep-demo") ||
    (tenant.kind === "education" && tenant.slug === "trung-tam-demo") ||
    (tenant.kind === "furniture" && tenant.slug === "noi-that-demo");

  return isDemoSlug && account?.email === "admin@demo.vn";
}
