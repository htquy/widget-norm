import Link from "next/link";
import { priceText } from "@/domain/product";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { ImportProductsForm, ServiceForm } from "@/components/admin/CatalogForms";
import { Badge, Card, Empty, PageHeader, btnPrimary, btnSecondary, fieldCls } from "@/components/admin/ui";
import { deleteServiceAction, toggleProductAction } from "../../actions";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await requireSession();
  const q = (await searchParams).q?.trim();
  const c = await app();
  const [products, services] = await Promise.all([c.catalog.list(s.tenantId, { search: q || undefined }), c.catalog.services(s.tenantId)]);

  return (
    <>
      <PageHeader
        title="Sản phẩm & dịch vụ"
        subtitle="Bot chỉ giới thiệu và báo giá theo danh mục này — mô tả càng rõ, bot tư vấn càng đúng"
        actions={
          <Link href="/admin/products/new" className={btnPrimary}>
            + Thêm sản phẩm
          </Link>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <form className="flex gap-2" role="search">
            <label htmlFor="q" className="sr-only">
              Tìm sản phẩm
            </label>
            <input id="q" name="q" defaultValue={q} placeholder="Tìm theo tên, SKU, danh mục…" className={`${fieldCls} max-w-sm`} />
            <button className={btnSecondary}>Tìm</button>
          </form>
          {products.length === 0 ? (
            <Empty>Chưa có sản phẩm. Thêm thủ công hoặc nhập file CSV.</Empty>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-white">
              <table className="w-full min-w-[640px] text-[14px]">
                <thead className="bg-[var(--surface-2)] text-left text-[12.5px] text-[var(--fg-muted)]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Sản phẩm</th>
                    <th className="px-4 py-2.5 font-medium">Danh mục</th>
                    <th className="px-4 py-2.5 text-right font-medium">Giá</th>
                    <th className="px-4 py-2.5 font-medium">Tình trạng</th>
                    <th className="px-4 py-2.5 font-medium">
                      <span className="sr-only">Thao tác</span>
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
                        {!p.description && <p className="text-[12px] text-amber-800">Chưa có mô tả — bot khó tư vấn</p>}
                      </td>
                      <td className="px-4 py-2.5 text-[13px]">{p.category}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{priceText(p.price)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {p.inStock ? <Badge tone="green">Còn hàng</Badge> : <Badge tone="amber">Hết hàng</Badge>}
                          {!p.active && <Badge>Đang ẩn</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <form action={toggleProductAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="active" value={String(!p.active)} />
                          <button className="min-h-9 rounded-lg px-2 text-[13px] underline">{p.active ? "Ẩn" : "Hiện"}</button>
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
          <Card title="Nhập từ file CSV">
            <ImportProductsForm />
          </Card>
        </div>
      </div>

      <Card id="services" title="Dịch vụ đặt lịch" className="mt-6" right={<Link href="/admin/bookings" className="text-[13px] underline">Xem lịch hẹn</Link>}>
        <p className="mb-3 text-[13px] text-[var(--fg-muted)]">Khách chọn dịch vụ trong form đặt lịch của widget. Giờ mở cửa, sức chứa và khoảng cách giữa các khung giờ chỉnh ở Cài đặt.</p>
        <ul className="space-y-3">
          {services.map((sv) => (
            <li key={sv.id} className="rounded-lg border border-[var(--border)] p-3">
              <ServiceForm service={{ id: sv.id, name: sv.name, durationMin: sv.durationMin, price: sv.price, description: sv.description, active: sv.active }} />
              <form action={deleteServiceAction} className="mt-2">
                <input type="hidden" name="id" value={sv.id} />
                <button className="min-h-9 text-[13px] text-[var(--danger)] underline">Xoá dịch vụ</button>
              </form>
            </li>
          ))}
          <li className="rounded-lg border border-dashed border-[var(--border)] p-3">
            <p className="mb-2 text-[13px] font-medium">Thêm dịch vụ mới</p>
            <ServiceForm />
          </li>
        </ul>
      </Card>
    </>
  );
}
