import { notFound } from "next/navigation";
import { twoProportionTest } from "@/application/stats";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { TileSettingsForm } from "@/bots/tile/admin/TileSettingsForm";
import { Card, PageHeader, RangeTabs, parseDays, pct, rangeFor } from "@/components/admin/ui";

/** Thông số báo giá + A/B test trình xem thử gạch (chỉ bot loại "tile") */
export default async function TileSettingsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const s = await requireSession();
  const days = parseDays((await searchParams).days);
  const c = await app();
  const tenant = await c.tenants.byId(s.tenantId);
  if (!tenant || tenant.kind !== "tile") notFound();
  const settings = await c.tileRepos.settings.get(tenant.id);
  const ab = await c.analytics.abTest(tenant.id, rangeFor(days), [
    { variant: "visualizer", label: "Có xem thử gạch" },
    { variant: "control", label: "Chỉ chat" },
  ]);
  const [vis, ctl] = ab;
  const test = twoProportionTest(vis.leads, vis.visitors, ctl.leads, ctl.visitors);
  const lift = ctl.rate > 0 ? vis.rate / ctl.rate - 1 : null;
  const enough = vis.visitors >= 100 && ctl.visitors >= 100;

  return (
    <>
      <PageHeader title="Báo giá & A/B test" subtitle="Hao hụt theo kiểu lát, giá keo/ron và tỉ lệ khách được thấy trình xem thử" actions={<RangeTabs days={days} base="/admin/tile-settings" />} />
      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <TileSettingsForm settings={settings} />
        </div>
        <Card title="Kết quả A/B: có xem thử vs chỉ chat" className="xl:col-span-2">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-[var(--fg-muted)]">
                <th className="pb-2 font-normal">Nhóm</th>
                <th className="pb-2 text-right font-normal">Khách</th>
                <th className="pb-2 text-right font-normal">Lead</th>
                <th className="pb-2 text-right font-normal">Tỉ lệ</th>
              </tr>
            </thead>
            <tbody>
              {ab.map((r) => (
                <tr key={r.variant} className="border-t border-[var(--border)]">
                  <td className="py-2">{r.label}</td>
                  <td className="py-2 text-right tabular-nums">{r.visitors.toLocaleString("vi-VN")}</td>
                  <td className="py-2 text-right tabular-nums">{r.leads.toLocaleString("vi-VN")}</td>
                  <td className="py-2 text-right font-semibold tabular-nums">{pct(r.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 rounded-lg bg-[var(--surface-2)] p-3 text-[13px]">
            {!enough ? (
              "Mỗi nhóm cần tối thiểu 100 khách để kết luận. Đặt % khách thấy trình xem thử < 100 để có nhóm so sánh."
            ) : (
              <>
                Nhóm xem thử gạch {lift !== null ? (lift >= 0 ? "cao hơn" : "thấp hơn") : "khác"} {lift !== null && <b>{pct(Math.abs(lift))}</b>} tương đối. p-value = <b>{test.p < 0.001 ? "< 0,001" : test.p.toFixed(3).replace(".", ",")}</b> —{" "}
                {test.p < 0.05 ? "chênh lệch có ý nghĩa thống kê (95%)." : "chưa đủ bằng chứng thống kê, cần thêm dữ liệu."}
              </>
            )}
          </p>
        </Card>
      </div>
    </>
  );
}
