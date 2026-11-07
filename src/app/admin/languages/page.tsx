import Link from "next/link";
import { metaByKind } from "@/bots/catalog";
import { Badge, Card, PageHeader, btnPrimary } from "@/components/admin/ui";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { CHAT_LANGS, CHAT_LANG_LABELS } from "@/domain/chat-text";
import { requireAccount } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { languageStatuses } from "@/lib/i18n/coverage";
import { getT } from "@/lib/i18n/server";
import { setBotLanguageAction } from "../actions";

export const dynamic = "force-dynamic";

function Bar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 100;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12.5px] tabular-nums text-[var(--fg-muted)]">
        {done}/{total}
      </span>
    </div>
  );
}

/**
 * Quản lý ngôn ngữ tập trung: danh sách ngôn ngữ hệ thống hỗ trợ + mức đã dịch, ngôn ngữ trả lời của từng chatbot,
 * và hướng dẫn thêm ngôn ngữ mới. Danh sách ngôn ngữ khai báo ở một chỗ: lib/i18n/languages.ts.
 */
export default async function LanguagesPage() {
  const { t } = await getT();
  const s = await requireAccount();
  const c = await app();
  const bots = await c.tenants.listByAccount(s.accountId);
  const langs = languageStatuses();
  const th = "px-3 py-2 text-left text-[12.5px] font-semibold text-[var(--fg-muted)]";
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        title={t("Ngôn ngữ")}
        subtitle={t("Quản lý các ngôn ngữ của giao diện và của từng chatbot ở một nơi")}
        actions={
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <ThemeToggle />
            <Link href="/admin/bots" className="min-h-10 px-2 text-[14px] leading-10 underline">
              {t("Chatbot của bạn")}
            </Link>
          </div>
        }
      />

      <Card title={t("Ngôn ngữ hệ thống hỗ trợ")} className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[14px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className={th}>{t("Ngôn ngữ")}</th>
                <th className={th}>{t("Giao diện website + admin")}</th>
                <th className={th}>{t("Chữ trong widget chat")}</th>
                <th className={th}>{t("Chatbot trả lời")}</th>
                <th className={th}>{t("File cần dịch")}</th>
              </tr>
            </thead>
            <tbody>
              {langs.map((l) => (
                <tr key={l.code} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-semibold">
                      {l.name} <span className="font-mono text-[12px] font-normal text-[var(--fg-muted)]">{l.code}</span>
                    </p>
                    {l.base && <p className="text-[12.5px] text-[var(--fg-muted)]">{t("Ngôn ngữ gốc của mã nguồn")}</p>}
                  </td>
                  <td className="px-3 py-3">{l.ui ? <Bar done={l.uiDone} total={l.uiTotal} /> : <Badge tone="gray">{t("Chưa bật")}</Badge>}</td>
                  <td className="px-3 py-3">{<Bar done={l.widgetDone} total={l.widgetTotal} />}</td>
                  <td className="px-3 py-3">{l.chat && l.chatPack ? <Badge tone="green">{t("Sẵn sàng")}</Badge> : <Badge tone="gray">{t("Chưa có gói câu mẫu")}</Badge>}</td>
                  <td className="px-3 py-3 text-[13px]">
                    {l.base ? (
                      <span className="text-[var(--fg-muted)]">—</span>
                    ) : (
                      <span className="flex flex-wrap gap-x-3">
                        <a className="underline" href={`/admin/languages/export?lang=${l.code}&scope=ui`}>
                          {t("Giao diện")} (.json)
                        </a>
                        <a className="underline" href={`/admin/languages/export?lang=${l.code}&scope=widget`}>
                          {t("Widget")} (.json)
                        </a>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[13px] text-[var(--fg-muted)]">{t("Câu chưa dịch tự hiện bằng tiếng Anh (rồi tiếng Việt) nên không bao giờ vỡ giao diện.")}</p>
      </Card>

      <Card title={t("Ngôn ngữ trả lời của từng chatbot")} className="mb-6">
        <ul className="divide-y divide-[var(--border)]">
          {bots.map((b) => (
            <li key={b.id} className="py-3">
              <form action={setBotLanguageAction} className="flex flex-wrap items-center gap-3">
                <input type="hidden" name="id" value={b.id} />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate text-[15px] font-semibold">{b.name}</p>
                  <p className="text-[13px] text-[var(--fg-muted)]">{t(metaByKind(b.kind).name)}</p>
                </div>
                <select name="language" defaultValue={b.settings.language ?? "vi"} className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[14px]" aria-label={t("Ngôn ngữ chatbot")}>
                  {CHAT_LANGS.map((l) => (
                    <option key={l} value={l}>
                      {CHAT_LANG_LABELS[l]}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-[13px] text-[var(--fg-muted)]">
                  <input type="checkbox" name="resetTexts" className="h-4 w-4" />
                  {t("Đặt lại lời chào và nút gợi ý theo ngôn ngữ")}
                </label>
                <button className={btnPrimary}>{t("Lưu")}</button>
              </form>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t("Thêm một ngôn ngữ mới")}>
        <ol className="list-decimal space-y-2 pl-5 text-[14px] leading-relaxed">
          <li>
            {t("Khai báo ngôn ngữ trong")} <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[12.5px]">src/lib/i18n/languages.ts</code>.
          </li>
          <li>
            {t("Tải file JSON các câu chưa dịch ở bảng trên, gửi người dịch, rồi thêm vào")} <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[12.5px]">src/lib/i18n/messages/&lt;mã&gt;/</code>{" "}
            {t("(giao diện) và")} <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[12.5px]">src/lib/i18n/widget/&lt;mã&gt;.ts</code> ({t("widget")}).
          </li>
          <li>
            {t("Để chatbot trả lời bằng ngôn ngữ đó, viết gói câu mẫu")} <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 text-[12.5px]">src/domain/chat-packs/&lt;mã&gt;.ts</code> — {t("TypeScript báo thiếu trường nào.")}
          </li>
        </ol>
      </Card>
    </main>
  );
}
