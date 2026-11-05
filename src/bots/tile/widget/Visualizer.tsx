"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LAYOUT_LABELS, LAYOUT_PATTERNS, formatVnd, type LayoutPattern } from "@/bots/tile/domain/quote";
import { DEFAULT_FLOOR_QUAD, DEFAULT_WALL_QUAD, type Pt } from "@/bots/tile/vision/homography";
import { autoPrompts, keepComponent, pickRegion, quadFromRegion, type Surface } from "@/bots/tile/vision/autoRegion";
import { TileRenderer, loadImage, loadPhoto, thumbnailBase64 } from "@/bots/tile/vision/renderer";
import type { Candidate, PromptPoint, Segmentation } from "@/bots/tile/vision/segmenter";
import { openSegmenter, type SegClient } from "@/bots/tile/vision/segmenterClient";
import type { TileCard, WidgetApi } from "./api";

const GROUT_COLORS = [
  { hex: "#f2f0ec", name: "Trắng" },
  { hex: "#b9b6ae", name: "Xám nhạt" },
  { hex: "#6b6a66", name: "Xám đậm" },
  { hex: "#2b2b2b", name: "Đen" },
  { hex: "#c9b48f", name: "Be ấm" },
];

type Mode = "tap" | "corners";
/** none: chưa có vùng (chỉ hiện ảnh) · sam: vùng AI · quad: vùng là tứ giác (khi AI không chạy được) */
type MaskKind = "none" | "sam" | "quad";
type Busy = null | { stage: "loading" | "detecting"; pct: number };

const SURFACE_LABEL = { floor: "sàn", wall: "tường" } as const;

export interface VisualizerResult {
  tileId: string;
  areaM2: number;
  pattern: LayoutPattern;
  previewBase64: string;
}

