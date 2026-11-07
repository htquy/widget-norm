import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { formatVnd } from "@/domain/text";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { Badge, Card, Empty, PageHeader, btnPrimary } from "@/components/admin/ui";
import { sizeText } from "../domain";
import { toggleFurnitureAction } from "./actions";

export default async function FurniturePage() {
  const { t } = await getT();
  const s = await requireSession();
  const items = await (await app()).furnitureCatalog.list(s.tenantId);
  return (
    <>
      <PageHeader
        title={t("Nội thất")}
        subtitle={t("Bot chỉ tư vấn, kiểm tra đặt vừa và tạm tính theo danh sách này — kích thước càng chính xác, bot càng đúng")}
        actions={
          <Link href="/admin/furniture/new" className={btnPrimary}>
            {t("+ Thêm sản phẩm")}
          </Link>
        }
      />
      {items.length === 0 ? (
        <Empty>{t("Chưa có sản phẩm nào. Thêm món đầu tiên kèm kích thước để bot bắt đầu tư vấn.")}</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--border)]">
            {items.map((i) => (
              <li key={i.id} className={`flex flex-wrap items-center gap-3 py-3 ${i.active ? "" : "opacity-60"}`}>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/furniture/${i.id}`} className="font-medium underline-offset-2 hover:underline">
                    {i.name}
                  </Link>
                  <p className="text-[13px] text-[var(--fg-muted)]">
                    {i.sku} · {i.category || t("Chưa phân loại")} · {sizeText(i)} · {formatVnd(i.price)}
                  </p>
                </div>
                {i.modelUrl && <Badge tone={i.modelStatus === "ready" ? "green" : "amber"}>{i.modelStatus === "ready" ? "3D" : i.modelStatus === "pending" ? t("Đang tạo 3D") : t("3D chờ duyệt")}</Badge>}
                {!i.modelUrl && i.cutoutUrl && !i.cutoutUrl.endsWith(".svg") && <Badge tone="green">{t("Ảnh tách nền")}</Badge>}
                {i.stock === 0 && i.active && <Badge tone="amber">{t("Hết hàng")}</Badge>}
                <span className="text-[13px] text-[var(--fg-muted)]">Tồn {i.stock}</span>
                <form action={toggleFurnitureAction}>
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="active" value={String(!i.active)} />
                  <button className="min-h-10 text-[13px] underline">{i.active ? t("Ngừng bán") : t("Bán lại")}</button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
