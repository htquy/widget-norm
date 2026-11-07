"use client";

import { ExpandButton } from "@/components/widget/frame";
import { useTr, type Tr } from "@/components/widget/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LAYOUT_LABELS, LAYOUT_PATTERNS, formatVnd, type LayoutPattern } from "@/bots/tile/domain/quote";
import { USAGE_LABELS, type SurfaceKind } from "@/bots/tile/domain/tile";
import { DEFAULT_FLOOR_QUAD, DEFAULT_WALL_QUAD, type Pt } from "@/bots/tile/vision/homography";
import { autoPrompts, keepComponent, pickRegion, quadFromRegion } from "@/bots/tile/vision/autoRegion";
import { TileRenderer, loadImage, loadPhoto, maskFromPolygons, maskFromSegmentation, thumbnailBase64 } from "@/bots/tile/vision/renderer";
import { SCENES, renderScene, type Scene } from "@/bots/tile/vision/scenes";
import type { Candidate, PromptPoint, Segmentation } from "@/bots/tile/vision/segmenter";
import { openSegmenter, type SegClient } from "@/bots/tile/vision/segmenterClient";
import type { TileCard, WidgetApi } from "./api";

const groutColors = (t: Tr) => [
  { hex: "#f2f0ec", name: t("Trắng") },
  { hex: "#b9b6ae", name: t("Xám nhạt") },
  { hex: "#6b6a66", name: t("Xám đậm") },
  { hex: "#2b2b2b", name: t("Đen") },
  { hex: "#c9b48f", name: t("Be ấm") },
];

type SurfaceDef = { kind: SurfaceKind; tab: string; noun: string; icon: string; dims: [string, string]; defaults: [string, string]; quad: Pt[] };
const surfaces = (t: Tr): SurfaceDef[] => [
  { kind: "floor", tab: t("Sàn"), noun: t("sàn"), icon: "🏠", dims: [t("Rộng"), t("Sâu")], defaults: ["4", "5"], quad: DEFAULT_FLOOR_QUAD },
  { kind: "wall", tab: t("Tường"), noun: t("tường"), icon: "🧱", dims: [t("Rộng"), "Cao"], defaults: ["4", "2.8"], quad: DEFAULT_WALL_QUAD },
  { kind: "outdoor", tab: t("Sân"), noun: t("sân"), icon: "🌿", dims: [t("Rộng"), t("Dài")], defaults: ["5", "6"], quad: DEFAULT_FLOOR_QUAD },
  { kind: "roof", tab: t("Mái"), noun: t("mái"), icon: "🏡", dims: [t("Dài mái"), t("Dài dốc")], defaults: ["8", "4"], quad: [[0.2, 0.12], [0.8, 0.12], [0.95, 0.45], [0.05, 0.45]] },
];
const surfMap = (t: Tr) => Object.fromEntries(surfaces(t).map((s) => [s.kind, s])) as Record<SurfaceKind, SurfaceDef>;
/** Thứ tự hiển thị nhãn phương án */
const DRAW_ORDER: SurfaceKind[] = ["wall", "roof", "outdoor", "floor"];

type Mode = "tap" | "corners";
type MaskSrc = { kind: "none" } | { kind: "quad" } | { kind: "seg"; seg: Segmentation } | { kind: "scene"; polys: Pt[][]; holes: Pt[][] };
type Busy = null | { stage: "loading" | "detecting"; pct: number };
type Source = { kind: "photo" } | { kind: "scene"; scene: Scene };

interface Layer {
  surface: SurfaceKind;
  visible: boolean;
  tileId: string;
  pattern: LayoutPattern;
  groutMm: number;
  groutColor: string;
  widthM: string;
  depthM: string;
  quad: Pt[];
  mask: MaskSrc;
  /** Điểm gợi ý tự động đã cho ra vùng hiện tại (nền để khách chạm thêm/bớt) */
  base: PromptPoint[];
  points: PromptPoint[];
  /** Thứ tự chồng lớp: vùng vừa được AI/khách chỉnh nằm trên cùng (vùng AI có thể chồng lấn nhau) */
  z: number;
}

export interface VisualizerResult {
  tileId: string;
  areaM2: number;
  pattern: LayoutPattern;
  surface: SurfaceKind;
  previewBase64: string;
}

