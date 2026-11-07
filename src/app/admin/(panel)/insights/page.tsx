import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { BarList, DailyBars, S1, S2, S3, S4 } from "@/components/admin/Charts";
import { NeedsSummary } from "@/components/admin/NeedsSummary";
import { Card, Empty, PageHeader, RangeTabs, Stat, btnSecondary, fmtDateTime, num, parseDays, pct, rangeFor } from "@/components/admin/ui";

const SENTIMENT: Record<string, string> = { positive: "Tích cực", neutral: "Trung lập", negative: "Tiêu cực" };

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { t } = await getT();
  const s = await requireSession();
  const days = parseDays((await searchParams).days);
  const c = await app();
  const r = await c.insights.report(s.tenantId, rangeFor(days));
  const neg = r.sentiment.find((x) => x.sentiment === "negative")?.count ?? 0;
  const noLlm = r.handledBy.filter((h) => h.handledBy === "template" || h.handledBy === "handoff").reduce((a, h) => a + h.count, 0);

  return (
    <>
      <PageHeader
        title={t("Phân tích nhu cầu khách")}
        subtitle={t("Mỗi câu hỏi được tầng quyết định (jev) gắn nhãn, chủ đề, cảm xúc và nhu cầu — tổng hợp tại đây")}
        actions={
          <div className="flex flex-wrap gap-2">
            <RangeTabs days={days} base="/admin/insights" />
            <a href={`/admin/export/questions?days=${days}`} className={btnSecondary}>
              {t("Xuất CSV câu hỏi")}
            </a>
          </div>
        }
      />

      {r.total === 0 ? (
        <Empty>{t("Chưa có câu hỏi nào trong khoảng thời gian này.")}</Empty>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label={t("Câu hỏi của khách")} value={num(r.total)} />
            <Stat label={t("Bot chưa trả lời được")} value={num(r.unansweredCount)} sub={pct(r.unansweredCount / r.total)} />
            <Stat label={t("Cảm xúc tiêu cực")} value={num(neg)} sub={pct(neg / r.total)} />
            <Stat label={t("Xử lý không cần LLM")} value={pct(noLlm / r.total)} sub={t("trả lời mẫu + chuyển nhân viên")} />
          </div>

          <div className="mt-4">
            <NeedsSummary days={days} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card title={t("Chủ đề được hỏi nhiều nhất")} right={<span className="text-[12px] text-[var(--fg-muted)]">{t("ghi chú: chưa trả lời / tiêu cực")}</span>}>
              <BarList data={r.topics.map((t) => ({ label: t.topic, value: t.count, note: `${t.unanswered} / ${t.negative}` }))} />
            </Card>
            <Card title={t("Ý định của khách")}>
              <BarList color={S2} data={r.byLabel.map((l) => ({ label: l.text, value: l.count }))} />
            </Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card title={t("Câu hỏi theo ngày")} className="lg:col-span-2">
              <DailyBars
                stacked
                data={r.daily.map((d) => ({ day: d.day, answered: d.total - d.unanswered, unanswered: d.unanswered }))}
                series={[
                  { key: "answered", name: t("Bot trả lời được"), color: S1 },
                  { key: "unanswered", name: t("Chưa trả lời được"), color: S2 },
                ]}
              />
            </Card>
            <div className="space-y-4">
              <Card title={t("Cảm xúc")}>
                <BarList color={S4} data={r.sentiment.map((x) => ({ label: SENTIMENT[x.sentiment] ? t(SENTIMENT[x.sentiment]) : x.sentiment, value: x.count }))} />
              </Card>
              <Card title={t("Cách xử lý")}>
                <BarList color={S3} data={r.handledBy.map((h) => ({ label: h.text, value: h.count }))} />
              </Card>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Card title={t("Câu bot chưa trả lời được — nên bổ sung vào Kiến thức cửa hàng")} className="lg:col-span-2" right={<Link href="/admin/settings#knowledge" className="text-[13px] underline">{t("Sửa kiến thức")}</Link>}>
              {r.unanswered.length === 0 ? (
                <Empty>{t("Bot đã trả lời được mọi câu hỏi.")}</Empty>
              ) : (
                <ul className="divide-y divide-[var(--border)] text-[14px]">
                  {r.unanswered.map((u, i) => (
                    <li key={i} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-center sm:gap-3">
                      <span className="min-w-0 flex-1">{u.text}</span>
                      <span className="shrink-0 text-[12.5px] text-[var(--fg-muted)]">
                        {u.topic} · {fmtDateTime(u.at)}
                      </span>
                      {!u.conversationId.startsWith("demo-") && (
                        <Link href={`/admin/conversations/${u.conversationId}`} className="shrink-0 text-[12.5px] underline">
                          Xem chat
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title={t("Từ khoá nhu cầu nổi bật")}>
              <ul className="flex flex-wrap gap-1.5">
                {r.keywords.map((k) => (
                  <li key={k.word} className="rounded-full bg-[var(--surface-2)] px-2.5 py-1 text-[13px]">
                    {k.word} <span className="tabular-nums text-[var(--fg-muted)]">{k.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
