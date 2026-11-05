import Link from "next/link";
import { NavLinks } from "@/components/admin/NavLinks";
import { requireSession } from "@/infrastructure/auth/session";
import { app, config } from "@/infrastructure/container";
import { logoutAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const s = await requireSession();
  const c = await app();
  const [tenant, counts] = await Promise.all([c.tenants.byId(s.tenantId), c.support.counts(s.tenantId)]);
  const models = c.chat.describeModels();
  return (
    <div className="min-h-dvh md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Bỏ qua điều hướng
      </a>
      <aside className="border-b border-[var(--border)] bg-[var(--surface)] md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-4">
          <Link href="/admin" className="block min-w-0">
            <p className="truncate text-[15px] font-semibold text-[var(--fg)]">{tenant?.settings.shopName ?? "Cửa hàng"}</p>
            <p className="text-[12.5px] text-[var(--fg-muted)]">Widget Norm · quản trị</p>
          </Link>
          <form action={logoutAction} className="md:hidden">
            <button className="min-h-10 px-2 text-[13px] text-[var(--fg-muted)]">Đăng xuất</button>
          </form>
        </div>
        <NavLinks openHandoffs={counts.open} />
        <div className="mt-auto hidden space-y-1.5 border-t border-[var(--border)] px-4 py-4 text-[12.5px] text-[var(--fg-muted)] md:block">
          <p className="font-medium text-[var(--fg)]">{s.name}</p>
          <p title="Tầng quyết định (Phase 2C)">
            Quyết định: <span className="font-mono text-[11.5px]">{models.decision}</span>
          </p>
          <p>
            LLM: <span className="font-mono text-[11.5px]">{config.llmProvider === "rules" ? "bot theo luật" : models.complex}</span>
          </p>
          <form action={logoutAction}>
            <button className="min-h-9 text-[var(--fg)] underline">Đăng xuất</button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 flex-1 px-4 py-6 md:px-8">
        {children}
      </main>
    </div>
  );
}
