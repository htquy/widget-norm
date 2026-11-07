"use client";

import { useTr } from "@/components/widget/i18n";
import dynamic from "next/dynamic";
import { ExpandButton } from "@/components/widget/frame";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apply, type Pt } from "@/bots/tile/vision/homography";
import { autoPrompts, pickRegion, quadFromRegion } from "@/bots/tile/vision/autoRegion";
import { loadPhoto, thumbnailBase64 } from "@/bots/tile/vision/renderer";
import type { Candidate } from "@/bots/tile/vision/segmenter";
import { openSegmenter } from "@/bots/tile/vision/segmenterClient";
import { furnitureSvg, svgDataUrl } from "../art";
import { DETECTED_TO_CATEGORY, STYLES, STYLE_INFO, isStyle, type StyleId } from "../design";
import { ROOMS, ROOM_LABELS, isRoom, type Room } from "../domain";
import type { RoomAnalysis } from "../vision/analyzer";
import { cachedSprite, renderSprite, spriteThumb, type Sprite } from "../vision/modelSprite";
import { angleToward, autoLayout, footprint, floorToImage, frontVector, imageToFloor, insideFloor, overlaps, project, yawDeg, type Floor, type Placed } from "../vision/placement";
import { SAMPLE_ROOMS, drawSampleRoom } from "../vision/rooms";
import type { FurnitureApi, FurnitureCard, RoomSetView } from "./api";

const vnd = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";
const num = (s: string) => Number(s.replace(",", "."));
const DEFAULT_QUAD: Pt[] = [[0.18, 0.56], [0.82, 0.56], [1, 0.98], [0, 0.98]];

// Phòng 3D (three.js + react-three-fiber) chỉ nạp khi khách bấm "Xem phòng 3D"
function Loading3D() {
  const t = useTr();
  return <div className="flex h-full items-center justify-center text-[13px] text-white/70">{t("Đang dựng phòng 3D…")}</div>;
}
const Room3D = dynamic(() => import("./Room3D"), { ssr: false, loading: () => <Loading3D /> });

type Busy = { label: string; pct?: number } | null;

export interface StudioResult {
  summary: string;
  total: number;
}

