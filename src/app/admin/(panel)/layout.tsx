import Link from "next/link";
import { redirect } from "next/navigation";
import { NavLinks } from "@/components/admin/NavLinks";
import { requireSession } from "@/infrastructure/auth/session";
import { app, config } from "@/infrastructure/container";
import { metaByKind } from "@/bots/catalog";
import { logoutAction, switchBotAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const c = await app();
  const [tenant, counts, bots] = await Promise.all([c.tenants.byId(s.tenantId), c.support.counts(s.tenantId), c.tenants.listByAccount(s.accountId)]);
  // Phiên trỏ tới bot không còn thuộc tài khoản → chọn lại
  if (!tenant || tenant.accountId !== s.accountId) redirect("/admin/bots");
  const meta = metaByKind(tenant.kind);
  const account = await c.tenants.account(s.accountId);
  const trialLeft = account?.plan === "trial" && account.trialEndsAt ? Math.ceil((account.trialEndsAt.getTime() - Date.now()) / 86_400_000) : null;
  const models = c.chat.describeModels();
  return (
    <div className="min-h-dvh md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Bỏ qua điều hướng
      </a>
      <aside className="border-b border-[var(--border)] bg-[var(--surface)] md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/admin" className="block min-w-0">
            <p className="truncate text-[15px] font-semibold text-[var(--fg)]">{tenant.settings.shopName}</p>
            <p className="truncate text-[12.5px] text-[var(--fg-muted)]">{meta.shortName}</p>
          </Link>
          <form action={logoutAction} className="md:hidden">
            <button className="min-h-10 px-2 text-[13px] text-[var(--fg-muted)]">Đăng xuất</button>
          </form>
        </div>
        {bots.length > 1 && (
          <form action={switchBotAction} className="px-3 pb-2">
            <label htmlFor="bot-switch" className="sr-only">
              Chọn chatbot
            </label>
            <select
              id="bot-switch"
              name="id"
              defaultValue={tenant.id}
              className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-white px-2 text-[13.5px]"
            >
              {bots.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {metaByKind(b.kind).shortName}
                </option>
              ))}
            </select>
            <button className="mt-1 min-h-9 w-full rounded-lg border border-[var(--border)] text-[13px] font-medium hover:bg-[var(--surface-2)]">Chuyển chatbot</button>
          </form>
        )}
        <NavLinks openHandoffs={counts.open} botItems={meta.adminNav} />
        <div className="mt-auto hidden space-y-1.5 border-t border-[var(--border)] px-4 py-4 text-[12.5px] text-[var(--fg-muted)] md:block">
          <p className="font-medium text-[var(--fg)]">{s.name}</p>
          <p title="Tầng quyết định (Phase 2C)">
            Quyết định: <span className="font-mono text-[11.5px]">{models.decision}</span>
          </p>
          <p>
            LLM: <span className="font-mono text-[11.5px]">{config.llmProvider === "rules" ? "bot theo luật" : models.complex}</span>
          </p>
          <Link href="/admin/bots" className="block min-h-9 leading-9 text-[var(--fg)] underline">
            Quản lý chatbot ({bots.length})
          </Link>
          <form action={logoutAction}>
            <button className="min-h-9 text-[var(--fg)] underline">Đăng xuất</button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-8">
        {trialLeft !== null && (
          <p role="status" className={`mb-4 rounded-lg px-4 py-2.5 text-[14px] ${trialLeft > 3 ? "bg-blue-50 text-blue-900" : "bg-amber-50 text-amber-900"}`}>
            {trialLeft > 0 ? `Đang dùng thử — còn ${trialLeft} ngày.` : "Đã hết hạn dùng thử — chatbot trên website đang tạm ngưng."} <Link href="/pricing" className="font-medium underline">Xem các gói</Link>
          </p>
        )}
        {children}
      </main>
    </div>
  );
}
