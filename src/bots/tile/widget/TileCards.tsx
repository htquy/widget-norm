"use client";

import { formatVnd } from "@/bots/tile/domain/quote";
import type { TileCard } from "./api";

const FINISH_LABELS: Record<string, string> = {
  glossy: "Men bóng",
  matte: "Men mờ",
  textured: "Nhám chống trơn",
};

export function TileCards({
  tiles,
  showPreview,
  onPreview,
  onQuote,
  onDetail,
}: {
  tiles: TileCard[];
  showPreview: boolean;
  onPreview: (t: TileCard) => void;
  onQuote: (t: TileCard) => void;
  onDetail?: (t: TileCard, index: number) => void;
}) {
  if (tiles.length === 0) return null;

  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 py-1.5 scrollbar-thin">
      {tiles.map((t, i) => {
        const finishText = FINISH_LABELS[t.finish] ?? t.finish;
        return (
          <div
            key={t.id}
            className="group relative flex w-44 shrink-0 snap-start flex-col overflow-hidden border border-[#dfdcd4] bg-white transition-colors duration-150 hover:border-[#15476d]"
          >
            {/* Image / Texture Preview */}
            <div className="relative h-28 w-full overflow-hidden bg-[#f0eee9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.imageUrl}
                alt={t.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                <span className="bg-[#1c1f22]/85 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Mẫu {i + 1}
                </span>
                {t.finish && (
                  <span className="bg-white/95 px-1.5 py-0.5 text-[10px] font-medium text-[#1c1f22] border border-[#e4e1d9]">
                    {finishText}
                  </span>
                )}
              </div>
            </div>

            {/* Information */}
            <div className="flex flex-1 flex-col justify-between p-2.5">
              <div className="space-y-1">
                <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#1c1f22] group-hover:text-[var(--w-primary)]">
                  {t.name}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-[#636a71]">
                  <span className="font-medium text-[#41464b]">{t.size}</span>
                  <span className="truncate">{t.sku}</span>
                </div>
                <div className="pt-0.5">
                  <span className="text-[13px] font-bold text-[#1c1f22] tabular-nums">{formatVnd(t.pricePerM2)}</span>
                  <span className="text-[11px] text-[#636a71] font-normal">/m²</span>
                </div>
              </div>

              {onDetail && t.description && (
                <button
                  type="button"
                  onClick={() => onDetail(t, i)}
                  className="mt-1.5 text-left text-[11px] font-medium text-[var(--w-primary)] hover:underline"
                >
                  Xem thông số mẫu
                </button>
              )}

              {/* Actions */}
              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                {showPreview ? (
                  <button
                    type="button"
                    onClick={() => onPreview(t)}
                    className="flex items-center justify-center gap-1 bg-[var(--w-primary)] py-1.5 text-[12px] font-medium text-white transition hover:brightness-110 active:translate-y-px"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <span>Xem thử</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => onQuote(t)}
                  className={`${showPreview ? "" : "col-span-2"} flex items-center justify-center gap-1 border border-[#dfdcd4] bg-white py-1.5 text-[12px] font-medium text-[#1c1f22] transition hover:bg-[#f7f6f3] active:translate-y-px`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="20" x="4" y="2" rx="2" />
                    <line x1="8" x2="16" y1="6" y2="6" />
                    <line x1="16" x2="16" y1="14" y2="18" />
                    <path d="M16 10h.01" />
                    <path d="M12 10h.01" />
                    <path d="M8 10h.01" />
                    <path d="M12 14h.01" />
                    <path d="M8 14h.01" />
                    <path d="M12 18h.01" />
                    <path d="M8 18h.01" />
                  </svg>
                  <span>Báo giá</span>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
