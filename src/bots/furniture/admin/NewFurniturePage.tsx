import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Card, PageHeader, btnSecondary } from "@/components/admin/ui";
import { FurnitureForm } from "./FurnitureForm";

export default async function NewFurniturePage() {
  const { t } = await getT();
  return (
    <>
      <PageHeader
        title={t("Thêm sản phẩm nội thất")}
        actions={
          <Link href="/admin/furniture" className={btnSecondary}>
            {t("← Danh sách")}
          </Link>
        }
      />
      <Card>
        <FurnitureForm />
      </Card>
    </>
  );
}
