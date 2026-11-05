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
  const s = await requireAccount();
  const c = await app();
  const [account, bots] = await Promise.all([c.tenants.account(s.accountId), c.tenants.listByAccount(s.accountId)]);
  const plan = planById(account?.plan ?? "trial");
  const canAdd = bots.length < plan.maxBots;
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        title="Chatbot của bạn"
        subtitle={`Gói ${plan.name}: ${bots.length}/${plan.maxBots} chatbot${account?.trialEndsAt ? ` · dùng thử đến ${account.trialEndsAt.toLocaleDateString("vi-VN")}` : ""}`}
        actions={
          <form action={logoutAction}>
            <button className="min-h-10 px-2 text-[14px] underline">Đăng xuất</button>
          </form>
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
                <Badge tone={b.status === "active" ? "green" : "gray"}>{b.status === "active" ? "Đang chạy" : "Tạm dừng"}</Badge>
              </div>
              <p className="mt-2 break-all font-mono text-[12px] text-[var(--fg-muted)]">/embed/{b.slug}</p>
              <form action={switchBotAction} className="mt-4">
                <input type="hidden" name="id" value={b.id} />
                <button className={btnPrimary}>Quản trị chatbot này</button>
              </form>
            </li>
          );
        })}
      </ul>

      <Card title="Thêm chatbot" className="mt-8">
        {canAdd ? (
          <CreateBotForm kinds={BOT_METAS.map((m) => ({ kind: m.kind, name: m.name, tagline: m.tagline }))} />
        ) : (
          <p className="text-[14px] text-[var(--fg-muted)]">
            Gói {plan.name} đã dùng hết {plan.maxBots} chatbot. <Link href="/pricing" className="underline">Xem các gói cao hơn</Link>.
          </p>
        )}
      </Card>
    </main>
  );
}
