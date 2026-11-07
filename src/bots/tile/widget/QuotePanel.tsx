"use client";

import { useTr } from "@/components/widget/i18n";
import { useMemo, useState } from "react";
import { LAYOUT_LABELS, LAYOUT_PATTERNS, formatVnd, type LayoutPattern } from "@/bots/tile/domain/quote";
import type { SurfaceKind } from "@/bots/tile/domain/tile";
import type { QuoteRecord, TileCard, WidgetApi } from "./api";

export function QuoteSummary({ quote, onLead }: { quote: QuoteRecord; onLead: () => void }) {
  const t = useTr();
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
      <div className="bg-neutral-50/80 px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
            ✓
          </span>
          <p className="font-semibold text-neutral-900 text-[13.5px]">{t("Báo giá dự toán")}</p>
        </div>
        <span className="text-[11px] font-medium text-neutral-500 bg-neutral-200/60 rounded-full px-2 py-0.5">
          {quote.result.netAreaM2} m² (+{quote.result.wastePercent}% hao hụt)
        </span>
      </div>

      <div className="p-4 space-y-3 text-[13px]">
        <div className="rounded-xl bg-neutral-50 p-2.5 text-[12px] text-neutral-600 space-y-1">
          <div className="flex justify-between">
            <span>{t("Quy cách:")}</span>
            <span className="font-medium text-neutral-800">{quote.result.boxes} {quote.result.unit === t("viên") ? t("viên") : t("thùng gạch")}</span>
          </div>
          <div className="flex justify-between">
            <span>{t("Diện tích phủ gạch:")}</span>
            <span className="font-medium text-neutral-800">{quote.result.coveredAreaM2} m²</span>
          </div>
        </div>

        <ul className="space-y-1.5 divide-y divide-neutral-100">
          {quote.result.lines.map((l, i) => (
            <li key={i} className={`flex justify-between items-center text-[12.5px] ${i > 0 ? "pt-1.5" : ""}`}>
              <div className="min-w-0 flex-1 pr-2">
                <span className="font-medium text-neutral-800 block truncate">
                  {l.kind === "tile" ? (quote.result.unit === t("viên") && l.unit === t("viên") ? t("Ngói / gạch theo viên") : t("Gạch chính")) : l.kind === "adhesive" ? t("Keo dán gạch") : t("Keo chà ron")}
                </span>
                <span className="text-[11px] text-neutral-400">
                  {l.quantity} {l.unit} × {formatVnd(l.unitPrice)}
                </span>
              </div>
              <span className="shrink-0 font-semibold tabular-nums text-neutral-900">{formatVnd(l.total)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-2.5 flex items-baseline justify-between border-t border-neutral-200 pt-3">
          <div>
            <span className="text-[13px] font-semibold text-neutral-900">{t("Tổng tạm tính")}</span>
            <span className="block text-[11px] text-neutral-400 font-normal">{t("(chưa gồm phí ship & thi công)")}</span>
          </div>
          <span className="text-[16px] font-bold tabular-nums text-[var(--w-primary)]">
            {formatVnd(quote.result.total)}
          </span>
        </div>

        {quote.result.notes?.length ? (
          <ul className="mt-2 space-y-1 rounded-lg bg-amber-50 px-2.5 py-2 text-[11.5px] leading-snug text-amber-900">
            {quote.result.notes.map((n, i) => (
              <li key={i}>• {n}</li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          onClick={onLead}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--w-primary)] py-2.5 text-[13px] font-semibold text-white shadow-xs transition hover:brightness-110 active:scale-[0.99]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          <span>{t("Nhận báo giá chi tiết qua Zalo")}</span>
        </button>
      </div>
    </div>
  );
}

export function QuoteForm({
  api,
  tiles,
  initialTileId,
  initialArea,
  initialPattern,
  surface,
  conversationId,
  onDone,
  onClose,
}: {
  api: WidgetApi;
  tiles: TileCard[];
  initialTileId?: string;
  initialArea?: number;
  initialPattern?: LayoutPattern;
  /** Bề mặt (từ trình xem thử) — server dùng để cảnh báo mẫu không hợp */
  surface?: SurfaceKind;
  conversationId: string | null;
  onDone: (q: QuoteRecord) => void;
  onClose: () => void;
}) {
  const t = useTr();
  const [tileId, setTileId] = useState(initialTileId ?? tiles[0]?.id ?? "");
  const [mode, setMode] = useState<"dims" | "area">(initialArea ? "area" : "dims");
  const [len, setLen] = useState("4");
  const [wid, setWid] = useState("5");
  const [area, setArea] = useState(initialArea ? String(Math.round(initialArea * 100) / 100) : "20");
  const [pattern, setPattern] = useState<LayoutPattern>(initialPattern ?? "straight");
  const [grout, setGrout] = useState("2");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const num = (s: string) => Number(s.replace(",", "."));
  const areaM2 = mode === "dims" ? num(len) * num(wid) : num(area);
  const selectedTile = useMemo(() => tiles.find((t) => t.id === tileId) ?? tiles[0], [tiles, tileId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!(areaM2 > 0)) return setError(t("Vui lòng nhập diện tích hợp lệ"));
    setBusy(true);
    try {
      const { quote } = await api.quote({
        conversationId,
        tileId,
        surfaces: [{ label: t("Khu vực cần lát"), areaM2: Math.round(areaM2 * 100) / 100 }],
        options: { pattern, groutWidthMm: num(grout) || 0, groutColor: t("cùng tông"), includeAdhesive: true, includeGrout: true },
        ...(surface ? { surface } : {}),
      });
      onDone(quote);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13.5px] text-neutral-900 shadow-2xs outline-none transition focus:border-[var(--w-primary)] focus:ring-2 focus:ring-[var(--w-primary)]/15";

  return (
    <form onSubmit={submit} className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[var(--w-primary)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-neutral-900">{t("Tính dự toán vật tư")}</h3>
            <p className="text-[11px] text-neutral-500">{t("Tự động tính số thùng gạch, keo dán & keo ron")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label={t("Đóng")}
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-[13.5px]">
        {/* Tile Selector */}
        <div>
          <label className="mb-1 block font-medium text-neutral-700 text-[13px]">{t("Chọn mẫu gạch")}</label>
          <select value={tileId} onChange={(e) => setTileId(e.target.value)} className={inputClass}>
            {tiles.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.size}) — {formatVnd(t.pricePerM2)}/m²
              </option>
            ))}
          </select>
          {selectedTile && (
            <p className="mt-1 text-[11.5px] text-neutral-500">
              Kích thước: {selectedTile.size} • Đơn giá: {formatVnd(selectedTile.pricePerM2)}/m²
            </p>
          )}
        </div>

        {/* Dimension Mode Toggle */}
        <div>
          <label className="mb-1.5 block font-medium text-neutral-700 text-[13px]">{t("Kích thước khu vực cần lát")}</label>
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1 mb-2.5">
            <button
              type="button"
              onClick={() => setMode("dims")}
              className={`rounded-lg py-1.5 text-[12.5px] font-medium transition ${
                mode === "dims" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {t("Dài × Rộng (m)")}
            </button>
            <button
              type="button"
              onClick={() => setMode("area")}
              className={`rounded-lg py-1.5 text-[12.5px] font-medium transition ${
                mode === "area" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {t("Nhập thẳng diện tích (m²)")}
            </button>
          </div>

          {mode === "dims" ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  inputMode="decimal"
                  value={len}
                  onChange={(e) => setLen(e.target.value)}
                  className={inputClass}
                  placeholder={t("Dài")}
                  aria-label={t("Chiều dài (m)")}
                />
                <span className="absolute right-3 top-2 text-[12px] text-neutral-400">{t("m dài")}</span>
              </div>
              <span className="text-neutral-400 font-semibold">×</span>
              <div className="relative flex-1">
                <input
                  inputMode="decimal"
                  value={wid}
                  onChange={(e) => setWid(e.target.value)}
                  className={inputClass}
                  placeholder={t("Rộng")}
                  aria-label={t("Chiều rộng (m)")}
                />
                <span className="absolute right-3 top-2 text-[12px] text-neutral-400">{t("m rộng")}</span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input
                inputMode="decimal"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className={inputClass}
                placeholder="20"
                aria-label={t("Diện tích (m²)")}
              />
              <span className="absolute right-3 top-2 text-[12px] text-neutral-400">m²</span>
            </div>
          )}

          {areaM2 > 0 && (
            <p className="mt-1.5 text-[12px] text-emerald-600 font-medium">
              ≈ {Math.round(areaM2 * 100) / 100} m² sàn/tường
            </p>
          )}
        </div>

        {/* Pattern & Grout */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block font-medium text-neutral-700 text-[13px]">{t("Kiểu lát")}</label>
            <select value={pattern} onChange={(e) => setPattern(e.target.value as LayoutPattern)} className={inputClass}>
              {LAYOUT_PATTERNS.map((p) => (
                <option key={p} value={p}>
                  {LAYOUT_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block font-medium text-neutral-700 text-[13px]">Khe ron (mm)</label>
            <input inputMode="decimal" value={grout} onChange={(e) => setGrout(e.target.value)} className={inputClass} />
          </div>
        </div>

        {error && <div className="rounded-xl bg-red-50 p-2.5 text-[12px] text-red-600">{error}</div>}
      </div>

      <div className="border-t border-neutral-200 bg-neutral-50/70 p-3">
        <button
          type="submit"
          disabled={busy || !tileId || !(areaM2 > 0)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--w-primary)] py-2.5 text-[14px] font-semibold text-white shadow-xs transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? (
            <span>{t("Đang tính toán...")}</span>
          ) : (
            <>
              <span>Tính báo giá cho {areaM2 > 0 ? `${Math.round(areaM2 * 100) / 100} m²` : "..."}</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export function LeadForm({
  api,
  conversationId,
  quoteId,
  previewBase64,
  onDone,
  onClose,
}: {
  api: WidgetApi;
  conversationId: string | null;
  quoteId: string | null;
  previewBase64?: string;
  onDone: () => void;
  onClose: () => void;
}) {
  const t = useTr();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.lead({ conversationId, quoteId, name, phone, note, previewBase64 });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-[13.5px] text-neutral-900 shadow-2xs outline-none transition focus:border-[var(--w-primary)] focus:ring-2 focus:ring-[var(--w-primary)]/15";

  return (
    <form onSubmit={submit} className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-neutral-900">{t("Gửi shop tư vấn & nhận báo giá")}</h3>
            <p className="text-[11px] text-neutral-500">{t("Nhân viên gửi mẫu & báo giá qua Zalo")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label={t("Đóng")}
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3.5 overflow-y-auto p-4 text-[13.5px]">
        {previewBase64 && (
          <div className="relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-900/5 p-2">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewBase64} alt={t("Ảnh phòng xem thử")} className="h-16 w-20 rounded-lg object-cover shadow-xs" />
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-800">
                  {t("✓ Kèm ảnh phối cảnh")}
                </span>
                <p className="mt-1 text-[11.5px] text-neutral-600 line-clamp-2">
                  {t("Shop sẽ nhận ảnh phòng đã ốp gạch để tư vấn kích thước và vật tư chuẩn nhất.")}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block font-medium text-neutral-700 text-[13px]">{t("Họ tên anh / chị *")}</label>
          <input
            required
            placeholder={t("Ví dụ: Anh Tuấn, Chị Lan...")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            autoComplete="name"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium text-neutral-700 text-[13px]">{t("Số điện thoại / Zalo *")}</label>
          <input
            required
            placeholder="0912 345 678"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            autoComplete="tel"
          />
        </div>

        <div>
          <label className="mb-1 block font-medium text-neutral-700 text-[13px]">{t("Ghi chú (tùy chọn)")}</label>
          <textarea
            placeholder={t("Địa chỉ công trình, thời gian giao hàng hoặc mẫu gạch quan tâm...")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>

        {error && <div className="rounded-xl bg-red-50 p-2.5 text-[12px] text-red-600">{error}</div>}

        <p className="text-[11.5px] text-neutral-500 leading-relaxed">
          {t("🔒 Thông tin của anh/chị được bảo mật tuyệt đối. Shop sẽ liên hệ qua Zalo/Điện thoại trong giờ làm việc (8h–20h).")}
        </p>
      </div>

      <div className="border-t border-neutral-200 bg-neutral-50/70 p-3">
        <button
          type="submit"
          disabled={busy || !name.trim() || !phone.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--w-primary)] py-2.5 text-[14px] font-semibold text-white shadow-xs transition hover:brightness-110 active:scale-[0.99] disabled:opacity-50"
        >
          {busy ? t("Đang gửi thông tin...") : t("Gửi thông tin cho shop")}
        </button>
      </div>
    </form>
  );
}
