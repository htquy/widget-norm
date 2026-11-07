import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { priceText } from "@/domain/text";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { ImportProductsForm } from "@/components/admin/CatalogForms";
import { Badge, Card, Empty, PageHeader, btnPrimary, btnSecondary, fieldCls } from "@/components/admin/ui";
import { toggleProductAction } from "../../actions";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { t } = await getT();
  const s = await requireSession();
  const q = (await searchParams).q?.trim();
  const c = await app();
  const products = await c.catalog.list(s.tenantId, { search: q || undefined });

  return (
    <>
      <PageHeader
        title={t("Sản phẩm & dịch vụ")}
        subtitle={t("Bot chỉ giới thiệu và báo giá theo danh mục này — mô tả càng rõ, bot tư vấn càng đúng")}
        actions={
          <Link href="/admin/products/new" className={btnPrimary}>
            {t("+ Thêm sản phẩm")}
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <form className="flex gap-2" role="search">
            <label htmlFor="q" className="sr-only">
              {t("Tìm sản phẩm")}
            </label>
            <input id="q" name="q" defaultValue={q} placeholder={t("Tìm theo tên, SKU, danh mục…")} className={`${fieldCls} max-w-sm`} />
            <button className={btnSecondary}>{t("Tìm")}</button>
          </form>
          {products.length === 0 ? (
            <Empty>{t("Chưa có sản phẩm. Thêm thủ công hoặc nhập file CSV.")}</Empty>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
              <table className="w-full min-w-[640px] text-[14px]">
                <thead className="bg-[var(--surface-2)] text-left text-[12.5px] text-[var(--fg-muted)]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">{t("Sản phẩm")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("Danh mục")}</th>
                    <th className="px-4 py-2.5 text-right font-medium">{t("Giá")}</th>
                    <th className="px-4 py-2.5 font-medium">{t("Tình trạng")}</th>
                    <th className="px-4 py-2.5 font-medium">
                      <span className="sr-only">{t("Thao tác")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {products.map((p) => (
                    <tr key={p.id} className={p.active ? "" : "opacity-60"}>
                      <td className="px-4 py-2.5">
                        <Link href={`/admin/products/${p.id}`} className="font-medium underline-offset-2 hover:underline">
                          {p.name}
                        </Link>
                        <p className="font-mono text-[12px] text-[var(--fg-muted)]">{p.sku}</p>
                        {!p.description && <p className="text-[12px] text-amber-800">{t("Chưa có mô tả — bot khó tư vấn")}</p>}
                      </td>
                      <td className="px-4 py-2.5 text-[13px]">{p.category}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{priceText(p.price)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {p.inStock ? <Badge tone="green">{t("Còn hàng")}</Badge> : <Badge tone="amber">{t("Hết hàng")}</Badge>}
                          {!p.active && <Badge>{t("Đang ẩn")}</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <form action={toggleProductAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="active" value={String(!p.active)} />
                          <button className="min-h-9 rounded-lg px-2 text-[13px] underline">{p.active ? "Ẩn" : t("Hiện")}</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <Card title={t("Nhập từ file CSV")}>
            <ImportProductsForm />
          </Card>
        </div>
      </div>

    </>
  );
}
