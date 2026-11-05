import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { ProductForm } from "@/components/admin/CatalogForms";
import { Card, PageHeader, btnSecondary } from "@/components/admin/ui";
import { deleteProductAction } from "../../../actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;
  const p = await (await app()).catalog.get(s.tenantId, id);
  if (!p) notFound();
  return (
    <>
      <PageHeader
        title={p.name}
        subtitle={p.sku}
        actions={
          <Link href="/admin/products" className={btnSecondary}>
            ← Danh sách
          </Link>
        }
      />
      <Card>
        <ProductForm product={{ id: p.id, sku: p.sku, name: p.name, category: p.category, price: p.price, description: p.description, url: p.url, imageUrl: p.imageUrl, tags: p.tags, inStock: p.inStock, active: p.active }} />
      </Card>
      <form action={deleteProductAction} className="mt-4">
        <input type="hidden" name="id" value={p.id} />
        <button className="min-h-10 text-[14px] text-[var(--danger)] underline">Xoá sản phẩm này</button>
      </form>
    </>
  );
}
