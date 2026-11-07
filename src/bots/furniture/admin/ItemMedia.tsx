"use client";

import { useT } from "@/lib/i18n/client";
import { useEffect, useRef, useState } from "react";
import { loadPhoto } from "@/bots/tile/vision/renderer";
import type { Candidate, PromptPoint } from "@/bots/tile/vision/segmenter";
import { openSegmenter, type SegClient } from "@/bots/tile/vision/segmenterClient";
import { Field, fieldCls } from "@/components/admin/ui";
import { ModelViewer } from "../widget/ModelViewer";
import { canvasToPng, composeCutout, pickCandidate } from "../vision/cutout";

interface Report {
  bytes: number;
  sizeCm: { width: number; height: number; depth: number } | null;
  triangles: number | null;
  warnings: string[];
}

const btn = "min-h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium hover:border-[var(--accent)] disabled:opacity-50";
const note = "text-[12.5px] text-[var(--fg-muted)]";

async function upload(kind: "image" | "cutout" | "model", file: Blob, name: string, sku: string, dims?: { widthCm: number; depthCm: number; heightCm: number }) {
  const f = new FormData();
  f.set("kind", kind);
  f.set("sku", sku || "item");
  if (dims) for (const [k, v] of Object.entries(dims)) f.set(k, String(v));
  f.set("file", new File([file], name, { type: kind === "model" ? "model/gltf-binary" : file.type }));
  const res = await fetch("/api/admin/furniture/upload", { method: "POST", body: f });
  const j = (await res.json().catch(() => ({}))) as { url?: string; report?: Report; error?: string };
  if (!res.ok || !j.url) throw new Error(j.error ?? `Lỗi ${res.status}`);
  return j as { url: string; report?: Report };
}

/**
 * Ảnh, ảnh tách nền, mô hình 3D của một món. Ba mức hiển thị trong studio của khách:
 * 3D thật (.glb) → ảnh thật tách nền → hình vẽ theo số đo. Món có gì dùng nấy.
 */
