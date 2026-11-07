import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { BOOKING_STATUS_LABELS, type BookingStatus } from "@/domain/booking";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/domain/lead";
import { formatVnd } from "@/domain/text";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import {
  BarList,
  DailyBars,
  DailyLines,
  FunnelChart,
  S1,
  S2,
  S3,
  S4,
} from "@/components/admin/Charts";
import {
  BOOKING_TONE,
  Badge,
  Card,
  Empty,
  LEAD_TONE,
  PageHeader,
  RangeTabs,
  Stat,
  num,
  parseDays,
  pct,
  rangeFor,
} from "@/components/admin/ui";

const ROUTE_LABELS: Record<string, string> = {
  template: "Trả lời mẫu (0 LLM)",
  handoff: "Chuyển nhân viên (0 LLM)",
  llm_simple: "LLM rẻ",
  llm_complex: "LLM mạnh",
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { t } = await getT();
  const s = await requireSession();
  const days = parseDays((await searchParams).days);
  const c = await app();
  const range = rangeFor(days);
  const tenant = (await c.tenants.byId(s.tenantId))!;
  const [d, ai, ratings, counts] = await Promise.all([
    c.analytics.dashboard(tenant, range),
    c.llmCalls.summary(s.tenantId, range),
    c.support.ratings(s.tenantId, range),
    c.support.counts(s.tenantId),
  ]);
  const k = d.kpis;
  const noLlm = ai.turns ? (ai.turns - ai.llmTurns) / ai.turns : 0;

  return (
    <>
      <div className="workspace-welcome">
        <div>
          <p className="text-xs font-medium text-brand-800">
            {t("Một ngày mới ở cửa hàng")}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
            {t("Chào {name}, cùng xem khách đang cần gì.", { name: s.name })}
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            {tenant.settings.shopName}{" "}
            {tenant.slug.endsWith("-demo")
              ? t("· Dữ liệu minh họa, không phải hoạt động khách hàng thật")
              : t("· Hội thoại, lịch hẹn và khách tiềm năng của bạn")}
          </p>
        </div>
        <Link href="/admin/playground" className="btn-primary shrink-0">
          {t("Trò chuyện với bot của bạn")}
        </Link>
      </div>
      <PageHeader
        title={t("Tổng quan")}
        subtitle={t("Từ {from} đến {to}", { from: d.range.from, to: d.range.to })}
        actions={<RangeTabs days={days} base="/admin" />}
      />

      {counts.open > 0 && (
        <Link
          href="/admin/conversations?handoff=open"
          className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-900 hover:bg-red-100"
        >
          <span>
            <b>{counts.open}</b> {t("hội thoại đang chờ nhân viên hỗ trợ")}
          </span>
          <span className="font-medium underline">{t("Xử lý ngay")}</span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label={t("Khách mở chat")} value={num(k.visitors)} />
        <Stat
          label={t("Khách nhắn tin")}
          value={num(k.conversations)}
          sub={
            k.visitors
              ? t("{p} người mở chat", { p: pct(k.conversations / k.visitors) })
              : undefined
          }
        />
        <Stat label={t("Lịch hẹn mới")} value={num(k.bookings)} />
        <Stat
          label={t("Lead (để lại SĐT)")}
          value={num(k.leads)}
          sub={t("{p} người mở chat", { p: pct(k.leadRate) })}
        />
        <Stat
          label={t("Cần nhân viên")}
          value={num(k.handoffs)}
          sub={t("khách được chuyển")}
        />
        <Stat
          label={t("Doanh thu chốt")}
          value={formatVnd(k.revenue)}
          sub={t("{n} đơn", { n: k.won })}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title={t("Lượng khách theo ngày")}>
          <DailyLines
            data={d.daily}
            series={[
              { key: "visitors", name: t("Mở chat"), color: S1 },
              { key: "conversations", name: t("Nhắn tin"), color: S2 },
            ]}
          />
        </Card>
        <Card title={t("Chuyển đổi theo ngày")}>
          <DailyBars
            data={d.daily}
            series={[
              { key: "bookings", name: t("Đặt lịch"), color: S3 },
              { key: "leads", name: t("Để lại liên hệ"), color: S4 },
            ]}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card
          title={t("Phễu chuyển đổi")}
          right={
            <span className="text-[12px] text-[var(--fg-muted)]">
              {t("số khách khác nhau")}
            </span>
          }
        >
          <FunnelChart data={d.funnel} />
        </Card>
        <Card title={t("Sản phẩm được quan tâm")}>
          {d.topProducts.length ? (
            <BarList
              data={d.topProducts.map((p) => ({
                label: p.name,
                value: p.visitors,
              }))}
            />
          ) : (
            <Empty>{t("Chưa có lượt bấm sản phẩm.")}</Empty>
          )}
        </Card>
        <Card
          title={t("Mức hài lòng")}
          right={
            <Link href="/admin/conversations" className="text-[13px] underline">
              {t("Xem hội thoại")}
            </Link>
          }
        >
          {ratings.rated === 0 ? (
            <Empty>{t("Chưa có đánh giá.")}</Empty>
          ) : (
            <>
              <p className="text-[28px] font-semibold tabular-nums">
                {ratings.avg.toFixed(1).replace(".", ",")}{" "}
                <span className="text-[16px] text-amber-500" aria-hidden="true">
                  ★
                </span>
                <span className="ml-2 text-[13px] font-normal text-[var(--fg-muted)]">
                  {ratings.rated} lượt đánh giá
                </span>
              </p>
              <BarList
                color="#f59e0b"
                data={[5, 4, 3, 2, 1].map((n) => ({
                  label: `${n} sao`,
                  value: ratings.distribution[n - 1],
                }))}
              />
            </>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card
          title={t("Trạng thái lead")}
          right={
            <Link href="/admin/leads" className="text-[13px] underline">
              {t("Xem tất cả")}
            </Link>
          }
        >
          <ul className="grid grid-cols-2 gap-2 text-[14px] sm:grid-cols-3">
            {d.leadStatus.map((r) => (
              <li key={r.status}>
                <Link
                  href={`/admin/leads?status=${r.status}`}
                  className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 hover:bg-[var(--surface-2)]"
                >
                  <Badge tone={LEAD_TONE[r.status]}>
                    {t(LEAD_STATUS_LABELS[r.status as LeadStatus])}
                  </Badge>
                  <span className="tabular-nums">{r.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card
          title={t("Lịch hẹn tạo trong kỳ")}
          right={
            <Link href="/admin/bookings" className="text-[13px] underline">
              {t("Mở lịch")}
            </Link>
          }
        >
          <ul className="grid grid-cols-2 gap-2 text-[14px] sm:grid-cols-3">
            {d.bookingStatus.map((r) => (
              <li
                key={r.status}
                className="flex min-h-10 items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3"
              >
                <Badge tone={BOOKING_TONE[r.status]}>
                  {t(BOOKING_STATUS_LABELS[r.status as BookingStatus])}
                </Badge>
                <span className="tabular-nums">{r.count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card
        title={t("Trợ lý AI & tầng quyết định (jev)")}
        className="mt-4"
        right={
          <span className="text-[12px] text-[var(--fg-muted)]">
            quyết định: {c.chat.describeModels().decision}
          </span>
        }
      >
        {ai.turns === 0 ? (
          <Empty>
            {t("Chưa có lượt trả lời nào của bot trong khoảng thời gian này.")}
          </Empty>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <dl className="grid grid-cols-2 gap-3 text-[14px] sm:grid-cols-3 lg:col-span-2">
              {[
                [
                  t("Lượt bot trả lời"),
                  num(ai.turns),
                  t("{n} lần gọi LLM", { n: num(ai.calls) }),
                ],
                [
                  t("Không cần gọi LLM"),
                  pct(noLlm),
                  t("nhờ tầng quyết định (mẫu / chuyển người)"),
                ],
                [
                  t("Token LLM vào / ra"),
                  `${(ai.inputTokens / 1000).toFixed(1)}K / ${(ai.outputTokens / 1000).toFixed(1)}K`,
                  `+ ${(ai.decisionTokens / 1000).toFixed(1)}K token cho jev`,
                ],
                [
                  t("Độ trễ TB (có LLM)"),
                  `${(ai.avgLatencyMs / 1000).toFixed(1)} s`,
                  t("jev: {s} s/lượt", { s: (ai.avgDecisionLatencyMs / 1000).toFixed(2) }),
                ],
                [
                  t("Hạ cấp sang bot luật"),
                  num(ai.fallbacks),
                  t("LLM lỗi / hết hạn mức"),
                ],
                [
                  t("Guard sửa / chặn"),
                  `${num(ai.guardRetries)} / ${num(ai.guardBlocked)}`,
                  t("câu có số liệu không có trong dữ liệu"),
                ],
              ].map(([label, value, sub]) => (
                <div
                  key={label}
                  className="rounded-lg bg-[var(--surface-2)] p-3"
                >
                  <dt className="text-[12.5px] text-[var(--fg-muted)]">
                    {label}
                  </dt>
                  <dd className="text-[18px] font-semibold tabular-nums">
                    {value}
                  </dd>
                  <dd className="text-[12px] text-[var(--fg-muted)]">{sub}</dd>
                </div>
              ))}
            </dl>
            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-[13px] font-medium">{t("Tuyến xử lý")}</h3>
                <BarList
                  data={ai.byRoute.map((r) => ({
                    label: ROUTE_LABELS[r.route] ? t(ROUTE_LABELS[r.route]) : r.route,
                    value: r.turns,
                  }))}
                />
              </div>
              {ai.byModel.length > 0 && (
                <div>
                  <h3 className="mb-2 text-[13px] font-medium">Theo model</h3>
                  <ul className="space-y-1 text-[13px]">
                    {ai.byModel.map((m) => (
                      <li key={m.model} className="flex justify-between gap-2">
                        <span
                          className="truncate font-mono text-[12px]"
                          title={m.model}
                        >
                          {m.model}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {num(m.turns)} lượt
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
