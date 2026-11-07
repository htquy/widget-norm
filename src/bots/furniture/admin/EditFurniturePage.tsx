import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { Card, PageHeader, btnSecondary } from "@/components/admin/ui";
import { deleteFurnitureAction } from "./actions";
import { FurnitureForm } from "./FurnitureForm";

export default async function EditFurniturePage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getT();
  const s = await requireSession();
  const { id } = await params;
  const i = await (await app()).furnitureCatalog.get(s.tenantId, id);
  if (!i) notFound();
  return (
    <>
      <PageHeader
        title={i.name}
        subtitle={i.sku}
        actions={
          <Link href="/admin/furniture" className={btnSecondary}>
            {t("← Danh sách")}
          </Link>
        }
      />
      <Card>
        <FurnitureForm
          item={{
            id: i.id,
            sku: i.sku,
            name: i.name,
            category: i.category,
            rooms: i.rooms,
            style: i.style,
            material: i.material,
            color: i.color,
            widthCm: i.widthCm,
            depthCm: i.depthCm,
            heightCm: i.heightCm,
            price: i.price,
            stock: i.stock,
            description: i.description,
            imageUrl: i.imageUrl,
            cutoutUrl: i.cutoutUrl,
            modelUrl: i.modelUrl,
            modelStatus: i.modelStatus,
            collection: i.collection,
            pairs: i.pairs,
            active: i.active,
          }}
        />
      </Card>
      <form action={deleteFurnitureAction} className="mt-4">
        <input type="hidden" name="id" value={i.id} />
        <button className="min-h-10 text-[14px] text-[var(--danger)] underline">{t("Xoá sản phẩm này")}</button>
      </form>
    </>
  );
}