export function Visualizer({
  api,
  tiles,
  initialTileId,
  conversationId,
  onQuote,
  onLead,
  onAsk,
  onClose,
}: {
  api: WidgetApi;
  tiles: TileCard[];
  initialTileId?: string;
  conversationId: string | null;
  onQuote: (r: VisualizerResult) => void;
  onLead: (r: VisualizerResult) => void;
  onAsk: (thumbnailBase64: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<TileRenderer | null>(null);
  const photoRef = useRef<HTMLCanvasElement | null>(null);
  const segRef = useRef<Promise<SegClient> | null>(null);
  const baseRef = useRef<PromptPoint[]>([]); // điểm gợi ý tự động đã cho ra vùng hiện tại
  const runRef = useRef(0); // đánh số mỗi lần nhận diện để bỏ kết quả cũ
  const tracked = useRef(new Set<string>());

  const [hasPhoto, setHasPhoto] = useState(false);
  const [surface, setSurface] = useState<Surface>("floor");
  const [mode, setMode] = useState<Mode>("tap");
  const [quad, setQuad] = useState<Pt[]>(DEFAULT_FLOOR_QUAD);
  const [points, setPoints] = useState<{ x: number; y: number; positive: boolean }[]>([]);
  const [positive, setPositive] = useState(true);
  const [sam, setSam] = useState<Segmentation | null>(null);
  const [maskKind, setMaskKind] = useState<MaskKind>("none");
  const [busy, setBusy] = useState<Busy>(null);
  const [widthM, setWidthM] = useState("4");
  const [depthM, setDepthM] = useState("5");
  const [pattern, setPattern] = useState<LayoutPattern>("straight");
  const [groutMm, setGroutMm] = useState(2);
  const [groutColor, setGroutColor] = useState(GROUT_COLORS[1].hex);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState<number | null>(null);

  const usable = useMemo(() => tiles.filter((t) => t.usage.includes(surface)), [tiles, surface]);
  const [tileId, setTileId] = useState(initialTileId ?? usable[0]?.id ?? tiles[0]?.id ?? "");
  const tile = tiles.find((t) => t.id === tileId && t.usage.includes(surface)) ?? usable[0] ?? tiles.find((t) => t.id === tileId);

  const num = (s: string) => Number(s.replace(",", "."));
  const areaM2 = Math.round(num(widthM) * num(depthM) * 100) / 100;

  const draw = useCallback(() => {
    const r = rendererRef.current;
    if (!r || !tile || maskKind === "none" || !(num(widthM) > 0) || !(num(depthM) > 0)) return;
    try {
      r.render({ quad, widthM: num(widthM), depthM: num(depthM), tileWidthMm: tile.widthMm, tileHeightMm: tile.heightMm, groutMm, groutColor, pattern });
      if (!tracked.current.has(tile.id)) {
        tracked.current.add(tile.id);
        api.track("preview_rendered", { conversationId, tileId: tile.id });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, conversationId, depthM, groutColor, groutMm, maskKind, pattern, quad, tile, widthM]);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  // Tải vân gạch khi đổi mẫu (hoặc khi vừa có ảnh → renderer vừa được tạo)
  const textureUrl = tile?.textureUrl;
  useEffect(() => {
    if (!textureUrl || !hasPhoto) return;
    let cancelled = false;
    loadImage(textureUrl)
      .then((img) => {
        if (cancelled || !rendererRef.current) return;
        rendererRef.current.setTileTexture(img);
        drawRef.current();
      })
      .catch((e) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [textureUrl, hasPhoto]);

  // Mặt nạ: chỉ dựng lại khi vùng đổi (kéo góc ở chế độ AI không cần dựng lại mặt nạ)
  const maskQuad = maskKind === "quad" ? quad : null;
  useEffect(() => {
    const r = rendererRef.current;
    const photo = photoRef.current;
    if (!r || !photo || !hasPhoto) return;
    if (maskKind === "none") r.clearMask();
    else r.setMask(photo, quad, maskKind === "sam" ? sam : null);
    drawRef.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPhoto, maskKind, sam, maskQuad]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Đổi sang bề mặt mà mẫu đang chọn không dùng được → chọn mẫu đầu tiên hợp lệ
  useEffect(() => {
    if (usable.length && !usable.some((t) => t.id === tileId)) setTileId(usable[0].id);
  }, [usable, tileId]);

  // Dọn worker khi đóng
  useEffect(
    () => () => {
      runRef.current++;
      segRef.current?.then((s) => s.dispose()).catch(() => {});
    },
    [],
  );

  const ensureSegmenter = useCallback(async (): Promise<SegClient> => {
    if (!segRef.current) {
      const photo = photoRef.current!;
      segRef.current = openSegmenter(photo.toDataURL("image/jpeg", 0.92), (pct) => setBusy({ stage: "loading", pct: Math.round(pct) }));
      segRef.current.catch(() => (segRef.current = null));
    }
    return segRef.current;
  }, []);

  /** Dùng tứ giác mặc định làm vùng lát (khi AI không chạy được) để khách vẫn thấy kết quả ngay. */
  const fallbackToQuad = useCallback((surf: Surface, why: string) => {
    setSam(null);
    setQuad(surf === "floor" ? DEFAULT_FLOOR_QUAD : DEFAULT_WALL_QUAD);
    setMaskKind("quad");
    setMode("corners");
    setBusy(null);
    setStatus("");
    setError(why);
  }, []);

  /** Tự tìm vùng sàn/tường và lát gạch ngay — khách không cần chạm gì. */
  const autoDetect = useCallback(
    async (surf: Surface) => {
      if (!photoRef.current) return;
      const run = ++runRef.current;
      setError("");
      setPoints([]);
      baseRef.current = [];
      setMode("tap");
      setBusy({ stage: "loading", pct: 0 });
      setStatus(`AI đang tìm ${SURFACE_LABEL[surf]} trong ảnh...`);
      // Cho khách thấy gạch NGAY trên vùng ước lượng; AI sẽ tinh chỉnh cho khớp thật sau vài giây.
      setSam(null);
      setQuad(surf === "floor" ? DEFAULT_FLOOR_QUAD : DEFAULT_WALL_QUAD);
      setMaskKind("quad");
      try {
        const seg = await ensureSegmenter();
        if (run !== runRef.current) return;
        setBusy({ stage: "detecting", pct: 100 });
        const prompts = autoPrompts(surf);
        const perPrompt: Candidate[][] = [];
        for (const p of prompts) {
          perPrompt.push(await seg.segmentAll(p));
          if (run !== runRef.current) return;
        }
        const picked = pickRegion(perPrompt, prompts, surf);
        if (!picked) {
          fallbackToQuad(surf, `AI chưa nhận ra ${SURFACE_LABEL[surf]} trong ảnh này. Hãy chạm vào ${SURFACE_LABEL[surf]} hoặc kéo 4 góc cho khớp.`);
          return;
        }
        baseRef.current = prompts[picked.promptIndex];
        setSam({ mask: picked.mask, width: picked.width, height: picked.height });
        setQuad(quadFromRegion(picked.mask, picked.width, picked.height, surf) ?? (surf === "floor" ? DEFAULT_FLOOR_QUAD : DEFAULT_WALL_QUAD));
        setMaskKind("sam");
        setBusy(null);
        setStatus(`Đã tự lát gạch lên ${SURFACE_LABEL[surf]}. Chưa đúng chỗ? Chạm vào ảnh để thêm/bớt vùng, hoặc chỉnh 4 góc cho thẳng hàng.`);
      } catch (err) {
        if (run !== runRef.current) return;
        console.error(err);
        fallbackToQuad(surf, "Thiết bị này chưa chạy được AI nhận diện vùng — hãy kéo 4 góc cho khớp với mặt sàn/tường.");
      }
    },
    [api, conversationId, ensureSegmenter, fallbackToQuad],
  );

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const photo = await loadPhoto(file);
      runRef.current++;
      segRef.current?.then((s) => s.dispose()).catch(() => {});
      segRef.current = null;
      photoRef.current = photo;
      rendererRef.current ??= new TileRenderer(canvasRef.current!);
      rendererRef.current.setPhoto(photo);
      setSam(null);
      setMaskKind("none");
      setPoints([]);
      setQuad(surface === "floor" ? DEFAULT_FLOOR_QUAD : DEFAULT_WALL_QUAD);
      setHasPhoto(true);
      api.track("photo_uploaded", { conversationId });
      void autoDetect(surface);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được file ảnh");
    }
  }

  function switchSurface(next: Surface) {
    if (next === surface) return;
    setSurface(next);
    if (photoRef.current) void autoDetect(next);
  }

  function toNorm(e: React.PointerEvent): Pt {
    const r = overlayRef.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  }

  /** Khách chạm để thêm/bớt vùng (SAM). Điểm chạm của khách thay cho điểm tự động. */
  async function onTap(e: React.PointerEvent) {
    if (mode !== "tap" || !photoRef.current || busy) return;
    const [x, y] = toNorm(e);
    const next = [...points, { x, y, positive }];
    setPoints(next);
    setError("");
    const run = ++runRef.current;
    try {
      const seg = await ensureSegmenter();
      setBusy({ stage: "detecting", pct: 100 });
      setStatus("Đang tách vùng...");
      const all = [...baseRef.current, ...next]; // giữ gợi ý tự động làm nền, điểm chạm của khách tinh chỉnh thêm
      const cands = await seg.segmentAll(all);
      if (run !== runRef.current) return;
      const seeds = all.filter((p) => p.positive).map((p) => [p.x, p.y] as Pt);
      let best = cands[0];
      for (const c of cands) if (c.score > best.score) best = c;
      const mask = keepComponent(best.mask, best.width, best.height, seeds);
      setSam({ mask, width: best.width, height: best.height });
      const q = quadFromRegion(mask, best.width, best.height, surface);
      if (q) setQuad(q);
      setMaskKind("sam");
      setBusy(null);
      setStatus("Đã cập nhật vùng. Chạm thêm nếu còn thiếu, hoặc chọn mẫu gạch bên dưới.");
    } catch (err) {
      if (run !== runRef.current) return;
      console.error(err);
      fallbackToQuad(surface, "AI tách vùng không khả dụng trên thiết bị này — hãy kéo 4 góc cho khớp mặt sàn/tường.");
    }
  }

  function onMove(e: React.PointerEvent) {
    if (drag === null) return;
    const p = toNorm(e);
    setQuad((q) => q.map((c, i) => (i === drag ? p : c)));
  }

  function result(): VisualizerResult | null {
    if (!tile || !rendererRef.current || !hasPhoto) return null;
    return { tileId: tile.id, areaM2, pattern, previewBase64: rendererRef.current.toJpegBase64(0.82) };
  }

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-neutral-200/90 bg-white px-4 py-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--w-primary)] text-white shadow-xs">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" x2="12" y1="22" y2="12" />
            </svg>
          </div>
          <div>
            <h3 className="text-[14.5px] font-semibold text-neutral-900 leading-tight">Xem thử gạch trên ảnh phòng</h3>
            <p className="text-[11px] text-neutral-500">Mô phỏng phối cảnh & tỉ lệ gạch thực tế</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Canvas / Image Display Viewport */}
        <div className="relative bg-neutral-950 overflow-hidden select-none">
          <canvas ref={canvasRef} className={`block w-full max-h-[380px] object-contain mx-auto ${hasPhoto ? "" : "hidden"}`} />

          {hasPhoto && (
            <div
              ref={overlayRef}
              className="absolute inset-0 touch-none"
              onPointerDown={onTap}
              onPointerMove={onMove}
              onPointerUp={() => setDrag(null)}
              onPointerLeave={() => setDrag(null)}
            >
              {mode === "corners" && (
                <svg className="h-full w-full pointer-events-none" viewBox="0 0 1 1" preserveAspectRatio="none">
                  <polygon
                    points={quad.map((p) => p.join(",")).join(" ")}
                    fill="rgba(30, 91, 176, 0.15)"
                    stroke="#fff"
                    strokeWidth="0.005"
                    strokeDasharray="0.012 0.008"
                  />
                </svg>
              )}
              {mode === "corners" &&
                quad.map(([x, y], i) => (
                  <button
                    key={i}
                    aria-label={`Góc ${i + 1}`}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                      setDrag(i);
                    }}
                    className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--w-primary)] shadow-lg flex items-center justify-center text-white text-[11px] font-bold active:scale-125 transition-transform"
                    style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                  >
                    {i + 1}
                  </button>
                ))}
              {mode === "tap" &&
                points.map((p, i) => (
                  <span
                    key={i}
                    className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md transition-transform animate-scale-in ${
                      p.positive ? "bg-emerald-500 ring-2 ring-emerald-300" : "bg-red-500 ring-2 ring-red-300"
                    }`}
                    style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                  />
                ))}
            </div>
          )}

          {hasPhoto && busy && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-[12px] font-medium text-white shadow-lg backdrop-blur-md">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {busy.stage === "loading" && busy.pct > 0 && busy.pct < 100
                  ? `Đang tải AI nhận diện (chỉ lần đầu)... ${busy.pct}%`
                  : `AI đang khớp ${SURFACE_LABEL[surface]} theo ảnh của bạn...`}
              </span>
            </div>
          )}

          {/* Upload Dropzone when no photo */}
          {!hasPhoto && (
            <div className="flex flex-col items-center justify-center p-8 text-center text-white min-h-[260px] bg-gradient-to-b from-neutral-900 to-neutral-950">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md text-[var(--brand-light)] ring-1 ring-white/15">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-[var(--w-primary)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-md transition hover:brightness-110 active:scale-95">
                    <span>📷 Chụp ảnh phòng</span>
                  </span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-white/12 px-5 py-2.5 text-[14px] font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20 active:scale-95">
                    <span>🖼️ Chọn từ thư viện</span>
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
              </div>
              <p className="mt-3 max-w-xs text-[12px] text-neutral-400 leading-relaxed">
                Chụp góc rộng nhìn rõ mặt sàn hoặc tường — AI sẽ tự tìm và lát gạch ngay. Ảnh chỉ xử lý trên máy của bạn và không gửi đi nếu bạn chưa bấm gửi.
              </p>
            </div>
          )}

          {/* Mode Switcher Bar on Top of Photo */}
          {hasPhoto && (
            <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
              <div className="flex gap-1 rounded-xl bg-black/60 p-1 backdrop-blur-md pointer-events-auto">
                <button
                  type="button"
                  onClick={() => switchSurface("floor")}
                  className={`rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition ${
                    surface === "floor" ? "bg-[var(--w-primary)] text-white shadow-xs" : "text-white/80 hover:text-white"
                  }`}
                >
                  🏠 Lát sàn
                </button>
                <button
                  type="button"
                  onClick={() => switchSurface("wall")}
                  className={`rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition ${
                    surface === "wall" ? "bg-[var(--w-primary)] text-white shadow-xs" : "text-white/80 hover:text-white"
                  }`}
                >
                  🧱 Ốp tường
                </button>
              </div>

              <label className="cursor-pointer rounded-xl bg-black/60 px-2.5 py-1 text-[11.5px] font-medium text-white/90 backdrop-blur-md pointer-events-auto hover:bg-black/80 transition">
                Đổi ảnh
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </div>
          )}
        </div>

        {/* Controls Section */}
        <div className="space-y-4 p-4 text-[13px]">
          {/* Status & Help Tooltip */}
          {status && (
            <div className="flex items-center gap-2 rounded-xl bg-blue-50/80 px-3 py-2 text-[12px] text-blue-900 border border-blue-100/80">
              {busy && (
                <svg className="h-3.5 w-3.5 animate-spin text-[var(--w-primary)] shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              <span className="flex-1">{status}</span>
            </div>
          )}
          {error && <div className="rounded-xl bg-red-50 p-2.5 text-[12px] text-red-600 border border-red-100">{error}</div>}

          {/* Mask & Perspective Tools */}
          {hasPhoto && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-neutral-100/80 p-1.5 border border-neutral-200/60">
              <button
                type="button"
                onClick={() => setMode("tap")}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${
                  mode === "tap" ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Chạm để chọn vùng
              </button>
              <button
                type="button"
                onClick={() => setMode("corners")}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${
                  mode === "corners" ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Chỉnh phối cảnh (4 góc)
              </button>
              {mode === "tap" && (
                <button
                  type="button"
                  onClick={() => setPositive((p) => !p)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                    positive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {positive ? "+ Thêm vùng" : "- Bỏ vùng"}
                </button>
              )}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void autoDetect(surface)}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--w-primary)] hover:underline disabled:opacity-50"
              >
                ↻ Tự nhận diện lại
              </button>
            </div>
          )}

          {/* Tile Selection Carousel */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-neutral-800 text-[13px]">
                Chọn mẫu gạch ({usable.length} mẫu {surface === "floor" ? "lát sàn" : "ốp tường"})
              </span>
              {tile && (
                <span className="text-[12px] font-bold text-[var(--w-primary)]">
                  {formatVnd(tile.pricePerM2)}/m²
                </span>
              )}
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1.5 scrollbar-thin">
              {usable.map((t) => {
                const active = t.id === tile?.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTileId(t.id)}
                    className={`group relative flex w-24 shrink-0 flex-col overflow-hidden rounded-xl border-2 text-left transition-all ${
                      active ? "border-[var(--w-primary)] shadow-xs scale-102" : "border-neutral-200/90 hover:border-neutral-300"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.textureUrl} alt={t.name} className="h-16 w-full object-cover" />
                    <div className="p-1.5 bg-white space-y-0.5">
                      <span className="block truncate text-[11px] font-semibold text-neutral-900">{t.name}</span>
                      <span className="block text-[10px] text-neutral-500">{t.size}</span>
                    </div>
                    {active && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--w-primary)] text-[9px] text-white">
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Layout Patterns */}
          <div>
            <span className="mb-1.5 block font-semibold text-neutral-800 text-[13px]">Kiểu lát gạch</span>
            <div className="grid grid-cols-4 gap-1.5">
              {LAYOUT_PATTERNS.map((p) => {
                const active = pattern === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPattern(p)}
                    className={`rounded-xl py-2 px-1 text-center text-[11.5px] font-medium border transition ${
                      active
                        ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-white shadow-xs font-semibold"
                        : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    {LAYOUT_LABELS[p]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dimensions & Grout Configuration */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Dimensions */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-2.5">
              <span className="block text-[11.5px] font-medium text-neutral-600 mb-1">Kích thước vùng lát</span>
              <div className="flex items-center gap-1.5">
                <input
                  inputMode="decimal"
                  value={widthM}
                  onChange={(e) => setWidthM(e.target.value)}
                  className="w-14 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-[13px] font-medium text-neutral-900 text-center"
                  aria-label="Chiều ngang"
                />
                <span className="text-neutral-400">×</span>
                <input
                  inputMode="decimal"
                  value={depthM}
                  onChange={(e) => setDepthM(e.target.value)}
                  className="w-14 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-[13px] font-medium text-neutral-900 text-center"
                  aria-label="Chiều sâu"
                />
                <span className="text-[11.5px] font-semibold text-neutral-700">m</span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">≈ {areaM2 > 0 ? `${areaM2} m²` : "..."}</p>
            </div>

            {/* Grout Controls */}
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11.5px] font-medium text-neutral-600">Đường ron</span>
                <span className="text-[11px] font-semibold text-neutral-800">{groutMm} mm</span>
              </div>
              <input
                type="range"
                min={0}
                max={8}
                step={1}
                value={groutMm}
                onChange={(e) => setGroutMm(Number(e.target.value))}
                className="w-full accent-[var(--w-primary)] h-1 mb-2"
              />
              <div className="flex items-center justify-between">
                {GROUT_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    title={`Màu ron: ${c.name}`}
                    aria-label={`Màu ron ${c.name}`}
                    onClick={() => setGroutColor(c.hex)}
                    className={`h-5 w-5 rounded-full border transition-transform ${
                      groutColor === c.hex ? "ring-2 ring-[var(--w-primary)] ring-offset-1 scale-110" : "border-neutral-300 hover:scale-105"
                    }`}
                    style={{ background: c.hex }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Buttons */}
      {hasPhoto && (
        <div className="grid grid-cols-3 gap-2 border-t border-neutral-200 bg-white p-3 shadow-lg">
          <button
            type="button"
            onClick={() => photoRef.current && onAsk(thumbnailBase64(photoRef.current))}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white py-2 text-[12.5px] font-medium text-neutral-800 hover:bg-neutral-50 active:scale-95 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
            </svg>
            <span>Hỏi tư vấn</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const r = result();
              if (r) onQuote(r);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white py-2 text-[12.5px] font-medium text-neutral-800 hover:bg-neutral-50 active:scale-95 transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          <button
            type="button"
            onClick={() => {
              const r = result();
              if (r) onLead(r);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--w-primary)] py-2 text-[12.5px] font-semibold text-white shadow-xs hover:brightness-110 active:scale-95 transition"
          >
            <span>Gửi cho shop</span>
            <span>→</span>
          </button>
        </div>
      )}
    </div>
  );
}