export function ItemMedia({
  itemId,
  getSku,
  getDims,
  initial,
}: {
  itemId?: string;
  getSku: () => string;
  getDims: () => { widthCm: number; depthCm: number; heightCm: number };
  initial: { imageUrl: string; cutoutUrl: string; modelUrl: string; modelStatus: string; embedding: boolean };
}) {
  const t = useT();
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);
  const [cutoutUrl, setCutoutUrl] = useState(initial.cutoutUrl);
  const [modelUrl, setModelUrl] = useState(initial.modelUrl);
  const [modelStatus, setModelStatus] = useState(initial.modelStatus);
  const [embedding, setEmbedding] = useState("");
  const [approve, setApprove] = useState(false);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [aiEnabled, setAiEnabled] = useState(false);

  // Trình tách nền
  const photoRef = useRef<HTMLCanvasElement | null>(null);
  const segRef = useRef<Promise<SegClient> | null>(null);
  const view = useRef<HTMLCanvasElement>(null);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [points, setPoints] = useState<PromptPoint[]>([]);
  const [negative, setNegative] = useState(false);
  const [result, setResult] = useState<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!itemId) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/admin/furniture/model?id=${itemId}`);
        const j = (await r.json()) as { enabled?: boolean; status?: string; modelUrl?: string };
        if (stop) return;
        setAiEnabled(!!j.enabled);
        if (j.status !== undefined) setModelStatus(j.status);
        if (j.modelUrl) setModelUrl(j.modelUrl);
        if (j.status === "pending") setTimeout(tick, 5000);
      } catch {
        /* bỏ qua, lần mở sau kiểm tra lại */
      }
    };
    void tick();
    return () => {
      stop = true;
      segRef.current?.then((s) => s.dispose()).catch(() => undefined);
    };
  }, [itemId]);

  function drawView() {
    const c = view.current;
    const p = photoRef.current;
    if (!c || !p) return;
    c.width = p.width;
    c.height = p.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(p, 0, 0);
    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x * p.width, pt.y * p.height, Math.max(8, p.width / 70), 0, Math.PI * 2);
      ctx.fillStyle = pt.positive ? "#16a34a" : "#dc2626";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#fff";
      ctx.stroke();
    }
  }
  useEffect(drawView, [points, hasPhoto]);

  async function onPhoto(file: File) {
    setError("");
    setBusy(t("Đang tải ảnh lên…"));
    try {
      const up = await upload("image", file, file.name, getSku());
      setImageUrl(up.url);
      const photo = await loadPhoto(file, 1024);
      photoRef.current = photo;
      segRef.current?.then((s) => s.dispose()).catch(() => undefined);
      segRef.current = null;
      setPoints([]);
      setResult(null);
      setHasPhoto(true);
      void runCutout([{ x: 0.5, y: 0.55, positive: true }]);
      void embed(photo);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function runCutout(pts: PromptPoint[]) {
    const photo = photoRef.current;
    if (!photo) return;
    setPoints(pts);
    setError("");
    try {
      setBusy(t("AI đang tách nền (lần đầu tải model ~100 MB)…"));
      segRef.current ??= openSegmenter(photo.toDataURL("image/jpeg", 0.92), (pct) => setBusy(`Đang tải model tách nền… ${Math.round(pct)}%`));
      const seg = await segRef.current;
      const cands: Candidate[] = await seg.segmentAll(pts);
      setResult(composeCutout(photo, cands[pickCandidate(cands)]));
    } catch (e) {
      setError(`Không tách nền được: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy("");
    }
  }

  async function embed(src: HTMLCanvasElement) {
    try {
      const { embedImage } = await import("../vision/analyzer");
      setEmbedding(JSON.stringify(await embedImage(src.toDataURL("image/jpeg", 0.85))));
    } catch (e) {
      console.warn("[admin] không tính được vector ảnh", e);
    }
  }

  async function saveCutout() {
    if (!result) return;
    setBusy(t("Đang lưu ảnh tách nền…"));
    try {
      const up = await upload("cutout", await canvasToPng(result), "cutout.png", getSku());
      setCutoutUrl(up.url);
      setHasPhoto(false);
      photoRef.current = null;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function onGlb(file: File) {
    setError("");
    setBusy(t("Đang kiểm tra và tải mô hình 3D…"));
    try {
      const up = await upload("model", file, file.name, getSku(), getDims());
      setModelUrl(up.url);
      setModelStatus("ready");
      setReport(up.report ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function generate() {
    setError("");
    setBusy(t("Đang gửi ảnh cho máy chủ tạo 3D…"));
    try {
      const r = await fetch("/api/admin/furniture/model", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId }) });
      const j = (await r.json()) as { error?: string };
      if (!r.ok) throw new Error(j.error ?? `Lỗi ${r.status}`);
      setModelStatus("pending");
      const poll = async () => {
        const s = await (await fetch(`/api/admin/furniture/model?id=${itemId}`)).json();
        setModelStatus(s.status ?? "");
        if (s.modelUrl) setModelUrl(s.modelUrl);
        if (s.report) setReport(s.report);
        if (s.status === "pending") setTimeout(poll, 5000);
        if (s.status === "failed") setError(`Tạo 3D thất bại: ${s.error ?? t("không rõ")}`);
      };
      setTimeout(poll, 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  const level = modelUrl && modelStatus === "ready" ? t("3D thật") : cutoutUrl ? t("Ảnh thật tách nền") : t("Hình vẽ theo số đo");

  return (
    <fieldset className="space-y-4 rounded-xl border border-[var(--border)] p-4 sm:col-span-2">
      <legend className="px-1 text-[13px] font-medium">{t("Hình ảnh & 3D — khách xem món ở mức:")} <b>{level}</b></legend>
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <input type="hidden" name="cutoutUrl" value={cutoutUrl} />
      <input type="hidden" name="modelUrl" value={modelUrl} />
      <input type="hidden" name="embedding" value={embedding} />
      {approve && <input type="hidden" name="approveModel" value="1" />}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Field label={t("1. Ảnh sản phẩm")} hint={t("Chụp chính diện, nền đơn giản, thấy rõ cả món. Tải lên rồi AI tự tách nền ngay trên máy bạn.")}>
            <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} className={fieldCls} />
          </Field>
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="h-24 rounded-lg border border-[var(--border)] object-contain" />
          )}
          {cutoutUrl && (
            <div>
              <p className={note}>{t("Ảnh đã tách nền:")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cutoutUrl} alt="" className="h-28 rounded-lg border border-[var(--border)] bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:16px_16px] object-contain" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Field label={t("2. Mô hình 3D (.glb)")} hint={t("Xuất từ SketchUp/Blender/3ds Max hoặc nhờ nhà sản xuất. Tối đa 40 MB; nên dưới 8 MB. Có .glb thì khách xoay xem 3D và xem bằng camera điện thoại (AR).")}>
            <input type="file" accept=".glb,model/gltf-binary" onChange={(e) => e.target.files?.[0] && onGlb(e.target.files[0])} className={fieldCls} />
          </Field>
          {itemId && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" disabled={!!busy || !aiEnabled || modelStatus === "pending" || !(cutoutUrl || imageUrl)} onClick={generate} className={btn}>
                {modelStatus === "pending" ? t("AI đang tạo 3D…") : t("Tạo 3D nháp bằng AI từ ảnh")}
              </button>
              {!aiEnabled && <span className={note}>{t("Chưa kết nối máy chủ GPU (TRELLIS_API_URL) — xem docs/PLAN-FURNITURE-3D.md")}</span>}
            </div>
          )}
          {modelUrl && (
            <div className="space-y-2">
              <div className="h-56 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
                <ModelViewer src={modelUrl} alt={t("Mô hình 3D")} />
              </div>
              {modelStatus === "review" && (
                <label className="flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-[13px] text-amber-900">
                  <input type="checkbox" checked={approve} onChange={(e) => setApprove(e.target.checked)} className="mt-0.5 h-4 w-4" />
                  <span>
                    {t("Mô hình do AI tạo —")} <b>{t("chưa hiển thị cho khách")}</b>{t(". Xoay kiểm tra mặt sau, chân, màu; thấy ổn thì tick để duyệt rồi bấm Lưu sản phẩm. AI có thể đoán sai phần bị che khuất.")}
                  </span>
                </label>
              )}
              {modelStatus === "ready" && <p className="text-[12.5px] text-emerald-700">{t("Đang hiển thị cho khách.")}</p>}
              {report && (
                <ul className="space-y-0.5 text-[12.5px]">
                  <li className={note}>
                    {(report.bytes / 1024 / 1024).toFixed(1)} MB
                    {report.triangles ? ` · ${Math.round(report.triangles / 1000)}K tam giác` : ""}
                    {report.sizeCm ? ` · ${report.sizeCm.width}×${report.sizeCm.depth}×${report.sizeCm.height} cm` : ""}
                  </li>
                  {report.warnings.map((w) => (
                    <li key={w} className="text-amber-700">• {w}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {hasPhoto && (
        <div className="space-y-2 rounded-lg bg-[var(--surface-2)] p-3">
          <p className={note}>{t("Chạm vào món đồ để AI chọn đúng (chấm xanh); bật \"Bỏ vùng\" rồi chạm phần thừa bị dính (chấm đỏ).")}</p>
          <div className="grid gap-3 md:grid-cols-2">
            <canvas
              ref={view}
              className="w-full cursor-crosshair rounded-lg border border-[var(--border)]"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                const pt: PromptPoint = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, positive: !negative };
                void runCutout([...points, pt]);
              }}
            />
            <div className="space-y-2">
              {result ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.toDataURL()} alt={t("Kết quả tách nền")} className="max-h-64 w-full rounded-lg border border-[var(--border)] bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:16px_16px] object-contain" />
              ) : (
                <p className={note}>{t("Chưa có kết quả.")}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="flex min-h-10 items-center gap-2 text-[13px]">
                  <input type="checkbox" checked={negative} onChange={(e) => setNegative(e.target.checked)} className="h-4 w-4" /> {t("Bỏ vùng (chấm đỏ)")}
                </label>
                <button type="button" className={btn} disabled={!points.length || !!busy} onClick={() => void runCutout([{ x: 0.5, y: 0.55, positive: true }])}>
                  {t("Làm lại")}
                </button>
                <button type="button" className={`${btn} border-[var(--accent)]`} disabled={!result || !!busy} onClick={saveCutout}>
                  {t("Dùng ảnh tách nền này")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {busy && <p className="text-[13px] text-[var(--fg-muted)]">{busy}</p>}
      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
      {embedding && <p className={note}>{t("Đã tính vector ảnh để khách tìm \"món giống ảnh này\".")}</p>}
    </fieldset>
  );
}
