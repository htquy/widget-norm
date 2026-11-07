import { getT } from "@/lib/i18n/server";
import { headers } from "next/headers";
import { requireSession } from "@/infrastructure/auth/session";
import { app, config } from "@/infrastructure/container";
import { ThemeEditor } from "@/components/admin/ThemeEditor";
import { PageHeader } from "@/components/admin/ui";

export default async function WidgetPage() {
  const { t } = await getT();
  const s = await requireSession();
  const c = await app();
  const tenant = await c.tenants.byId(s.tenantId);
  if (!tenant) return null;
  const h = await headers();
  const base = process.env.PUBLIC_BASE_URL ? config.baseUrl : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  return (
    <>
      <PageHeader title={t("Giao diện widget")} subtitle={t("Màu, vị trí, kiểu nút, tên trợ lý, lời mời — lưu là áp dụng cho website, không cần đổi mã nhúng")} />
      <ThemeEditor tenantSlug={tenant.slug} initial={c.tenants.publicConfig(tenant)} greeting={tenant.settings.greeting} base={base} />
    </>
  );
}
