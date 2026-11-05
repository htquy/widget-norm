import { notFound } from "next/navigation";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { Card, PageHeader } from "@/components/admin/ui";
import { TileForm } from "./TileForm";
import { deleteTileAction } from "./actions";

export default async function EditTilePage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireSession();
  const { id } = await params;
  const c = await app();
  const tile = await c.tileCatalog.get(s.tenantId, id);
  if (!tile) notFound();
  return (
    <>
      <PageHeader
        title={tile.name}
        subtitle={tile.sku}
        actions={
          <form action={deleteTileAction}>
            <input type="hidden" name="id" value={tile.id} />
            <button className="rounded-lg border border-red-300 bg-white px-3 py-2 text-[14px] text-red-700">Xoá mẫu</button>
          </form>
        }
      />
      <Card>
        <TileForm tile={tile} />
      </Card>
    </>
  );
}
