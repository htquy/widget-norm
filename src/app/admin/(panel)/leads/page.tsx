import Link from "next/link";
import { LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/domain/lead";
import { formatVnd } from "@/domain/text";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { Badge, Empty, LEAD_TONE, PageHeader, btnSecondary, fieldCls, fmtDateTime } from "@/components/admin/ui";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const s = await requireSession();
  const sp = await searchParams;
  const status = (LEAD_STATUSES as readonly string[]).includes(sp.status ?? "") ? (sp.status as LeadStatus) : undefined;
  const c = await app();
  const leads = await c.leads.list(s.tenantId, { status, search: sp.q?.trim() || undefined });

  return (
    <>
      <PageHeader
        title="Khách tiềm năng"
        subtitle="Khách để lại liên hệ, xin gọi lại hoặc đặt lịch qua chatbot"
        actions={
          <a href={`/admin/export/leads${status ? `?status=${status}` : ""}`} className={btnSecondary}>
            Xuất CSV
          </a>
        }
      />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="status">
          Trạng thái
        </label>
        <select id="status" name="status" defaultValue={status ?? ""} className={`${fieldCls} w-auto`}>
          <option value="">Mọi trạng thái</option>
          {LEAD_STATUSES.map((st) => (
            <option key={st} value={st}>
              {LEAD_STATUS_LABELS[st]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="q">
          Tìm
        </label>
        <input id="q" name="q" defaultValue={sp.q} placeholder="Tên, SĐT, ghi chú…" className={`${fieldCls} max-w-xs`} />
        <button className={btnSecondary}>Lọc</button>
      </form>
      {leads.length === 0 ? (
        <Empty>Chưa có khách tiềm năng.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
          <table className="w-full min-w-[720px] text-[14px]">
            <thead className="bg-[var(--surface-2)] text-left text-[12.5px] text-[var(--fg-muted)]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Khách</th>
                <th className="px-4 py-2.5 font-medium">Nguồn</th>
                <th className="px-4 py-2.5 font-medium">Ghi chú</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 text-right font-medium">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {leads.map((l) => (
                <tr key={l.id} className="hover:bg-[var(--surface-2)]">
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/leads/${l.id}`} className="font-medium underline-offset-2 hover:underline">
                      {l.name}
                    </Link>
                    <p className="text-[13px] tabular-nums text-[var(--fg-muted)]">{l.phone}</p>
                  </td>
                  <td className="px-4 py-2.5 text-[13px]">{LEAD_SOURCE_LABELS[l.source]}</td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-[13px] text-[var(--fg-muted)]" title={l.note}>
                    {l.note}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={LEAD_TONE[l.status]}>{LEAD_STATUS_LABELS[l.status]}</Badge>
                    {l.wonValue ? <p className="text-[12.5px] tabular-nums">{formatVnd(l.wonValue)}</p> : null}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[13px] tabular-nums text-[var(--fg-muted)]">{fmtDateTime(l.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
