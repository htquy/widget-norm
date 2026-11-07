import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Bot, FlaskConical, ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { NavLinks } from "@/components/admin/NavLinks";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { metaByKind } from "@/bots/catalog";
import { logoutAction, switchBotAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getT();
  const s = await requireSession();
  const c = await app();
  const [tenant, counts, bots] = await Promise.all([
    c.tenants.byId(s.tenantId),
    c.support.counts(s.tenantId),
    c.tenants.listByAccount(s.accountId),
  ]);
  // Phiên trỏ tới bot không còn thuộc tài khoản → chọn lại
  if (!tenant || tenant.accountId !== s.accountId) redirect("/admin/bots");
  const meta = metaByKind(tenant.kind);
  const account = await c.tenants.account(s.accountId);
  const trialLeft =
    account?.plan === "trial" && account.trialEndsAt
      ? Math.ceil((account.trialEndsAt.getTime() - Date.now()) / 86_400_000)
      : null;
  return (
    <div className="admin-shell min-h-dvh md:flex">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        {t("Bỏ qua điều hướng")}
      </a>
      <aside className="admin-sidebar border-b border-[var(--border)] md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-500 text-white">
              <Bot className="size-6" />
            </span>
            <span>
              <span className="block truncate text-[15px] font-semibold text-white">
                {tenant.settings.shopName}
              </span>
              <span className="block text-xs text-indigo-200">
                {meta.shortName} workspace
              </span>
            </span>
          </Link>
          <form action={logoutAction} className="md:hidden">
            <button className="min-h-11 px-2 text-[13px] text-white">
              {t("Đăng xuất")}
            </button>
          </form>
        </div>
        {bots.length > 1 && (
          <form action={switchBotAction} className="px-3 pb-2">
            <label htmlFor="bot-switch" className="sr-only">
              {t("Chọn chatbot")}
            </label>
            <select
              id="bot-switch"
              name="id"
              defaultValue={tenant.id}
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-[13.5px]"
            >
              {bots.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {metaByKind(b.kind).shortName}
                </option>
              ))}
            </select>
            <button className="mt-1 min-h-11 w-full rounded-lg border border-[var(--border)] text-[13px] font-medium hover:bg-[var(--surface-2)]">
              {t("Chuyển chatbot")}
            </button>
          </form>
        )}
        <NavLinks openHandoffs={counts.open} botItems={meta.adminNav} />
        <div className="admin-user mt-auto hidden space-y-1.5 border-t px-4 py-4 text-[12.5px] md:block">
          <p className="font-medium text-[var(--fg)]">{s.name}</p>
          <p>{t("Không gian quản lý cửa hàng")}</p>
          <Link
            href="/admin/bots"
            className="block min-h-9 leading-9 text-[var(--fg)] underline"
          >
            {t("Quản lý chatbot ({n})", { n: bots.length })}
          </Link>
          <form action={logoutAction}>
            <button className="min-h-9 text-[var(--fg)] underline">
              {t("Đăng xuất")}
            </button>
          </form>
        </div>
      </aside>
      <main
        id="main"
        className="admin-main min-w-0 flex-1 px-4 py-6 md:px-8 lg:px-10"
      >
        <div className="admin-topbar">
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <span>Workspace</span>
            <ChevronRight className="size-3" />
            <span className="font-medium text-zinc-800">{meta.shortName}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <ThemeToggle />
            <Link
              href="/admin/playground"
              className="flex min-h-11 items-center gap-2 rounded-xl border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-800"
            >
              <FlaskConical className="size-4" />
              {t("Thử chatbot")}
            </Link>
          </div>
        </div>
        {trialLeft !== null && (
          <p
            role="status"
            className={`mb-4 rounded-lg px-4 py-2.5 text-[14px] ${trialLeft > 3 ? "bg-blue-50 text-blue-900" : "bg-amber-50 text-amber-900"}`}
          >
            {trialLeft > 0
              ? t("Đang dùng thử — còn {n} ngày.", { n: trialLeft })
              : t("Dùng thử đã kết thúc. Kiểm tra trạng thái gói trả phí tại Domain & thanh toán.")}{" "}
            <Link href="/admin/billing" className="font-medium underline">
              {t("Domain & thanh toán")}
            </Link>
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
