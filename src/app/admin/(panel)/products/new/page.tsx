import Link from "next/link";
import { ProductForm } from "@/components/admin/CatalogForms";
import { Card, PageHeader, btnSecondary } from "@/components/admin/ui";

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        title="Thêm sản phẩm"
        actions={
          <Link href="/admin/products" className={btnSecondary}>
            ← Danh sách
          </Link>
        }
      />
      <Card>
        <ProductForm />
      </Card>
    </>
  );
}
