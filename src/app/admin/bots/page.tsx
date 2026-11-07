import { localizeMeta } from "@/bots/localize";
import { getT } from "@/lib/i18n/server";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import Link from "next/link";
import { planById } from "@/domain/account";
import { BOT_METAS, metaByKind } from "@/bots/catalog";
import { requireAccount } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { CreateBotForm } from "@/components/admin/CreateBotForm";
import { Badge, Card, PageHeader, btnPrimary } from "@/components/admin/ui";
import { logoutAction, switchBotAction } from "../actions";

export const dynamic = "force-dynamic";

/** Quản lý các chatbot của tài khoản: chọn bot để quản trị, thêm bot mới (theo giới hạn gói) */
export default async function BotsPage() {
  const { t, locale } = await getT();
  const s = await requireAccount();
  const c = await app();
  const [account, bots] = await Promise.all([c.tenants.account(s.accountId), c.tenants.listByAccount(s.accountId)]);
  const plan = planById(account?.plan ?? "trial");
  const canAdd = bots.length < plan.maxBots;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title={t("Chatbot của bạn")}
        subtitle={`${t("Gói {plan}: {n}/{max} chatbot", { plan: plan.name, n: bots.length, max: plan.maxBots })}${account?.trialEndsAt ? ` · ${t("dùng thử đến {date}", { date: account.trialEndsAt.toLocaleDateString(locale === "en" ? "en-GB" : "vi-VN") })}` : ""}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/languages" className="min-h-10 px-2 text-[14px] leading-10 underline">
              {t("Quản lý ngôn ngữ")}
            </Link>
            <LanguageSwitch />
            <ThemeToggle />
            <form action={logoutAction}>
              <button className="min-h-10 px-2 text-[14px] underline">{t("Đăng xuất")}</button>
            </form>
          </div>
        }
      />
      <ul className="grid gap-4 sm:grid-cols-2">
        {bots.map((b) => {
          const m = metaByKind(b.kind);
          return (
            <li key={b.id} className="rounded-xl border border-[var(--border)] bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold">{b.name}</p>
                  <p className="text-[13px] text-[var(--fg-muted)]">{m.name}</p>
                </div>
                <Badge tone={b.status === "active" ? "green" : "gray"}>{b.status === "active" ? t("Đang chạy") : t("Tạm dừng")}</Badge>
              </div>
              <p className="mt-2 break-all font-mono text-[12px] text-[var(--fg-muted)]">/embed/{b.slug}</p>
              <form action={switchBotAction} className="mt-4">
                <input type="hidden" name="id" value={b.id} />
                <button className={btnPrimary}>{t("Quản trị chatbot này")}</button>
              </form>
            </li>
          );
        })}
      </ul>

      <Card title={t("Thêm chatbot")} className="mt-8">
        {canAdd ? (
          <CreateBotForm kinds={BOT_METAS.map((raw) => localizeMeta(raw, t)).map((m) => ({ kind: m.kind, name: m.name, tagline: m.tagline }))} />
        ) : (
          <p className="text-[14px] text-[var(--fg-muted)]">
            {t("Gói {plan} đã dùng hết {max} chatbot.", { plan: plan.name, max: plan.maxBots })} <Link href="/pricing" className="underline">{t("Xem các gói cao hơn")}</Link>.
          </p>
        )}
      </Card>
    </main>
  );
}
