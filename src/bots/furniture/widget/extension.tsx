"use client";

import { useTr } from "@/components/widget/i18n";
import { useMemo } from "react";
import type { ExtHelpers, WidgetExtension } from "@/components/widget/extension";
import { ProductCards } from "@/components/widget/Panels";
import type { ProductCard } from "@/components/widget/api";
import { furnitureApi, type FurnitureCard, type RoomSetView } from "./api";
import { ItemImage } from "./ItemImage";
import { ModelViewer } from "./ModelViewer";
import { Studio } from "./Studio";

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";
const btn = "flex min-h-9 shrink-0 items-center rounded-[var(--w-r-pill)] px-3 text-[13px] font-medium transition";

function FurnitureCards({ items, h }: { items: FurnitureCard[]; h: ExtHelpers }) {
  const t = useTr();
  return (
    <ul className="-mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1" aria-label={t("Nội thất gợi ý")}>
      {items.map((c) => (
        <li key={c.id} className="flex w-[200px] shrink-0 snap-start flex-col overflow-hidden rounded-[var(--w-r-bubble)] border border-[var(--w-border)] bg-[var(--w-surface)]">
          <div className="relative">
            <ItemImage card={c} />
            {c.modelUrl && <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10.5px] font-semibold text-white">3D · AR</span>}
          </div>
          <div className="flex flex-1 flex-col gap-1 p-2.5">
            <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[var(--w-fg)]">{c.name}</p>
            <p className="text-[11.5px] text-[var(--w-muted)]">
              {c.widthCm}×{c.depthCm}×{c.heightCm} cm · {c.style}
            </p>
            <p className="text-[13px] font-bold text-[var(--w-primary)]">
              {vnd(c.price)}
              {!c.inStock && <span className="ml-1 text-[11px] font-normal text-[var(--w-muted)]">{t("· tạm hết")}</span>}
            </p>
            {c.modelUrl && (
              <button type="button" onClick={() => h.openPanel("view3d", { item: c })} className="min-h-9 rounded-lg border border-[var(--w-primary)] text-[12px] font-semibold text-[var(--w-primary)]">
                {t("Xoay 3D · xem bằng camera")}
              </button>
            )}
            <div className="mt-auto grid grid-cols-2 gap-1.5 pt-1">
              <button type="button" onClick={() => h.openPanel("studio", { itemId: c.id })} className="min-h-9 rounded-lg bg-[var(--w-primary)] text-[12px] font-semibold text-[var(--w-on-primary)]">
                {t("Kê thử")}
              </button>
              <button type="button" onClick={() => h.send(t("Món {name} có vừa phòng mình không?", { name: c.name }))} className="min-h-9 rounded-lg border border-[var(--w-border)] text-[12px] font-medium text-[var(--w-fg)]">
                {t("Có vừa?")}
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Thẻ "phương án trọn bộ" kèm bảng màu, % sàn, lưu ý — bấm để kê cả bộ vào ảnh phòng */
function RoomSetCard({ set, h }: { set: RoomSetView; h: ExtHelpers }) {
  const t = useTr();
  return (
    <div className="overflow-hidden rounded-[var(--w-r-bubble)] border border-[var(--w-border)] bg-[var(--w-surface)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--w-border)] px-3 py-2">
        <p className="text-[13px] font-semibold text-[var(--w-fg)]">{set.title}</p>
        {set.palette && (
          <span className="flex gap-1" aria-label={t("Bảng màu gợi ý 60-30-10")}>
            {set.palette.map((c) => (
              <span key={c} className="h-4 w-4 rounded-full ring-1 ring-black/10" style={{ background: c }} />
            ))}
          </span>
        )}
      </div>
      <ul className="divide-y divide-[var(--w-border)]">
        {set.picks.map((p) => (
          <li key={p.card.id} className="flex items-center gap-2 px-3 py-2">
            <ItemImage card={p.card} variant="thumb" />
            <div className="min-w-0 flex-1 text-[12px] leading-tight">
              <p className="truncate font-medium text-[var(--w-fg)]">
                {p.card.name}
                {p.quantity > 1 && ` × ${p.quantity}`}
              </p>
              <p className="truncate text-[11px] text-[var(--w-muted)]">{p.reason}</p>
            </div>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[var(--w-fg)]">{vnd(p.total)}</span>
          </li>
        ))}
      </ul>
      <div className="space-y-1 px-3 py-2 text-[11.5px] text-[var(--w-muted)]">
        <p className="flex justify-between text-[13px] font-bold text-[var(--w-fg)]">
          <span>{t("Tạm tính")}</span>
          <span className="tabular-nums text-[var(--w-primary)]">{vnd(set.subtotal)}</span>
        </p>
        {set.coveragePercent !== null && <p>{t("Đồ chiếm {n}% diện tích sàn (nên ≤ 40%).", { n: set.coveragePercent })}</p>}
        {set.notes.slice(0, 2).map((n) => (
          <p key={n}>• {n}</p>
        ))}
      </div>
      <div className="px-3 pb-3">
        <button type="button" onClick={() => h.openPanel("studio", { set })} className="min-h-10 w-full rounded-lg bg-[var(--w-primary)] text-[13px] font-semibold text-[var(--w-on-primary)]">
          {t("Kê cả bộ vào ảnh phòng")}
        </button>
      </div>
    </div>
  );
}

function StudioPanel({ data, h }: { data: { itemId?: string; set?: RoomSetView }; h: ExtHelpers }) {
  const t = h.tr;
  const api = useMemo(() => furnitureApi(h.tenant, h.visitorId), [h.tenant, h.visitorId]);
  return (
    <Studio
      api={api}
      conversationId={h.conversationId}
      initialItemId={data.itemId}
      initialSet={data.set}
      onClose={h.closePanel}
      onAsk={(r) => {
        h.closePanel();
        h.send(t("Mình vừa kê thử phương án: {summary}. Bạn tư vấn giúp có hợp không, cần chỉnh gì?", { summary: r.summary }));
      }}
    />
  );
}

/** Xem 3D / AR của một món (chỉ món có .glb đã duyệt) */
function View3D({ item, h }: { item: FurnitureCard; h: ExtHelpers }) {
  const t = useTr();
  return (
    <div className="flex h-full flex-col bg-[var(--w-surface)]">
      <header className="flex items-center justify-between border-b border-[var(--w-border)] px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-[var(--w-fg)]">{item.name}</p>
          <p className="text-[11.5px] text-[var(--w-muted)]">
            {item.widthCm}×{item.depthCm}×{item.heightCm} cm · {vnd(item.price)}
          </p>
        </div>
        <button type="button" onClick={h.closePanel} className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--w-muted)] hover:bg-[var(--w-surface-2)]" aria-label={t("Đóng")}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </header>
      <div className="min-h-0 flex-1">
        <ModelViewer src={item.modelUrl} alt={item.name} className="h-full w-full" />
      </div>
      <p className="px-3 pb-1 pt-2 text-[11.5px] text-[var(--w-muted)]">{t("Vuốt để xoay, chụm để thu phóng. Trên điện thoại bấm biểu tượng AR để đặt món vào phòng thật.")}</p>
      <div className="grid grid-cols-2 gap-2 p-3">
        <button type="button" onClick={() => h.openPanel("studio", { itemId: item.id })} className="min-h-10 rounded-lg bg-[var(--w-primary)] text-[13px] font-semibold text-[var(--w-on-primary)]">
          {t("Kê vào ảnh phòng")}
        </button>
        <button type="button" onClick={() => (h.closePanel(), h.send(t("Món {name} phối với gì cho đẹp?", { name: item.name })))} className="min-h-10 rounded-lg border border-[var(--w-border)] text-[13px] font-medium text-[var(--w-fg)]">
          {t("Phối với gì?")}
        </button>
      </div>
    </div>
  );
}

/** Widget bot nội thất: thẻ có "Kê thử", thẻ phương án trọn bộ, studio kê đồ trên ảnh phòng */
export const furnitureExtension: WidgetExtension = {
  fullScreenPanels: ["studio", "view3d"],

  renderCards(items, h) {
    const t = h.tr;
    const furn = items.filter((i) => "widthCm" in (i as object)) as FurnitureCard[];
    const other = items.filter((i) => !("widthCm" in (i as object))) as ProductCard[];
    return (
      <>
        {other.length > 0 && <ProductCards products={other} onAsk={(p) => h.send(t("Cho mình biết thêm về {name}", { name: p.name }))} onOpen={() => undefined} />}
        {furn.length > 0 && <FurnitureCards items={furn} h={h} />}
      </>
    );
  },

  renderExtras(extras, h) {
    const set = extras.roomSet as RoomSetView | undefined;
    return set ? <RoomSetCard set={set} h={h} /> : null;
  },

  quickActions(h) {
    const t = h.tr;
    return (
      <>
        <button type="button" onClick={() => h.openPanel("studio")} className={`${btn} bg-[var(--w-primary)] text-[var(--w-on-primary)] hover:brightness-110`}>
          {t("Thiết kế từ ảnh phòng")}
        </button>
        <button type="button" onClick={() => h.send(t("Gợi ý giúp mình trọn bộ nội thất cho phòng khách"))} className={`${btn} border border-[var(--w-border)] bg-[var(--w-surface)] text-[var(--w-fg)] hover:border-[var(--w-primary)]`}>
          {t("Gợi ý trọn bộ theo ngân sách")}
        </button>
      </>
    );
  },

  renderPanel(name, data, h) {
    if (name === "view3d") return <View3D item={(data as { item: FurnitureCard }).item} h={h} />;
    if (name === "studio") return <StudioPanel data={(data ?? {}) as { itemId?: string; set?: RoomSetView }} h={h} />;
    return null;
  },
};
