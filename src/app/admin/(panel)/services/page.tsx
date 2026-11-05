import Link from "next/link";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { ServiceForm } from "@/components/admin/CatalogForms";
import { Card, PageHeader } from "@/components/admin/ui";
import { deleteServiceAction } from "../../actions";

/** Dịch vụ đặt lịch — dùng chung mọi loại bot (spa, khảo sát tại nhà, tư vấn tại showroom…) */
export default async function ServicesPage() {
  const s = await requireSession();
  const services = await (await app()).services.list(s.tenantId);
  return (
    <>
      <PageHeader title="Dịch vụ đặt lịch" subtitle="Khách chọn dịch vụ trong form đặt lịch của widget. Giờ mở cửa, sức chứa và khoảng cách khung giờ chỉnh ở Cài đặt." />
      <Card right={<Link href="/admin/bookings" className="text-[13px] underline">Xem lịch hẹn</Link>}>
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
