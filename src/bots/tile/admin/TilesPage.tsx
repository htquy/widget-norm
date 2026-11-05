import Link from "next/link";
import { FINISH_LABELS, USAGE_LABELS, sizeLabel } from "@/bots/tile/domain/tile";
import { formatVnd } from "@/bots/tile/domain/quote";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { Card, PageHeader } from "@/components/admin/ui";
import { ImportTilesForm } from "./ImportTilesForm";
import { toggleTileAction } from "./actions";

export default async function TilesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const s = await requireSession();
  const q = (await searchParams).q?.trim();
  const c = await app();
  const tiles = await c.tileCatalog.list(s.tenantId, { search: q || undefined });

  return (
    <>
      <PageHeader
        title="Mẫu gạch"
        subtitle={`${tiles.length} mẫu · chatbot chỉ gợi ý mẫu đang bán và còn hàng`}
        actions={
          <Link href="/admin/tiles/new" className="rounded-lg bg-neutral-900 px-3 py-2 text-[14px] text-white">
            Thêm mẫu
          </Link>
        }
      />
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Tìm theo tên, SKU, màu, phong cách" className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-[14px]" />
        <button className="rounded-lg bg-neutral-900 px-4 py-2 text-[14px] text-white">Tìm</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.id} className={`flex gap-3 rounded-xl border border-neutral-200 bg-white p-3 ${t.active ? "" : "opacity-60"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.textureUrl} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1 text-[13px]">
              <Link href={`/admin/tiles/${t.id}`} className="block truncate text-[14px] font-medium text-neutral-900 hover:underline">
                {t.name}
              </Link>
              <p className="text-neutral-500">
                {t.sku} · {sizeLabel(t)} · {FINISH_LABELS[t.finish]}
              </p>
              <p className="text-neutral-500">{t.usage.map((u) => USAGE_LABELS[u]).join(", ")}</p>
              <p className="mt-1 font-medium text-neutral-900">
                {formatVnd(t.pricePerM2)}/m² · <span className={t.stock > 0 ? "text-neutral-700" : "text-red-600"}>tồn {t.stock}</span>
              </p>
              <form action={toggleTileAction} className="mt-1">
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="active" value={String(!t.active)} />
                <button className="text-[12px] text-neutral-600 underline">{t.active ? "Ngừng bán" : "Bán lại"}</button>
              </form>
            </div>
          </div>
        ))}
      </div>
      {tiles.length === 0 && <p className="py-10 text-center text-[14px] text-neutral-500">Chưa có mẫu nào.</p>}

      <Card title="Nhập hàng loạt từ CSV" className="mt-6">
        <p className="mb-3 text-[13px] text-neutral-600">
          Cột: <code>sku,name,width_mm,height_mm,thickness_mm,pieces_per_box,price_per_m2,finish,usage,style,color,stock,texture_url</code>. finish = glossy/matte/textured;
          usage = floor, wall hoặc floor;wall. SKU trùng sẽ được cập nhật. <a href="/catalog-mau.csv" className="underline">Tải file mẫu</a>
        </p>
        <ImportTilesForm />
      </Card>
    </>
  );
}
