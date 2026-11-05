"use client";

import { useEffect, useMemo, useState } from "react";
import type { ExtHelpers, WidgetExtension } from "@/components/widget/extension";
import type { LayoutPattern } from "../domain/quote";
import { tileApi, type QuoteRecord, type TileCard } from "./api";
import { LeadForm, QuoteForm, QuoteSummary } from "./QuotePanel";
import { TileCards } from "./TileCards";
import { Visualizer } from "./Visualizer";

interface PanelData {
  tileId?: string;
  quoteId?: string | null;
  previewBase64?: string;
  area?: number;
  pattern?: LayoutPattern;
}

/** Tải catalogue gạch (đủ cho trình xem thử/báo giá) rồi hiện panel tương ứng */
function TilePanel({ name, data, h }: { name: string; data: PanelData; h: ExtHelpers }) {
  const api = useMemo(() => tileApi(h.tenant, h.visitorId), [h.tenant, h.visitorId]);
  const [tiles, setTiles] = useState<TileCard[] | null>(null);
  const [error, setError] = useState("");
  const [quoteId, setQuoteId] = useState<string | null>(data.quoteId ?? null);

  useEffect(() => {
    if (name === "lead") return;
    api
      .catalog()
      .then((r) => setTiles(r.tiles))
      .catch((e) => setError(e.message));
  }, [api, name]);

  if (name === "lead") {
    return (
      <LeadForm
        api={api}
        conversationId={h.conversationId}
        quoteId={quoteId}
        previewBase64={data.previewBase64}
        onClose={h.closePanel}
        onDone={() => {
          h.closePanel();
          h.pushLocal("Em đã nhận thông tin liên hệ. Chuyên viên của shop sẽ gọi điện/Zalo tư vấn và gửi file báo giá chi tiết sớm nhất ạ!");
        }}
      />
    );
  }
  if (error) return <p className="p-6 text-center text-[14px] text-red-700">{error}</p>;
  if (!tiles) return <p className="p-6 text-center text-[14px] text-[var(--w-muted)]">Đang tải danh mục…</p>;

  if (name === "visualizer") {
    return (
      <Visualizer
        api={api}
        tiles={tiles}
        initialTileId={data.tileId}
        conversationId={h.conversationId}
        onClose={h.closePanel}
        onQuote={(r) => h.openPanel("quote", { tileId: r.tileId, area: r.areaM2, pattern: r.pattern })}
        onLead={(r) => h.openPanel("lead", { quoteId, previewBase64: r.previewBase64 })}
        onAsk={() => {
          h.closePanel();
          h.send("Mình đã thử gạch trên ảnh phòng, nên chọn mẫu nào cho hợp?");
        }}
      />
    );
  }
  return (
    <QuoteForm
      api={api}
      tiles={tiles}
      initialTileId={data.tileId}
      initialArea={data.area}
      initialPattern={data.pattern}
      conversationId={h.conversationId}
      onClose={h.closePanel}
      onDone={(q: QuoteRecord) => {
        setQuoteId(q.id);
        h.closePanel();
        h.pushLocal("Em gửi anh/chị báo giá tạm tính theo yêu cầu:", { quote: q });
      }}
    />
  );
}

const btn = "flex min-h-9 shrink-0 items-center rounded-[var(--w-r-pill)] px-3 text-[13px] font-medium transition";

/** Phần mở rộng widget của bot "Tư vấn & xem thử gạch": thẻ gạch, báo giá, trình xem thử trên ảnh phòng */
export const tileExtension: WidgetExtension = {
  fullScreenPanels: ["visualizer"],

  renderCards(items, h) {
    const visualizerOn = h.config.ext.variant === "visualizer";
    return (
      <TileCards
        tiles={items as TileCard[]}
        showPreview={visualizerOn}
        onPreview={(t) => h.openPanel("visualizer", { tileId: t.id })}
        onQuote={(t) => h.openPanel("quote", { tileId: t.id })}
        onDetail={(t, i) => h.send(`Cho em xem mô tả chi tiết mẫu ${i + 1} (${t.name})`)}
      />
    );
  },

  renderExtras(extras, h) {
    const quote = extras.quote as QuoteRecord | null | undefined;
    if (!quote) return null;
    return <QuoteSummary quote={quote} onLead={() => h.openPanel("lead", { quoteId: quote.id })} />;
  },

  quickActions(h) {
    const visualizerOn = h.config.ext.variant === "visualizer";
    return (
      <>
        {visualizerOn && (
          <button type="button" onClick={() => h.openPanel("visualizer")} className={`${btn} bg-[var(--w-primary)] text-[var(--w-on-primary)] hover:brightness-110`}>
            Ướm thử ảnh phòng
          </button>
        )}
        <button type="button" onClick={() => h.openPanel("quote")} className={`${btn} border border-[var(--w-border)] bg-[var(--w-surface)] text-[var(--w-fg)] hover:border-[var(--w-primary)]`}>
          Dự toán chi phí
        </button>
      </>
    );
  },

  renderPanel(name, data, h) {
    return <TilePanel name={name} data={(data ?? {}) as PanelData} h={h} />;
  },
};
