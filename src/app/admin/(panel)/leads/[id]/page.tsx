import Link from "next/link";
import { notFound } from "next/navigation";
import { LEAD_SOURCE_LABELS } from "@/domain/lead";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { LeadEditForm } from "@/components/admin/LeadEditForm";
import { Card, PageHeader, btnSecondary, fmtDateTime } from "@/components/admin/ui";

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;
  const c = await app();
  const lead = await c.leads.get(s.tenantId, id);
  if (!lead) notFound();
  return (
    <>
      <PageHeader
        title={lead.name}
        subtitle={`${LEAD_SOURCE_LABELS[lead.source]} · ${fmtDateTime(lead.createdAt)}`}
        actions={
          <Link href="/admin/leads" className={btnSecondary}>
            ← Danh sách
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Liên hệ">
          <dl className="space-y-2 text-[14px]">
            <div>
              <dt className="text-[12.5px] text-[var(--fg-muted)]">Điện thoại</dt>
              <dd>
                <a href={`tel:${lead.phone}`} className="font-medium tabular-nums underline">
                  {lead.phone}
                </a>{" "}
                ·{" "}
                <a href={`https://zalo.me/${lead.phone}`} target="_blank" rel="noreferrer" className="underline">
                  Zalo
                </a>
              </dd>
            </div>
            {lead.email && (
              <div>
                <dt className="text-[12.5px] text-[var(--fg-muted)]">Email</dt>
                <dd>{lead.email}</dd>
              </div>
            )}
            {lead.conversationId && (
              <div>
                <dt className="text-[12.5px] text-[var(--fg-muted)]">Hội thoại</dt>
                <dd>
                  <Link href={`/admin/conversations/${lead.conversationId}`} className="underline">
                    Xem cuộc chat
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </Card>
        <Card title="Cập nhật" className="lg:col-span-2">
          <LeadEditForm lead={{ id: lead.id, status: lead.status, note: lead.note, wonValue: lead.wonValue }} />
        </Card>
      </div>
    </>
  );
}
