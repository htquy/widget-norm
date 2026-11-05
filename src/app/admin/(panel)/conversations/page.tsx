import Link from "next/link";
import { HANDOFF_REASON_LABELS } from "@/domain/decision";
import type { HandoffStatus } from "@/domain/conversation";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { Badge, Empty, PageHeader, btnSecondary, fieldCls, fmtDateTime } from "@/components/admin/ui";

const TABS: { key: HandoffStatus | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "open", label: "Cần hỗ trợ" },
  { key: "resolved", label: "Đã xử lý" },
];

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<{ handoff?: string; q?: string; page?: string }> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const handoff = sp.handoff === "open" || sp.handoff === "resolved" ? sp.handoff : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const c = await app();
  const [list, counts] = await Promise.all([c.chat.list(s.tenantId, { limit: 30, offset: (page - 1) * 30, handoff, search: sp.q?.trim() || undefined }), c.support.counts(s.tenantId)]);
  const qs = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ handoff, q: sp.q, ...o }).filter(([, v]) => v) as [string, string][]);
    return p.toString() ? `?${p}` : "";
  };

  return (
    <>
      <AutoRefresh seconds={15} />
      <PageHeader title="Hội thoại" subtitle="Đọc lại cuộc chat, nhận hỗ trợ khách khi bot cần nhân viên" />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav aria-label="Lọc" className="flex rounded-lg border border-[var(--border)] bg-white p-0.5 text-[13px]">
          {TABS.map((t) => {
            const active = (t.key === "all" && !handoff) || t.key === handoff;
            return (
              <Link
                key={t.key}
                href={`/admin/conversations${t.key === "all" ? qs({ handoff: undefined, page: undefined }) : qs({ handoff: t.key, page: undefined })}`}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-9 items-center gap-1.5 rounded-md px-3 ${active ? "bg-[var(--fg)] text-white" : "text-[var(--fg-muted)]"}`}
              >
                {t.label}
                {t.key === "open" && counts.open > 0 && <span className="rounded-full bg-red-600 px-1.5 text-[11.5px] text-white">{counts.open}</span>}
              </Link>
            );
          })}
        </nav>
        <form className="flex flex-1 gap-2" role="search">
          {handoff && <input type="hidden" name="handoff" value={handoff} />}
          <label htmlFor="q" className="sr-only">
            Tìm trong nội dung chat
          </label>
          <input id="q" name="q" defaultValue={sp.q} placeholder="Tìm trong nội dung chat…" className={`${fieldCls} max-w-sm`} />
          <button className={btnSecondary}>Tìm</button>
        </form>
      </div>

      {list.length === 0 ? (
        <Empty>Không có hội thoại nào.</Empty>
      ) : (
        <ul className="divide-y divide-[var(--border)] overflow-hidden rounded-xl border border-[var(--border)] bg-white">
          {list.map((r) => (
            <li key={r.id}>
              <Link href={`/admin/conversations/${r.id}`} className="flex flex-col gap-1 px-4 py-3 hover:bg-[var(--surface-2)] sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {r.handoffStatus === "open" && <Badge tone="red">Cần hỗ trợ{r.handoffReason ? ` · ${HANDOFF_REASON_LABELS[r.handoffReason]}` : ""}</Badge>}
                    {r.handoffStatus === "resolved" && <Badge tone="green">Đã xử lý</Badge>}
                    {r.mode === "human" && <Badge tone="violet">Nhân viên đang chat</Badge>}
                    {r.hasLead && <Badge tone="blue">Có SĐT</Badge>}
                    {r.rating && <Badge tone="amber">{r.rating}★</Badge>}
                    <span className="text-[12.5px] text-[var(--fg-muted)]">
                      {r.messageCount} tin · khách {r.visitorId.slice(0, 8)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[14px] text-[var(--fg)]">
                    <span className="text-[var(--fg-muted)]">{r.lastRole === "user" ? "Khách: " : r.lastRole === "agent" ? "Nhân viên: " : "Bot: "}</span>
                    {r.lastMessage}
                  </p>
                </div>
                <span className="shrink-0 text-[12.5px] tabular-nums text-[var(--fg-muted)]">{fmtDateTime(r.updatedAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-between">
        {page > 1 ? (
          <Link className={btnSecondary} href={`/admin/conversations${qs({ page: String(page - 1) })}`}>
            ← Trang trước
          </Link>
        ) : (
          <span />
        )}
        {list.length === 30 && (
          <Link className={btnSecondary} href={`/admin/conversations${qs({ page: String(page + 1) })}`}>
            Trang sau →
          </Link>
        )}
      </div>
    </>
  );
}