export function Studio({
  api,
  conversationId,
  initialItemId,
  initialSet,
  onAsk,
  onClose,
}: {
  api: FurnitureApi;
  conversationId: string | null;
  initialItemId?: string;
  initialSet?: RoomSetView;
  onAsk: (r: StudioResult) => void;
  onClose: () => void;
}) {
  const t = useTr();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef(new Map<string, HTMLImageElement>());
  const boxesRef = useRef<{ key: string; x0: number; y0: number; x1: number; y1: number }[]>([]);
  const dragRef = useRef<{ key: string; dx: number; dy: number; mode: "move" | "rotate" } | null>(null);
  /** Vị trí nút xoay của món đang chọn (px trên canvas) */
  const handleRef = useRef<{ x: number; y: number; key: string } | null>(null);
  /** Tem 3D gần nhất của từng món — giữ hiển thị khi đang dựng góc mới */
  const lastSprite = useRef(new Map<string, Sprite>());
  const brokenModels = useRef(new Set<string>());
  const [hasPhoto, setHasPhoto] = useState(false);
  const [catalog, setCatalog] = useState<FurnitureCard[]>([]);
  const [quad, setQuad] = useState<Pt[]>(DEFAULT_QUAD);
  const [widthM, setWidthM] = useState("4");
  const [depthM, setDepthM] = useState("4");
  const [room, setRoom] = useState<Room>("living");
  const [style, setStyle] = useState<StyleId | "">("");
  const [budget, setBudget] = useState("");
  const [palette, setPalette] = useState<string[]>([]);
  const [existing, setExisting] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<RoomAnalysis | null>(null);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [editCorners, setEditCorners] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [setInfo, setSetInfo] = useState<RoomSetView | null>(null);
  const [drawer, setDrawer] = useState<"none" | "catalog" | "lead">("none");
  const [lead, setLead] = useState({ name: "", phone: "", sent: false });
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [mode3d, setMode3d] = useState(false);
  const [similar, setSimilar] = useState<FurnitureCard[] | null>(null);
  const [modelThumbs, setModelThumbs] = useState<Record<string, string>>({});

  const floor: Floor = useMemo(() => ({ quad, widthCm: Math.max(100, num(widthM) * 100 || 400), depthCm: Math.max(100, num(depthM) * 100 || 400) }), [quad, widthM, depthM]);
  const total = placed.reduce((s, p) => s + p.price, 0);

  useEffect(() => {
    api.catalog().then((r) => setCatalog(r.items)).catch(() => setError(t("Không tải được danh mục")));
    setThumbs(Object.fromEntries(SAMPLE_ROOMS.map((r) => [r.id, drawSampleRoom(r, 240, 160).toDataURL("image/jpeg", 0.8)])));
  }, [api]);

  // Hình đại diện món có 3D: dựng từ chính mô hình (thay cho hình vẽ minh hoạ)
  useEffect(() => {
    if (drawer !== "catalog") return;
    let alive = true;
    (async () => {
      for (const c of similar ?? catalog) {
        if (!alive) return;
        if (!c.modelUrl || modelThumbs[c.id]) continue;
        try {
          const url = await spriteThumb({ url: c.modelUrl, color: c.color, widthCm: c.widthCm, depthCm: c.depthCm, heightCm: c.heightCm, yaw: 28, pitch: 14 }, 140);
          if (alive) setModelThumbs((m) => ({ ...m, [c.id]: url }));
        } catch {
          /* dùng ảnh minh hoạ */
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawer, catalog, similar]);

  const sprite = useCallback((p: Placed) => {
    const key = `${p.cutoutUrl ?? ""}|${p.category}|${p.color}|${p.widthCm}|${p.heightCm}|${p.depthCm}|${yawDeg(p) % 180 >= 45 && yawDeg(p) % 180 <= 135}`;
    let img = spritesRef.current.get(key);
    if (!img) {
      img = new Image();
      const dims = yawDeg(p) % 180 >= 45 && yawDeg(p) % 180 <= 135 ? { widthCm: p.depthCm, depthCm: p.widthCm } : { widthCm: p.widthCm, depthCm: p.depthCm };
      const drawn = svgDataUrl(furnitureSvg({ category: p.category, color: p.color, heightCm: p.heightCm, ...dims }));
      if (p.cutoutUrl) {
        // Ảnh thật của shop; lỗi tải (vd R2 chưa bật CORS) → quay về hình vẽ theo số đo
        img.crossOrigin = "anonymous";
        img.onerror = () => {
          img!.onerror = null;
          img!.crossOrigin = null;
          img!.src = drawn;
        };
        img.src = p.cutoutUrl;
      } else img.src = drawn;
      // Ảnh tải xong → vẽ lại bằng hàm vẽ MỚI NHẤT (closure cũ chỉ thấy danh sách đồ rỗng)
      img.onload = () => drawRef.current();
      spritesRef.current.set(key, img);
    }
    return img;
  }, []);
  const drawRef = useRef<() => void>(() => undefined);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    const photo = photoRef.current;
    if (!c || !photo) return;
    c.width = photo.width;
    c.height = photo.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(photo, 0, 0);
    const W = c.width;
    const H = c.height;
    if (editCorners) {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      quad.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const boxes: typeof boxesRef.current = [];
    handleRef.current = null;
    const ordered = [...placed].sort((a, b) => a.y - b.y);
    for (const p of ordered) {
      const pr = project(floor, p, W, H);
      const bad = !insideFloor(floor, p) || placed.some((o) => o.key !== p.key && overlaps(o, p));
      // Bóng đổ chân đồ
      ctx.fillStyle = "rgba(20,14,8,0.28)";
      ctx.beginPath();
      pr.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fill();
      if (p.key === selected || bad) {
        ctx.strokeStyle = bad ? "#e5484d" : "#ffffff";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      let x0: number;
      let y0: number;
      let dw: number;
      let dh: number;
      let spr: Sprite | null = null;
      if (p.modelUrl && !brokenModels.current.has(p.modelUrl)) {
        // Mô hình 3D thật dựng đúng góc xoay + góc máy của ảnh
        const spec = { url: p.modelUrl, color: p.color, widthCm: p.widthCm, depthCm: p.depthCm, heightCm: p.heightCm, yaw: yawDeg(p), pitch: pr.pitchDeg };
        spr = cachedSprite(spec);
        if (!spr) {
          const url = p.modelUrl;
          void renderSprite(spec).then(() => drawRef.current(), () => (brokenModels.current.add(url), drawRef.current()));
          spr = lastSprite.current.get(p.key) ?? null;
        } else lastSprite.current.set(p.key, spr);
      }
      if (spr) {
        const k = (pr.pxPerCmX * 100) / spr.pxPerM;
        const sx = pr.center[0] - spr.ox * k;
        const sy = pr.center[1] - spr.oy * k;
        ctx.drawImage(spr.canvas, sx, sy, spr.canvas.width * k, spr.canvas.height * k);
        x0 = sx + spr.bbox.x0 * k;
        y0 = sy + spr.bbox.y0 * k;
        dw = (spr.bbox.x1 - spr.bbox.x0) * k;
        dh = (spr.bbox.y1 - spr.bbox.y0) * k;
      } else {
        const img = sprite(p);
        dw = pr.frontWidthPx;
        dh = pr.heightPx;
        x0 = pr.base[0] - dw / 2;
        y0 = pr.base[1] - dh;
        if (img.complete && img.naturalWidth) ctx.drawImage(img, x0, y0, dw, dh);
      }
      boxes.push({ key: p.key, x0: Math.min(x0, ...pr.poly.map((q) => q[0])), y0, x1: Math.max(x0 + dw, ...pr.poly.map((q) => q[0])), y1: Math.max(...pr.poly.map((q) => q[1])) });
      if (p.key === selected && !editCorners) {
        // Vòng xoay trên sàn + nút kéo để xoay tự do (mặt trước của món hướng về phía nút)
        const R = Math.hypot(p.widthCm, p.depthCm) / 2 + 28;
        const Hm = floorToImage(floor);
        const toPx = (fx: number, fy: number) => {
          const [u, v] = apply(Hm, [fx, fy]);
          return [u * W, v * H] as [number, number];
        };
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = Math.max(2, W / 400);
        ctx.setLineDash([8, 7]);
        ctx.beginPath();
        for (let a = 0; a <= 64; a++) {
          const t = (a / 64) * Math.PI * 2;
          const [qx, qy] = toPx(p.x + Math.cos(t) * R, p.y + Math.sin(t) * R);
          a ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        const [fx, fy] = frontVector(p);
        const [hx, hy] = toPx(p.x + fx * R, p.y + fy * R);
        const rad = Math.max(15, W / 42);
        handleRef.current = { x: hx, y: hy, key: p.key };
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(hx, hy, rad, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#1d1915";
        ctx.lineWidth = Math.max(2, rad / 6);
        ctx.beginPath();
        ctx.arc(hx, hy, rad * 0.5, -Math.PI * 0.15, Math.PI * 1.45);
        ctx.stroke();
        const ax = hx + Math.cos(-Math.PI * 0.15) * rad * 0.5;
        const ay = hy + Math.sin(-Math.PI * 0.15) * rad * 0.5;
        ctx.fillStyle = "#1d1915";
        ctx.beginPath();
        ctx.moveTo(ax, ay - rad * 0.38);
        ctx.lineTo(ax + rad * 0.34, ay + rad * 0.12);
        ctx.lineTo(ax - rad * 0.22, ay + rad * 0.2);
        ctx.fill();
      }
      if (p.key === selected) {
        const label = `${p.name} · ${p.widthCm}×${p.depthCm}×${p.heightCm} cm`;
        ctx.font = `600 ${Math.max(14, W / 70)}px system-ui, sans-serif`;
        const tw = ctx.measureText(label).width + 16;
        const ly = Math.max(4, y0 - 34);
        ctx.fillStyle = "rgba(20,20,20,0.82)";
        ctx.fillRect(pr.base[0] - tw / 2, ly, tw, 28);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, pr.base[0] - tw / 2 + 8, ly + 19);
      }
    }
    boxesRef.current = boxes;
  }, [placed, floor, selected, editCorners, quad, sprite, hasPhoto]);

  useEffect(() => {
    drawRef.current = draw;
    draw();
  }, [draw]);

  /** Nạp ảnh nền (ảnh khách hoặc phòng mẫu) */
  function setPhoto(c: HTMLCanvasElement) {
    photoRef.current = c;
    setHasPhoto(true);
    setPlaced([]);
    setSetInfo(null);
    setSelected(null);
    requestAnimationFrame(() => drawRef.current());
  }

  function pickSample(id: string) {
    const r = SAMPLE_ROOMS.find((x) => x.id === id)!;
    setQuad(r.quad);
    setWidthM(String(r.widthM));
    setDepthM(String(r.depthM));
    setRoom(r.room);
    setAnalysis(null);
    setExisting([]);
    setPalette(["#ece6dc", "#b99470"]);
    setPhoto(drawSampleRoom(r));
  }

  async function onFile(file: File) {
    setError("");
    try {
      const photo = await loadPhoto(file);
      setQuad(DEFAULT_QUAD);
      setPhoto(photo);
      api.track("room_photo_uploaded", conversationId);
      const { dominantColors } = await import("../vision/analyzer");
      setPalette(dominantColors(photo).slice(0, 5));
      const url = photo.toDataURL("image/jpeg", 0.9);
      void analyze(url);
      void detectFloor(url);
    } catch {
      setError(t("Không đọc được ảnh, thử ảnh khác nhé."));
    }
  }

  async function analyze(url: string) {
    setBusy({ label: t("AI đang nhận diện loại phòng, phong cách và đồ đã có…") });
    try {
      const { analyzeInBackground } = await import("../vision/analyzerClient");
      const a = await analyzeInBackground(url, (stage, pct) => setBusy({ label: stage === "clip" ? t("Tải model nhận diện phong cách…") : t("Tải model nhận diện đồ vật…"), pct: Math.round(pct) }));
      setAnalysis(a);
      if (isRoom(a.rooms[0]?.id)) setRoom(a.rooms[0].id);
      if (isStyle(a.styles[0]?.id) && a.styles[0].p > 0.25) setStyle(a.styles[0].id);
      setExisting([...new Set(a.objects.map((o) => DETECTED_TO_CATEGORY[o.label]).filter(Boolean))]);
    } catch (e) {
      console.warn("[studio] phân tích ảnh lỗi", e);
      setError(t("Chưa nhận diện được phòng — anh/chị chọn loại phòng và phong cách bên dưới nhé."));
    } finally {
      setBusy(null);
    }
  }

  async function detectFloor(url: string) {
    try {
      const seg = await openSegmenter(url);
      const prompts = autoPrompts("floor");
      const per: Candidate[][] = [];
      for (const p of prompts) per.push(await seg.segmentAll(p));
      const picked = pickRegion(per, prompts, "floor");
      const q = picked && quadFromRegion(picked.mask, picked.width, picked.height, "floor");
      if (q) setQuad(q);
      seg.dispose();
    } catch (e) {
      console.warn("[studio] tách sàn lỗi, dùng 4 góc mặc định", e);
    }
  }

  const toPlaced = (c: FurnitureCard, k: number): Omit<Placed, "x" | "y" | "rot"> => ({
    key: `${c.id}-${k}-${Math.random().toString(36).slice(2, 6)}`,
    itemId: c.id,
    name: c.name,
    category: c.category,
    color: c.color,
    price: c.price,
    widthCm: c.widthCm,
    depthCm: c.depthCm,
    heightCm: c.heightCm,
    cutoutUrl: c.cutoutUrl || undefined,
    modelUrl: c.modelUrl || undefined,
  });

  function placeSet(set: RoomSetView) {
    const list = set.picks.flatMap((p) => Array.from({ length: Math.min(p.quantity, 8) }, (_, k) => toPlaced(p.card, k)));
    setPlaced(autoLayout(floor, list));
    setSetInfo(set);
    setSelected(null);
  }

  async function suggest() {
    setError("");
    setBusy({ label: t("Đang chọn bộ đồ hợp phòng…") });
    try {
      const b = num(budget) > 0 ? num(budget) * 1_000_000 : undefined;
      const { set } = await api.design({ conversationId, room, style: style || undefined, budget: b, roomWidthM: num(widthM) || undefined, roomDepthM: num(depthM) || undefined, existing, palette });
      if (set.picks.length === 0) setError(t("Chưa chọn được món nào: {list}", { list: set.skipped.join("; ") }));
      else placeSet(set);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  useEffect(() => {
    if (!hasPhoto) return;
    if (initialSet && placed.length === 0) placeSet(initialSet);
    else if (initialItemId && placed.length === 0) {
      const c = catalog.find((x) => x.id === initialItemId);
      if (c) addItem(c);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPhoto, catalog.length]);

  /** Khách gửi ảnh mẫu (Pinterest, nhà bạn bè…) → CLIP trên trình duyệt → món giống nhất của shop */
  async function findSimilar(file: File) {
    setError("");
    setBusy({ label: t("AI đang tìm món giống ảnh…") });
    try {
      const photo = await loadPhoto(file, 640);
      const { embedImage } = await import("../vision/analyzer");
      const vec = await embedImage(photo.toDataURL("image/jpeg", 0.85));
      const { items } = await api.similar(vec);
      setSimilar(items);
      if (items.length === 0) setError(t("Shop chưa có món nào được gắn vector ảnh để so sánh."));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  function addItem(c: FurnitureCard) {
    const p = autoLayout(floor, [toPlaced(c, 0)])[0];
    setPlaced((list) => [...list, p]);
    setSelected(p.key);
    setDrawer("none");
  }

  // Kéo món trên ảnh: toạ độ ảnh → toạ độ sàn (cm)
  function pointer(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { px: ((e.clientX - r.left) / r.width) * c.width, py: ((e.clientY - r.top) / r.height) * c.height, nx: (e.clientX - r.left) / r.width, ny: (e.clientY - r.top) / r.height };
  }
  function onDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (editCorners) return;
    const { px, py, nx, ny } = pointer(e);
    const hd = handleRef.current;
    if (hd && Math.hypot(px - hd.x, py - hd.y) < Math.max(26, canvasRef.current!.width / 26)) {
      dragRef.current = { key: hd.key, dx: 0, dy: 0, mode: "rotate" };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }
    const hit = [...boxesRef.current].reverse().find((b) => px >= b.x0 && px <= b.x1 && py >= b.y0 && py <= b.y1);
    setSelected(hit?.key ?? null);
    if (!hit) return;
    const p = placed.find((x) => x.key === hit.key)!;
    const [fx, fy] = apply(imageToFloor(floor), [nx, ny]);
    dragRef.current = { key: hit.key, dx: p.x - fx, dy: p.y - fy, mode: "move" };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = dragRef.current;
    if (!d) return;
    const { nx, ny } = pointer(e);
    const [fx, fy] = apply(imageToFloor(floor), [nx, ny]);
    if (d.mode === "rotate") {
      setPlaced((list) =>
        list.map((p) => {
          if (p.key !== d.key) return p;
          let a = angleToward(p.x, p.y, fx, fy);
          // Hít nhẹ vào 0/90/180/270 để dễ đặt song song với tường
          for (const k of [0, 90, 180, 270, 360]) if (Math.abs(a - k) < 6) a = k % 360;
          return { ...p, angle: Math.round(a) };
        }),
      );
      return;
    }
    setPlaced((list) =>
      list.map((p) => {
        if (p.key !== d.key) return p;
        const { w, d: dd } = footprint(p);
        return { ...p, x: Math.min(floor.widthCm - w / 2, Math.max(w / 2, fx + d.dx)), y: Math.min(floor.depthCm - dd / 2 + 60, Math.max(dd / 2, fy + d.dy)) };
      }),
    );
  }
  const onUp = () => (dragRef.current = null);

  const sel = placed.find((p) => p.key === selected) ?? null;
  const problems = placed.filter((p) => !insideFloor(floor, p) || placed.some((o) => o.key !== p.key && overlaps(o, p)));
  const summary = () => {
    const names = Object.entries(placed.reduce<Record<string, number>>((m, p) => ((m[p.name] = (m[p.name] ?? 0) + 1), m), {})).map(([n, q]) => (q > 1 ? `${n} × ${q}` : n));
    return `${t(ROOM_LABELS[room])}${style ? ` ${t(STYLE_INFO[style].label)}` : ""} ${widthM}×${depthM} m: ${names.join(", ")} — ${vnd(total)}`;
  };

  async function sendLead(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy({ label: t("Đang gửi phương án…") });
    try {
      draw();
      const previewBase64 = canvasRef.current ? thumbnailBase64(canvasRef.current, 1024) : undefined;
      await api.lead({ conversationId, name: lead.name, phone: lead.phone, note: t("Gửi từ studio kê thử nội thất"), design: summary().slice(0, 600), total, previewBase64 });
      setLead((l) => ({ ...l, sent: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const chip = "min-h-9 rounded-full border px-3 text-[12.5px] font-medium transition";
  const field = "min-h-10 w-full rounded-lg border border-neutral-300 bg-white px-2.5 text-[13px] text-neutral-900";

  return (
    <div className="@container flex h-full flex-col bg-[#1d1915] text-white">
      <header className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold">{t("Kê thử nội thất")}</p>
          <p className="truncate text-[11.5px] text-white/60">{t("Đúng kích thước thật · ảnh xử lý ngay trên máy của bạn")}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <ExpandButton className="!h-10 !w-10 hover:!bg-white/10" />
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10" aria-label={t("Đóng")}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </header>

      <div className={`min-h-0 flex-1 overflow-y-auto ${hasPhoto ? "@3xl:overflow-hidden" : ""}`}>
        {!hasPhoto ? (
          <div className="space-y-4 p-4">
            <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/30 bg-white/5 p-4 text-center hover:bg-white/10">
              <span className="text-[14px] font-semibold">{t("Chụp hoặc chọn ảnh phòng của bạn")}</span>
              <span className="text-[12px] text-white/60">{t("AI nhận ra loại phòng, phong cách, đồ đã có và vùng sàn")}</span>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            </label>
            <div>
              <p className="mb-2 text-[12.5px] text-white/70">{t("Chưa có ảnh? Thử ngay trên phòng mẫu:")}</p>
              <div className="grid grid-cols-3 gap-2">
                {SAMPLE_ROOMS.map((r) => (
                  <button key={r.id} type="button" onClick={() => pickSample(r.id)} className="overflow-hidden rounded-xl text-left ring-1 ring-white/15 hover:ring-white/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {thumbs[r.id] && <img src={thumbs[r.id]} alt="" className="aspect-[3/2] w-full object-cover" />}
                    <span className="block px-2 py-1.5 text-[11.5px] font-medium">{r.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="@3xl:grid @3xl:h-full @3xl:grid-cols-[minmax(0,1fr)_380px] @3xl:grid-rows-[minmax(0,1fr)]">
            <div className="relative bg-black @3xl:flex @3xl:min-h-0 @3xl:items-center @3xl:justify-center @3xl:overflow-auto">
            <div className="relative w-full @3xl:w-fit @3xl:max-w-full">
              <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} className={`block w-full touch-none select-none @3xl:max-h-[calc(100dvh-140px)] @3xl:w-auto @3xl:max-w-full ${mode3d ? "invisible" : ""}`} />
              {mode3d && (
                <div className="absolute inset-0 bg-[#f4f1ec]">
                  <Room3D
                    floor={floor}
                    placed={placed}
                    selected={selected}
                    onSelect={setSelected}
                    onMove={(key, x, y) =>
                      setPlaced((list) =>
                        list.map((q) => {
                          if (q.key !== key) return q;
                          const { w, d } = footprint(q);
                          return { ...q, x: Math.min(floor.widthCm - w / 2, Math.max(w / 2, x)), y: Math.min(floor.depthCm - d / 2, Math.max(d / 2, y)) };
                        }),
                      )
                    }
                  />
                  <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/55 px-3 py-1.5 text-[11.5px] text-white">{t("Kéo món để di chuyển · vuốt nền để xoay phòng · cuộn để thu phóng")}</span>
                </div>
              )}
              {editCorners &&
                quad.map(([x, y], i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`${t("Góc sàn")} ${i + 1}`}
                    className="absolute h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--w-primary)] text-[11px] font-bold shadow-lg"
                    style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                    onPointerDown={(e) => {
                      const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                      const move = (ev: PointerEvent) =>
                        setQuad((q) => q.map((p, j) => (j === i ? ([Math.min(1, Math.max(0, (ev.clientX - parent.left) / parent.width)), Math.min(1, Math.max(0, (ev.clientY - parent.top) / parent.height))] as Pt) : p)));
                      const up = () => (window.removeEventListener("pointermove", move), window.removeEventListener("pointerup", up));
                      window.addEventListener("pointermove", move);
                      window.addEventListener("pointerup", up);
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              <button type="button" onClick={() => setMode3d((v) => !v)} className="absolute right-2 top-12 z-10 rounded-full bg-black/60 px-3 py-1.5 text-[11.5px] backdrop-blur">
                {mode3d ? t("Về ảnh phòng") : t("Xem phòng 3D")}
              </button>
              <button type="button" onClick={() => setHasPhoto(false)} className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-3 py-1.5 text-[11.5px] backdrop-blur">
                {t("Đổi ảnh / phòng mẫu")}
              </button>
              {busy && (
                <div className="absolute inset-x-2 bottom-2 rounded-lg bg-black/75 px-3 py-2 text-[12px]">
                  {busy.label}
                  {busy.pct !== undefined && <div className="mt-1 h-1 overflow-hidden rounded bg-white/20"><div className="h-full bg-[var(--w-primary)]" style={{ width: `${busy.pct}%` }} /></div>}
                </div>
              )}
            </div>
            </div>

            <div className="space-y-3 p-3 text-[13px] @3xl:min-h-0 @3xl:overflow-y-auto @3xl:border-l @3xl:border-white/10">
              {analysis && (
                <div className="rounded-xl bg-white/5 p-2.5 text-[12px] leading-relaxed">
                  <span className="font-semibold">{t("AI nhận diện:")}</span> {t(ROOM_LABELS[(analysis.rooms[0]?.id as Room) ?? "living"])} ({Math.round((analysis.rooms[0]?.p ?? 0) * 100)}%) · {t("phong cách")}{" "}
                  {analysis.styles.slice(0, 2).map((s) => `${t(STYLE_INFO[s.id as StyleId].label)} ${Math.round(s.p * 100)}%`).join(", ")}
                  {existing.length > 0 && <> · {t("đã có:")} {existing.join(", ")}</>}
                </div>
              )}
              {palette.length > 0 && (
                <div className="flex items-center gap-2 text-[12px] text-white/70">
                  {t("Màu chủ đạo của phòng:")}
                  {palette.map((c) => (
                    <span key={c} className="h-5 w-5 rounded-full ring-1 ring-white/30" style={{ background: c }} title={c} />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11.5px] text-white/70">
                  {t("Loại phòng")}
                  <select value={room} onChange={(e) => setRoom(e.target.value as Room)} className={field}>
                    {ROOMS.map((r) => (
                      <option key={r} value={r}>{t(ROOM_LABELS[r])}</option>
                    ))}
                  </select>
                </label>
                <label className="text-[11.5px] text-white/70">
                  {t("Phong cách")}
                  <select value={style} onChange={(e) => setStyle(e.target.value as StyleId | "")} className={field}>
                    <option value="">{t("Chưa chọn")}</option>
                    {STYLES.map((s) => (
                      <option key={s} value={s}>{t(STYLE_INFO[s].label)}</option>
                    ))}
                  </select>
                </label>
                <label className="text-[11.5px] text-white/70">
                  {t("Vùng sàn rộng × sâu (m)")}
                  <span className="flex gap-1">
                    <input value={widthM} onChange={(e) => setWidthM(e.target.value)} inputMode="decimal" className={field} aria-label={t("Rộng (m)")} />
                    <input value={depthM} onChange={(e) => setDepthM(e.target.value)} inputMode="decimal" className={field} aria-label={t("Sâu (m)")} />
                  </span>
                </label>
                <label className="text-[11.5px] text-white/70">
                  {t("Ngân sách (triệu ₫)")}
                  <input value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" placeholder={t("Không giới hạn")} className={field} />
                </label>
              </div>
              {style && <p className="text-[11.5px] text-white/60">{t(STYLE_INFO[style].tips)}</p>}

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={suggest} disabled={!!busy} className="min-h-10 flex-1 rounded-xl bg-[var(--w-primary)] px-4 text-[13px] font-semibold text-[var(--w-on-primary)] disabled:opacity-60">
                  {t("Gợi ý cả bộ & kê vào ảnh")}
                </button>
                <button type="button" onClick={() => setDrawer(drawer === "catalog" ? "none" : "catalog")} className={`${chip} border-white/25`}>
                  {t("+ Thêm món")}
                </button>
                <button type="button" onClick={() => setEditCorners((v) => !v)} className={`${chip} ${editCorners ? "border-white bg-white text-black" : "border-white/25"}`}>
                  {editCorners ? t("Xong 4 góc sàn") : t("Chỉnh 4 góc sàn")}
                </button>
              </div>
              {editCorners && <p className="text-[11.5px] text-white/60">{t("Kéo 4 điểm về đúng 4 góc phần sàn thấy được rồi nhập kích thước thật của phần sàn đó — đồ sẽ được kê đúng tỉ lệ.")}</p>}

              {drawer === "catalog" && (
                <label className="flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/30 px-3 text-[12.5px] text-white/80 hover:bg-white/10">
                  {t("Tìm món giống một ảnh mẫu (Pinterest, nhà bạn bè…)")}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && findSimilar(e.target.files[0])} />
                </label>
              )}
              {drawer === "catalog" && (
                <ul className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto">
                  {(similar ?? catalog).map((c) => (
                      <li key={c.id}>
                        <button type="button" onClick={() => addItem(c)} className="flex w-full items-center gap-2 rounded-lg bg-white/5 p-1.5 text-left hover:bg-white/10">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={modelThumbs[c.id] ?? c.imageUrl} alt="" className={`h-10 w-12 shrink-0 rounded ${modelThumbs[c.id] ? "bg-white/90 object-contain p-0.5" : "object-cover"}`} />
                          <span className="min-w-0 text-[11.5px] leading-tight">
                            <span className="line-clamp-2 font-medium">{c.name}</span>
                            <span className="text-white/60">
                              {vnd(c.price)}
                              {c.modelUrl ? " · 3D" : c.cutoutUrl ? t("· ảnh thật") : ""}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}

              {sel && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-white/5 p-2.5">
                  <span className="min-w-0 flex-1 text-[12px]">
                    <b>{sel.name}</b> · {sel.widthCm}×{sel.depthCm}×{sel.heightCm} cm · {vnd(sel.price)}
                  </span>
                  <button type="button" className={`${chip} border-white/25`} onClick={() => setPlaced((l) => l.map((p) => (p.key === sel.key ? { ...p, angle: (yawDeg(p) + 90) % 360 } : p)))}>
                    +90°
                  </button>
                  <button type="button" className={`${chip} border-rose-300/50 text-rose-200`} onClick={() => (setPlaced((l) => l.filter((p) => p.key !== sel.key)), setSelected(null))}>
                    {t("Bỏ")}
                  </button>
                  <label className="flex w-full items-center gap-2 text-[11.5px] text-white/70">
                    Xoay
                    <input
                      type="range"
                      min={0}
                      max={359}
                      value={yawDeg(sel)}
                      onChange={(e) => setPlaced((l) => l.map((p) => (p.key === sel.key ? { ...p, angle: Number(e.target.value) } : p)))}
                      className="h-2 min-w-0 flex-1 accent-[var(--w-primary)]"
                      aria-label={t("Góc xoay")}
                    />
                    <span className="w-9 text-right tabular-nums">{yawDeg(sel)}°</span>
                  </label>
                  <p className="w-full text-[11px] text-white/50">
                    {sel.modelUrl ? t("Kéo nút tròn quanh món trên ảnh để xoay tự do — mô hình 3D thật xoay theo mọi hướng.") : t("Món này mới có ảnh phẳng: xoay chỉ đổi hướng chiếm chỗ trên sàn. Thêm mô hình 3D (.glb, hoặc dựng từ ảnh trong admin) để xoay như đồ thật.")}
                  </p>
                </div>
              )}

              {problems.length > 0 && (
                <p className="rounded-lg bg-rose-500/15 px-2.5 py-2 text-[12px] text-rose-100">
                  {t("Viền đỏ: {names} đang ra ngoài vùng sàn hoặc chồng lên món khác — kéo lại hoặc chọn kích thước nhỏ hơn.", { names: problems.map((p) => p.name).join(", ") })}
                </p>
              )}
              {setInfo && (
                <div className="space-y-1 rounded-xl bg-white/5 p-2.5 text-[12px]">
                  <p className="font-semibold">{setInfo.title}</p>
                  {setInfo.picks.map((p) => (
                    <p key={p.card.id} className="text-white/80">
                      {p.category}: {p.card.name}
                      {p.quantity > 1 ? ` × ${p.quantity}` : ""} — {vnd(p.total)} <span className="text-white/50">({p.reason})</span>
                    </p>
                  ))}
                  {setInfo.coveragePercent !== null && <p className="text-white/70">{t("Đồ chiếm {n}% diện tích sàn.", { n: setInfo.coveragePercent })}</p>}
                  {setInfo.skipped.length > 0 && <p className="text-white/60">{t("Bỏ qua:")} {setInfo.skipped.join("; ")}</p>}
                  {setInfo.notes.map((n) => (
                    <p key={n} className="text-amber-200/90">• {n}</p>
                  ))}
                </div>
              )}
              {error && <p className="text-[12px] text-rose-200">{error}</p>}

              {drawer === "lead" &&
                (lead.sent ? (
                  <p className="rounded-xl bg-emerald-500/15 p-3 text-[13px] text-emerald-100">{t("Đã gửi phương án kèm ảnh cho cửa hàng. Nhân viên sẽ gọi lại để tư vấn và báo phí giao lắp.")}</p>
                ) : (
                  <form onSubmit={sendLead} className="grid grid-cols-2 gap-2 rounded-xl bg-white/5 p-2.5">
                    <input required value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} placeholder={t("Tên của bạn")} className={field} />
                    <input required value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder={t("Số điện thoại / Zalo")} inputMode="tel" className={field} />
                    <button type="submit" disabled={!!busy} className="col-span-2 min-h-10 rounded-lg bg-white text-[13px] font-semibold text-black">
                      {t("Gửi ảnh phương án cho shop")}
                    </button>
                  </form>
                ))}
            </div>
          </div>
        )}
      </div>

      {hasPhoto && (
        <footer className="flex items-center gap-2 border-t border-white/10 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-white/60">{t("{n} món · tạm tính (chưa gồm giao lắp)", { n: placed.length })}</p>
            <p className="text-[15px] font-bold tabular-nums">{vnd(total)}</p>
          </div>
          <button type="button" disabled={!placed.length} onClick={() => onAsk({ summary: summary(), total })} className="min-h-10 rounded-xl border border-white/30 px-3 text-[12.5px] font-medium disabled:opacity-50">
            {t("Hỏi tư vấn")}
          </button>
          <button type="button" disabled={!placed.length} onClick={() => setDrawer("lead")} className="min-h-10 rounded-xl bg-[var(--w-primary)] px-3 text-[12.5px] font-semibold text-[var(--w-on-primary)] disabled:opacity-50">
            {t("Gửi cho shop")}
          </button>
        </footer>
      )}
    </div>
  );
}