const num = (s: string) => Number(s.replace(",", "."));
const areaOf = (l: Layer) => Math.round(num(l.widthM) * num(l.depthM) * 100) / 100;
const isRoofCard = (t: TileCard) => t.usage.length > 0 && t.usage.every((u) => u === "roof");

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
  const t = useTr();
  const GROUT_COLORS = groutColors(t);
  const SURFACES = surfaces(t);
  const SURF = surfMap(t);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<TileRenderer | null>(null);
  const photoRef = useRef<HTMLCanvasElement | null>(null);
  const segRef = useRef<Promise<SegClient> | null>(null);
  const runRef = useRef<Partial<Record<SurfaceKind, number>>>({}); // đánh số mỗi lần nhận diện để bỏ kết quả cũ
  const gpuRef = useRef({ mask: {} as Partial<Record<SurfaceKind, unknown>>, tex: {} as Partial<Record<SurfaceKind, string>>, loading: {} as Partial<Record<SurfaceKind, string>> });
  const tracked = useRef(new Set<string>());
  const zRef = useRef(0);

  const [source, setSource] = useState<Source | null>(null);
  const [aspect, setAspect] = useState(1.5);
  const [photoUrl, setPhotoUrl] = useState("");
  const [layers, setLayers] = useState<Partial<Record<SurfaceKind, Layer>>>({});
  const [active, setActive] = useState<SurfaceKind>("floor");
  const [mode, setMode] = useState<Mode>("tap");
  const [positive, setPositive] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [drag, setDrag] = useState<number | null>(null);
  const [compare, setCompare] = useState<number | null>(null);
  const [snapshots, setSnapshots] = useState<{ url: string; label: string }[]>([]);
  const [viewing, setViewing] = useState<string | null>(null);

  const hasPhoto = source !== null;
  const layer = layers[active];
  const tileById = useCallback((id: string) => tiles.find((t) => t.id === id), [tiles]);

  /** Mẫu dùng được cho bề mặt; sân ngoài trời chưa có mẫu riêng thì dùng mẫu lát sàn. */
  const usableFor = useCallback(
    (s: SurfaceKind) => {
      const own = tiles.filter((t) => t.usage.includes(s));
      if (own.length || s !== "outdoor") return own;
      return tiles.filter((t) => t.usage.includes("floor"));
    },
    [tiles],
  );
  const usable = useMemo(() => usableFor(active), [usableFor, active]);
  const tile = layer ? tileById(layer.tileId) : undefined;

  const updateLayer = useCallback((s: SurfaceKind, patch: Partial<Layer> | ((l: Layer) => Partial<Layer>)) => {
    setLayers((all) => {
      const l = all[s];
      if (!l) return all;
      return { ...all, [s]: { ...l, ...(typeof patch === "function" ? patch(l) : patch) } };
    });
  }, []);

  const newLayer = useCallback(
    (s: SurfaceKind, extra: Partial<Layer> = {}): Layer => {
      const list = usableFor(s);
      const preferred = list.find((t) => t.id === initialTileId) ?? list[0];
      return {
        surface: s,
        visible: true,
        tileId: preferred?.id ?? "",
        pattern: "straight",
        groutMm: s === "roof" ? 0 : 2,
        groutColor: GROUT_COLORS[1].hex,
        widthM: SURF[s].defaults[0],
        depthM: SURF[s].defaults[1],
        quad: SURF[s].quad,
        mask: { kind: "none" },
        base: [],
        points: [],
        z: ++zRef.current,
        ...extra,
      };
    },
    [usableFor, initialTileId],
  );

  // ---------- Đồng bộ lên GPU + vẽ ----------
  const layersRef = useRef(layers);
  layersRef.current = layers;
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const redraw = useCallback(() => {
    const r = rendererRef.current;
    const photo = photoRef.current;
    if (!r || !photo) return;
    const gpu = gpuRef.current;
    const ls = layersRef.current;
    const occluders = sourceRef.current?.kind === "scene" ? sourceRef.current.scene.occluders : [];
    for (const { kind: s } of SURFACES) {
      const l = ls[s];
      if (!l) {
        if (s in gpu.mask) {
          r.removeLayer(s);
          delete gpu.mask[s];
          delete gpu.tex[s];
          delete gpu.loading[s];
        }
        continue;
      }
      const key = l.mask.kind === "quad" ? l.quad : l.mask;
      if (gpu.mask[s] !== key) {
        gpu.mask[s] = key;
        const m = l.mask;
        const canvas =
          m.kind === "seg"
            ? maskFromSegmentation(m.seg, photo.width, photo.height)
            : m.kind === "scene"
              ? maskFromPolygons(m.polys, photo.width, photo.height, [...m.holes, ...occluders])
              : maskFromPolygons(m.kind === "quad" ? [l.quad] : [], photo.width, photo.height, occluders);
        r.setLayerMask(s, canvas);
      }
      const t = tileById(l.tileId);
      if (t && gpu.tex[s] !== t.textureUrl && gpu.loading[s] !== t.textureUrl) {
        gpu.loading[s] = t.textureUrl;
        loadImage(t.textureUrl)
          .then((img) => {
            if (gpu.loading[s] !== t.textureUrl || rendererRef.current !== r) return;
            r.setLayerTexture(s, img);
            gpu.tex[s] = t.textureUrl;
            redrawRef.current();
          })
          .catch((e) => setError(e.message));
      }
    }
    try {
      r.render(
        (Object.values(ls) as Layer[])
          .sort((a, b) => a.z - b.z)
          .map((l) => l.surface)
          .flatMap((s) => {
          const l = ls[s];
          const t = l && tileById(l.tileId);
          if (!l || !t || !l.visible || l.mask.kind === "none" || gpu.tex[s] !== t.textureUrl) return [];
          return [
            {
              id: s,
              params: {
                quad: l.quad,
                widthM: num(l.widthM),
                depthM: num(l.depthM),
                tileWidthMm: t.widthMm,
                tileHeightMm: t.heightMm,
                groutMm: l.groutMm,
                groutColor: l.groutColor,
                pattern: l.pattern,
                relief: s === "roof" || isRoofCard(t) ? ("roof" as const) : ("flat" as const),
                gloss: t.finish === "glossy" ? 0.6 : t.finish === "matte" ? 0.12 : 0,
              },
            },
          ];
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [tileById]);
  const redrawRef = useRef(redraw);
  redrawRef.current = redraw;

  useEffect(() => {
    redraw();
    for (const l of Object.values(layers)) {
      if (l?.tileId && l.mask.kind !== "none" && !tracked.current.has(l.tileId)) {
        tracked.current.add(l.tileId);
        api.track("preview_rendered", { conversationId, tileId: l.tileId });
      }
    }
  }, [layers, redraw, api, conversationId]);

  // Dọn worker khi đóng
  useEffect(
    () => () => {
      segRef.current?.then((s) => s.dispose()).catch(() => {});
    },
    [],
  );

  // ---------- Nạp ảnh / phòng mẫu ----------
  function loadBase(c: HTMLCanvasElement) {
    segRef.current?.then((s) => s.dispose()).catch(() => {});
    segRef.current = null;
    runRef.current = {};
    photoRef.current = c;
    rendererRef.current ??= new TileRenderer(canvasRef.current!);
    rendererRef.current.setPhoto(c);
    gpuRef.current = { mask: {}, tex: {}, loading: {} };
    setAspect(c.width / c.height);
    setPhotoUrl(c.toDataURL("image/jpeg", 0.85));
    setCompare(null);
    setBusy(null);
    setError("");
    setStatus("");
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const photo = await loadPhoto(file);
      loadBase(photo);
      setSource({ kind: "photo" });
      const start: SurfaceKind = active;
      setLayers({ [start]: newLayer(start) });
      setActive(start);
      setMode("tap");
      api.track("photo_uploaded", { conversationId });
      void autoDetect(start);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Không đọc được file ảnh"));
    }
  }

  function sceneLayer(scene: Scene, s: SurfaceKind): Layer {
    const surf = scene.surfaces[s]!;
    return newLayer(s, {
      quad: surf.quad,
      widthM: String(surf.widthM),
      depthM: String(surf.depthM),
      mask: { kind: "scene", polys: surf.polys ?? [surf.quad], holes: surf.holes ?? [] },
      pattern: s === "outdoor" ? "half_offset" : "straight",
    });
  }

  function onScene(scene: Scene) {
    loadBase(renderScene(scene));
    setSource({ kind: "scene", scene });
    const ls: Partial<Record<SurfaceKind, Layer>> = {};
    for (const s of scene.start) ls[s] = sceneLayer(scene, s);
    setLayers(ls);
    setActive(scene.start[0]);
    setMode("tap");
    setStatus(`Phòng mẫu "${scene.name}". Chọn mẫu gạch bên dưới; bấm các tab để phối thêm bề mặt khác.`);
  }

  // ---------- AI tự nhận diện ----------
  const ensureSegmenter = useCallback(async (): Promise<SegClient> => {
    if (!segRef.current) {
      const photo = photoRef.current!;
      segRef.current = openSegmenter(photo.toDataURL("image/jpeg", 0.92), (pct) => setBusy({ stage: "loading", pct: Math.round(pct) }));
      segRef.current.catch(() => (segRef.current = null));
    }
    return segRef.current;
  }, []);

  /** Tự tìm vùng và lát gạch ngay — khách không cần chạm gì. Trong lúc AI chạy, gạch phủ tạm vùng ước lượng. */
  const autoDetect = useCallback(
    async (s: SurfaceKind) => {
      if (!photoRef.current) return;
      const run = (runRef.current[s] = (runRef.current[s] ?? 0) + 1);
      const fallback = SURF[s].quad;
      setError("");
      setMode("tap");
      updateLayer(s, { mask: { kind: "quad" }, quad: fallback, base: [], points: [] });
      setBusy({ stage: "loading", pct: 0 });
      setStatus(`AI đang tìm ${SURF[s].noun} trong ảnh...`);
      try {
        const seg = await ensureSegmenter();
        if (run !== runRef.current[s]) return;
        setBusy({ stage: "detecting", pct: 100 });
        const prompts = autoPrompts(s);
        const perPrompt: Candidate[][] = [];
        for (const p of prompts) {
          perPrompt.push(await seg.segmentAll(p));
          if (run !== runRef.current[s]) return;
        }
        const picked = pickRegion(perPrompt, prompts, s);
        setBusy(null);
        if (!picked) {
          setMode("corners");
          setStatus("");
          setError(`AI chưa nhận ra ${SURF[s].noun} trong ảnh này — gạch đang phủ vùng ước lượng. Hãy chạm vào ${SURF[s].noun} hoặc kéo 4 góc cho khớp.`);
          return;
        }
        updateLayer(s, {
          base: prompts[picked.promptIndex],
          z: ++zRef.current,
          mask: { kind: "seg", seg: { mask: picked.mask, width: picked.width, height: picked.height } },
          quad: quadFromRegion(picked.mask, picked.width, picked.height, s) ?? fallback,
        });
        setStatus(`Đã tự lát ${SURF[s].noun}. Chưa đúng chỗ? Chạm vào ảnh để thêm/bớt vùng, hoặc chỉnh 4 góc cho thẳng hàng.`);
      } catch (err) {
        if (run !== runRef.current[s]) return;
        console.error(err);
        setBusy(null);
        setMode("corners");
        setStatus("");
        setError(`Thiết bị này chưa chạy được AI nhận diện vùng — hãy kéo 4 góc cho khớp với ${SURF[s].noun}.`);
      }
    },
    [ensureSegmenter, updateLayer],
  );

  /** Bấm tab bề mặt: chưa có lớp thì tạo (ảnh thật → AI tự tìm; phòng mẫu → lấy vùng có sẵn). */
  function openSurface(s: SurfaceKind) {
    setActive(s);
    setError("");
    if (layers[s] || !source) return;
    if (source.kind === "scene") {
      if (!source.scene.surfaces[s]) return;
      setLayers((all) => ({ ...all, [s]: sceneLayer(source.scene, s) }));
      return;
    }
    setLayers((all) => ({ ...all, [s]: newLayer(s) }));
    void autoDetect(s);
  }

  function removeSurface(s: SurfaceKind) {
    runRef.current[s] = (runRef.current[s] ?? 0) + 1;
    setBusy(null);
    setLayers((all) => {
      const next = { ...all };
      delete next[s];
      return next;
    });
  }

  // ---------- Thao tác trên ảnh ----------
  function toNorm(e: React.PointerEvent): Pt {
    const r = overlayRef.current!.getBoundingClientRect();
    return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
  }

  async function onTap(e: React.PointerEvent) {
    if (mode !== "tap" || source?.kind !== "photo" || !layer || busy || compare !== null) return;
    const s = active;
    const [x, y] = toNorm(e);
    const next = [...layer.points, { x, y, positive }];
    updateLayer(s, { points: next });
    setError("");
    const run = (runRef.current[s] = (runRef.current[s] ?? 0) + 1);
    try {
      const seg = await ensureSegmenter();
      setBusy({ stage: "detecting", pct: 100 });
      setStatus(t("Đang tách vùng..."));
      const all = [...layer.base, ...next]; // giữ gợi ý tự động làm nền, điểm chạm của khách tinh chỉnh thêm
      const cands = await seg.segmentAll(all);
      if (run !== runRef.current[s]) return;
      const seeds = all.filter((p) => p.positive).map((p) => [p.x, p.y] as Pt);
      let best = cands[0];
      for (const c of cands) if (c.score > best.score) best = c;
      const mask = keepComponent(best.mask, best.width, best.height, seeds);
      const q = quadFromRegion(mask, best.width, best.height, s);
      updateLayer(s, (l) => ({ mask: { kind: "seg", seg: { mask, width: best.width, height: best.height } }, quad: q ?? l.quad, z: ++zRef.current }));
      setBusy(null);
      setStatus(t("Đã cập nhật vùng. Chạm thêm nếu còn thiếu, hoặc chọn mẫu gạch bên dưới."));
    } catch (err) {
      if (run !== runRef.current[s]) return;
      console.error(err);
      setBusy(null);
      setMode("corners");
      setError(t("AI tách vùng không khả dụng trên thiết bị này — hãy kéo 4 góc cho khớp."));
    }
  }

  function onMove(e: React.PointerEvent) {
    if (drag === null || !layer) return;
    const p = toNorm(e);
    updateLayer(active, (l) => ({ quad: l.quad.map((c, i) => (i === drag ? p : c)) }));
  }

  // ---------- Kết quả ----------
  function result(): VisualizerResult | null {
    if (!layer || !tile || !hasPhoto || !rendererRef.current) return null;
    return { tileId: tile.id, areaM2: areaOf(layer), pattern: layer.pattern, surface: layer.surface, previewBase64: rendererRef.current.toJpegBase64(0.82) };
  }

  function designLabel() {
    return DRAW_ORDER.filter((s) => layers[s]?.visible && layers[s]?.mask.kind !== "none")
      .map((s) => `${SURF[s].tab}: ${tileById(layers[s]!.tileId)?.name ?? "?"}`)
      .join(" · ");
  }

  function saveSnapshot() {
    const c = canvasRef.current;
    if (!c) return;
    const url = `data:image/jpeg;base64,${thumbnailBase64(c, 1100)}`;
    setSnapshots((list) => [{ url, label: designLabel() }, ...list].slice(0, 6));
  }

  function download() {
    const c = canvasRef.current;
    if (!c) return;
    c.toBlob(
      (blob) => {
        if (!blob) return;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `phoi-canh-gach-${Date.now()}.jpg`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      },
      "image/jpeg",
      0.92,
    );
  }

  const tabs = source?.kind === "scene" ? SURFACES.filter((s) => source.scene.surfaces[s.kind]) : SURFACES;
  const moduleM2 = tile ? (tile.widthMm * tile.heightMm) / 1e6 : 0;
  const estimate =
    layer && tile && areaOf(layer) > 0
      ? active === "roof" || isRoofCard(tile)
        ? `≈ ${Math.ceil(areaOf(layer) / moduleM2)} viên (${Math.round(1 / moduleM2)} viên/m², chưa gồm hao hụt)`
        : `≈ ${areaOf(layer)} m² (chưa gồm hao hụt)`
      : "";

  return (
    <div className="relative flex h-full flex-col bg-white">
      {/* Header */}
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
            <h3 className="text-[14.5px] font-semibold leading-tight text-neutral-900">{t("Thiết kế gạch trên ảnh")}</h3>
            <p className="text-[11px] text-neutral-500">{t("Sàn · tường · sân vườn · mái ngói — phối cảnh & tỉ lệ thật")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ExpandButton className="!h-8 !w-8 text-neutral-500 hover:!bg-neutral-100" />
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
            aria-label={t("Đóng")}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Khung ảnh: đúng tỉ lệ ảnh để toạ độ chạm khớp từng pixel */}
        <div className="relative flex select-none justify-center bg-neutral-950">
          <div className={`relative ${hasPhoto ? "" : "hidden"}`} style={{ width: `min(100%, max(${Math.round(380 * aspect)}px, calc((100dvh - 250px) * ${aspect})))`, aspectRatio: String(aspect) }}>
            <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
            {compare !== null && photoUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt={t("Ảnh gốc")} className="pointer-events-none absolute inset-0 h-full w-full" style={{ clipPath: `inset(0 ${100 - compare}% 0 0)` }} />
                <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${compare}%` }} />
                <span className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10.5px] text-white">{t("Trước")}</span>
                <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10.5px] text-white">Sau</span>
              </>
            )}

            <div
              ref={overlayRef}
              className="absolute inset-0 touch-none"
              onPointerDown={onTap}
              onPointerMove={onMove}
              onPointerUp={() => setDrag(null)}
              onPointerLeave={() => setDrag(null)}
            >
              {mode === "corners" && layer && compare === null && (
                <>
                  <svg className="pointer-events-none h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
                    <polygon points={layer.quad.map((p) => p.join(",")).join(" ")} fill="rgba(30, 91, 176, 0.12)" stroke="#fff" strokeWidth="0.004" strokeDasharray="0.012 0.008" />
                  </svg>
                  {layer.quad.map(([x, y], i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Góc ${i + 1}`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                        setDrag(i);
                      }}
                      className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[var(--w-primary)] text-[11px] font-bold text-white shadow-lg transition-transform active:scale-125"
                      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                    >
                      {i + 1}
                    </button>
                  ))}
                </>
              )}
              {mode === "tap" &&
                layer?.points.map((p, i) => (
                  <span
                    key={i}
                    className={`absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ${p.positive ? "bg-emerald-500 ring-2 ring-emerald-300" : "bg-red-500 ring-2 ring-red-300"}`}
                    style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                  />
                ))}
            </div>

            {busy && (
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-[12px] font-medium text-white shadow-lg backdrop-blur-md">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  {busy.stage === "loading" && busy.pct > 0 && busy.pct < 100 ? `Đang tải AI nhận diện (chỉ lần đầu)... ${busy.pct}%` : `AI đang khớp ${SURF[active].noun} theo ảnh của bạn...`}
                </span>
              </div>
            )}

            <div className="pointer-events-none absolute left-2 right-2 top-2 flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  segRef.current?.then((s) => s.dispose()).catch(() => {});
                  segRef.current = null;
                  setSource(null);
                  setLayers({});
                  setSnapshots([]);
                  setStatus("");
                  setError("");
                  setBusy(null);
                }}
                className="pointer-events-auto rounded-xl bg-black/60 px-2.5 py-1 text-[11.5px] font-medium text-white/90 backdrop-blur-md transition hover:bg-black/80"
              >
                {t("Đổi ảnh / phòng mẫu")}
              </button>
            </div>
          </div>

          {/* Chưa có ảnh: chụp / chọn ảnh hoặc dùng phòng mẫu */}
          {!hasPhoto && (
            <div className="flex min-h-[260px] w-full flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-950 p-6 text-center text-white">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-[var(--w-primary)] px-5 py-2.5 text-[14px] font-semibold text-white shadow-md transition hover:brightness-110 active:scale-95">
                    {t("📷 Chụp ảnh")}
                  </span>
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 rounded-xl bg-white/12 px-5 py-2.5 text-[14px] font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20 active:scale-95">
                    {t("🖼️ Chọn từ thư viện")}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </label>
              </div>
              <p className="mt-2.5 max-w-sm text-[12px] leading-relaxed text-neutral-400">
                {t("Ảnh sàn, tường, sân hay mái nhà đều được — AI tự tìm và lát gạch ngay. Ảnh chỉ xử lý trên máy của bạn.")}
              </p>
              <div className="mt-4 w-full">
                <p className="mb-2 text-[12px] font-medium text-neutral-300">{t("Chưa có ảnh? Thử ngay trên phòng mẫu:")}</p>
                <SceneThumbs onPick={onScene} />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 p-4 text-[13px]">
          {/* Tab bề mặt (mỗi bề mặt một lớp gạch riêng) */}
          {hasPhoto && (
            <div className="flex flex-wrap items-center gap-1.5">
              {tabs.map((s) => {
                const l = layers[s.kind];
                const on = active === s.kind;
                return (
                  <button
                    key={s.kind}
                    type="button"
                    onClick={() => openSurface(s.kind)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition ${
                      on ? "border-[var(--w-primary)] bg-[var(--w-primary)] text-white shadow-xs" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                    }`}
                  >
                    <span>{s.icon}</span>
                    {s.tab}
                    {l ? <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-white" : "bg-emerald-500"}`} /> : <span className="text-[11px] opacity-70">+</span>}
                  </button>
                );
              })}
              {layer && (
                <span className="ml-auto inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateLayer(active, (l) => ({ visible: !l.visible }))}
                    className="rounded-lg px-2 py-1 text-[11.5px] text-neutral-500 hover:bg-neutral-100"
                  >
                    {layer.visible ? t("Ẩn lớp") : t("Hiện lớp")}
                  </button>
                  <button type="button" onClick={() => removeSurface(active)} className="rounded-lg px-2 py-1 text-[11.5px] text-red-500 hover:bg-red-50">
                    Bỏ {SURF[active].noun}
                  </button>
                </span>
              )}
            </div>
          )}

          {status && (
            <div className="flex items-center gap-2 rounded-xl border border-blue-100/80 bg-blue-50/80 px-3 py-2 text-[12px] text-blue-900">
              {busy && (
                <svg className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--w-primary)]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              <span className="flex-1">{status}</span>
            </div>
          )}
          {error && <div className="rounded-xl border border-red-100 bg-red-50 p-2.5 text-[12px] text-red-600">{error}</div>}

          {hasPhoto && !layer && <p className="rounded-xl bg-neutral-50 p-3 text-[12.5px] text-neutral-600">Bấm tab ở trên để thêm {SURF[active].noun} vào thiết kế.</p>}

          {/* Công cụ vùng & phối cảnh */}
          {hasPhoto && layer && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200/60 bg-neutral-100/80 p-1.5">
              {source?.kind === "photo" && (
                <button
                  type="button"
                  onClick={() => setMode("tap")}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${mode === "tap" ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-600 hover:text-neutral-900"}`}
                >
                  {t("Chạm để chọn vùng")}
                </button>
              )}
              <button
                type="button"
                onClick={() => setMode(mode === "corners" ? "tap" : "corners")}
                className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${mode === "corners" ? "bg-white text-neutral-900 shadow-2xs" : "text-neutral-600 hover:text-neutral-900"}`}
              >
                {t("Chỉnh phối cảnh (4 góc)")}
              </button>
              {source?.kind === "photo" && mode === "tap" && (
                <button
                  type="button"
                  onClick={() => setPositive((p) => !p)}
                  className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${positive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                >
                  {positive ? t("+ Thêm vùng") : t("- Bỏ vùng")}
                </button>
              )}
              {source?.kind === "photo" && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void autoDetect(active)}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--w-primary)] hover:underline disabled:opacity-50"
                >
                  {t("↻ Tự nhận diện lại")}
                </button>
              )}
            </div>
          )}

          {/* Chọn mẫu cho bề mặt đang chọn */}
          {layer && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[13px] font-semibold text-neutral-800">
                  Mẫu cho {SURF[active].noun} ({usable.length} mẫu)
                </span>
                {tile && <span className="text-[12px] font-bold text-[var(--w-primary)]">{formatVnd(tile.pricePerM2)}/m²</span>}
              </div>
              {usable.length === 0 ? (
                <p className="rounded-xl bg-amber-50 p-3 text-[12px] text-amber-800">
                  Shop chưa có mẫu {USAGE_LABELS[active].toLowerCase()}. Anh/chị nhắn shop để được tư vấn mẫu phù hợp nhé.
                </p>
              ) : (
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1.5">
                  {usable.map((t) => {
                    const on = t.id === layer.tileId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => updateLayer(active, { tileId: t.id })}
                        className={`relative flex w-24 shrink-0 flex-col overflow-hidden rounded-xl border-2 text-left transition-all ${
                          on ? "border-[var(--w-primary)] shadow-xs" : "border-neutral-200/90 hover:border-neutral-300"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={t.textureUrl} alt={t.name} className="h-16 w-full object-cover" />
                        <div className="space-y-0.5 bg-white p-1.5">
                          <span className="block truncate text-[11px] font-semibold text-neutral-900">{t.name}</span>
                          <span className="block text-[10px] text-neutral-500">{t.size}</span>
                        </div>
                        {on && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--w-primary)] text-[9px] text-white">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              {tile && (
                <p className="mt-1 text-[11.5px] text-neutral-500">
                  {tile.style} · {tile.finish === "glossy" ? t("bóng") : tile.finish === "matte" ? t("mờ") : t("nhám chống trơn")}
                  {estimate && ` · ${estimate}`}
                </p>
              )}
            </div>
          )}

          {/* Kiểu lát — ngói lợp theo hàng nên không cần chọn */}
          {layer && active !== "roof" && (
            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-neutral-800">{t("Kiểu lát")}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {LAYOUT_PATTERNS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => updateLayer(active, { pattern: p })}
                    className={`rounded-xl border px-1 py-2 text-center text-[11.5px] font-medium transition ${
                      layer.pattern === p ? "border-[var(--w-primary)] bg-[var(--w-primary)] font-semibold text-white shadow-xs" : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    {LAYOUT_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {layer && (
            <div className={`grid gap-3 pt-1 ${active === "roof" ? "grid-cols-1" : "grid-cols-2"}`}>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-2.5">
                <span className="mb-1 block text-[11.5px] font-medium text-neutral-600">
                  Kích thước thật ({SURF[active].dims[0].toLowerCase()} × {SURF[active].dims[1].toLowerCase()})
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    inputMode="decimal"
                    value={layer.widthM}
                    onChange={(e) => updateLayer(active, { widthM: e.target.value })}
                    className="w-14 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-center text-[13px] font-medium text-neutral-900"
                    aria-label={SURF[active].dims[0]}
                  />
                  <span className="text-neutral-400">×</span>
                  <input
                    inputMode="decimal"
                    value={layer.depthM}
                    onChange={(e) => updateLayer(active, { depthM: e.target.value })}
                    className="w-14 rounded-lg border border-neutral-300 bg-white px-2 py-1 text-center text-[13px] font-medium text-neutral-900"
                    aria-label={SURF[active].dims[1]}
                  />
                  <span className="text-[11.5px] font-semibold text-neutral-700">m</span>
                </div>
                <p className="mt-1 text-[11px] text-neutral-500">≈ {areaOf(layer) > 0 ? `${areaOf(layer)} m²` : "..."} — chỉnh đúng để gạch đúng tỉ lệ</p>
              </div>

              {active !== "roof" && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-2.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11.5px] font-medium text-neutral-600">{t("Đường ron")}</span>
                    <span className="text-[11px] font-semibold text-neutral-800">{layer.groutMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={1}
                    value={layer.groutMm}
                    onChange={(e) => updateLayer(active, { groutMm: Number(e.target.value) })}
                    className="mb-2 h-1 w-full accent-[var(--w-primary)]"
                    aria-label={t("Độ rộng ron")}
                  />
                  <div className="flex items-center justify-between">
                    {GROUT_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        title={`Màu ron: ${c.name}`}
                        aria-label={`Màu ron ${c.name}`}
                        onClick={() => updateLayer(active, { groutColor: c.hex })}
                        className={`h-5 w-5 rounded-full border transition-transform ${layer.groutColor === c.hex ? "scale-110 ring-2 ring-[var(--w-primary)] ring-offset-1" : "border-neutral-300 hover:scale-105"}`}
                        style={{ background: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* So sánh trước/sau, lưu phương án, tải ảnh */}
          {hasPhoto && Object.keys(layers).length > 0 && (
            <div className="space-y-2 rounded-xl border border-neutral-200 p-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCompare((c) => (c === null ? 50 : null))}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition ${compare !== null ? "bg-[var(--w-primary)] text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"}`}
                >
                  {t("⇆ Trước / Sau")}
                </button>
                <button type="button" onClick={saveSnapshot} className="rounded-lg bg-neutral-100 px-2.5 py-1 text-[12px] font-medium text-neutral-700 hover:bg-neutral-200">
                  {t("☆ Lưu phương án")}
                </button>
                <button type="button" onClick={download} className="rounded-lg bg-neutral-100 px-2.5 py-1 text-[12px] font-medium text-neutral-700 hover:bg-neutral-200">
                  {t("⤓ Tải ảnh")}
                </button>
              </div>
              {compare !== null && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={compare}
                  onChange={(e) => setCompare(Number(e.target.value))}
                  className="h-1 w-full accent-[var(--w-primary)]"
                  aria-label={t("Kéo để so sánh trước và sau")}
                />
              )}
              {snapshots.length > 0 && (
                <div>
                  <p className="mb-1 text-[11.5px] text-neutral-500">{t("Phương án đã lưu (bấm để xem lớn):")}</p>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {snapshots.map((s, i) => (
                      <button key={i} type="button" onClick={() => setViewing(s.url)} className="w-28 shrink-0 overflow-hidden rounded-lg border border-neutral-200 text-left">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={s.url} alt={`Phương án ${snapshots.length - i}`} className="h-16 w-full object-cover" />
                        <span className="line-clamp-2 block p-1 text-[10px] leading-tight text-neutral-600">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {viewing && (
        <button type="button" onClick={() => setViewing(null)} className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 p-3" aria-label={t("Đóng ảnh")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viewing} alt={t("Phương án")} className="max-h-full max-w-full rounded-lg" />
        </button>
      )}

      {hasPhoto && (
        <div className="grid grid-cols-3 gap-2 border-t border-neutral-200 bg-white p-3 shadow-lg">
          <button
            type="button"
            onClick={() => canvasRef.current && onAsk(thumbnailBase64(canvasRef.current))}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white py-2 text-[12.5px] font-medium text-neutral-800 transition hover:bg-neutral-50 active:scale-95"
          >
            {t("Hỏi tư vấn")}
          </button>
          <button
            type="button"
            disabled={!layer || !tile}
            onClick={() => {
              const r = result();
              if (r) onQuote(r);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 bg-white py-2 text-[12.5px] font-medium text-neutral-800 transition hover:bg-neutral-50 active:scale-95 disabled:opacity-50"
          >
            Báo giá {layer ? SURF[active].noun : ""}
          </button>
          <button
            type="button"
            disabled={!layer || !tile}
            onClick={() => {
              const r = result();
              if (r) onLead(r);
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--w-primary)] py-2 text-[12.5px] font-semibold text-white shadow-xs transition hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {t("Gửi cho shop →")}
          </button>
        </div>
      )}
    </div>
  );
}

/** Ảnh thu nhỏ các phòng mẫu (vẽ 1 lần khi mở) */
function SceneThumbs({ onPick }: { onPick: (s: Scene) => void }) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    setThumbs(Object.fromEntries(SCENES.map((s) => [s.id, renderScene(s, 240, 160).toDataURL("image/jpeg", 0.8)])));
  }, []);
  return (
    <div className="-mx-1 flex justify-start gap-2 overflow-x-auto px-1 pb-1 sm:justify-center">
      {SCENES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onPick(s)}
          className="w-24 shrink-0 overflow-hidden rounded-xl bg-white/5 text-left ring-1 ring-white/15 transition hover:ring-[var(--brand-light)]"
        >
          {thumbs[s.id] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbs[s.id]} alt={s.name} className="h-16 w-full object-cover" />
          ) : (
            <div className="h-16 w-full bg-white/10" />
          )}
          <span className="block px-1.5 py-1 text-[11px] font-medium text-white">{s.name}</span>
        </button>
      ))}
    </div>
  );
}
