/**
 * Phân tích ảnh phòng ngay trên trình duyệt (ảnh khách không rời máy):
 * - CLIP ViT-B/32 (MIT): loại phòng + phong cách, so với vector nhãn tính sẵn (labels.json).
 * - DETR ResNet-50 (Apache-2.0): đồ đã có trong phòng (sofa, giường, bàn ăn, ghế, TV, cây...).
 * Chạy được trong Web Worker lẫn main thread.
 */
import labels from "./labels.json";

type Lib = typeof import("@huggingface/transformers");
const CLIP_ID = "Xenova/clip-vit-base-patch32";
const DETR_ID = "Xenova/detr-resnet-50";

export interface Scored<T extends string = string> {
  id: T;
  p: number;
}
export interface Detection {
  label: string;
  score: number;
  /** Hộp chuẩn hoá 0..1 */
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}
export interface RoomAnalysis {
  rooms: Scored[];
  styles: Scored[];
  objects: Detection[];
}

let libP: Promise<Lib> | null = null;
function lib(): Promise<Lib> {
  libP ??= import("@huggingface/transformers").then((m) => {
    m.env.allowRemoteModels = false;
    m.env.allowLocalModels = true;
    m.env.localModelPath = "/models/";
    const wasm = m.env.backends.onnx.wasm;
    if (wasm) wasm.wasmPaths = { mjs: "/ort/ort-wasm-simd-threaded.asyncify.mjs", wasm: "/ort/ort-wasm-simd-threaded.asyncify.wasm" };
    return m;
  });
  return libP;
}

type Progress = (stage: "clip" | "detr", pct: number) => void;

let clipP: Promise<{ model: Awaited<ReturnType<Lib["CLIPVisionModelWithProjection"]["from_pretrained"]>>; processor: Awaited<ReturnType<Lib["AutoProcessor"]["from_pretrained"]>> }> | null = null;
let detrP: Promise<(img: unknown, o: { threshold: number; percentage: boolean }) => Promise<unknown>> | null = null;

const progressCb = (stage: "clip" | "detr", on?: Progress) => (e: { status: string; progress?: number }) => {
  if (e.status === "progress" && typeof e.progress === "number") on?.(stage, e.progress);
};

function softmax(xs: number[], scale = 100): number[] {
  const m = Math.max(...xs);
  const e = xs.map((x) => Math.exp((x - m) * scale));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

function rank(embed: number[], table: Record<string, number[]>): Scored[] {
  const ids = Object.keys(table);
  const sims = ids.map((id) => table[id].reduce((s, v, i) => s + v * embed[i], 0));
  const p = softmax(sims);
  return ids.map((id, i) => ({ id, p: Math.round(p[i] * 1000) / 1000 })).sort((a, b) => b.p - a.p);
}

async function clipEmbedding(imageUrl: string, onProgress?: Progress): Promise<number[]> {
  const m = await lib();
  clipP ??= (async () => ({
    model: await m.CLIPVisionModelWithProjection.from_pretrained(CLIP_ID, { device: "wasm", dtype: "q8", progress_callback: progressCb("clip", onProgress) }),
    processor: await m.AutoProcessor.from_pretrained(CLIP_ID, {}),
  }))();
  const image = await m.RawImage.fromURL(imageUrl);
  const { model, processor } = await clipP;
  const inputs = await processor(image);
  const { image_embeds } = (await model(inputs)) as { image_embeds: { data: Float32Array } };
  const v = Array.from(image_embeds.data);
  const n = Math.hypot(...v);
  return v.map((x) => Math.round((x / n) * 1e5) / 1e5);
}

/** Vector CLIP (đã chuẩn hoá) của một ảnh — dùng cho "tìm món giống ảnh này" */
export const embedImage = clipEmbedding;

export async function analyzeRoom(imageUrl: string, onProgress?: Progress): Promise<RoomAnalysis> {
  const m = await lib();
  const embed = await clipEmbedding(imageUrl, onProgress);
  detrP ??= (async () => {
    const pipe = await m.pipeline("object-detection", DETR_ID, { device: "wasm", dtype: "q8", progress_callback: progressCb("detr", onProgress) });
    return pipe as unknown as (img: unknown, o: { threshold: number; percentage: boolean }) => Promise<unknown>;
  })();

  const image = await m.RawImage.fromURL(imageUrl);
  const detr = await detrP;
  const raw = (await detr(image, { threshold: 0.75, percentage: true })) as Detection[];

  return {
    rooms: rank(embed, labels.rooms as Record<string, number[]>),
    styles: rank(embed, labels.styles as Record<string, number[]>),
    objects: raw.map((d) => ({ label: d.label, score: Math.round(d.score * 100) / 100, box: d.box })),
  };
}

/** Bảng màu chủ đạo của ảnh (k-means 5 cụm trên ảnh thu nhỏ) — không cần model */
export function dominantColors(canvas: HTMLCanvasElement | OffscreenCanvas, k = 5): string[] {
  const size = 64;
  const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(size, size) : Object.assign(document.createElement("canvas"), { width: size, height: size });
  const ctx = c.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  ctx.drawImage(canvas as CanvasImageSource, 0, 0, size, size);
  const d = ctx.getImageData(0, 0, size, size).data;
  const px: number[][] = [];
  for (let i = 0; i < d.length; i += 4) px.push([d[i], d[i + 1], d[i + 2]]);
  let centers = Array.from({ length: k }, (_, i) => px[Math.floor(((i + 0.5) * px.length) / k)].slice());
  const assign = new Array(px.length).fill(0);
  for (let it = 0; it < 8; it++) {
    px.forEach((p, i) => {
      let best = 0;
      let bd = Infinity;
      centers.forEach((c2, j) => {
        const dd = (p[0] - c2[0]) ** 2 + (p[1] - c2[1]) ** 2 + (p[2] - c2[2]) ** 2;
        if (dd < bd) (bd = dd), (best = j);
      });
      assign[i] = best;
    });
    centers = centers.map((c2, j) => {
      const mine = px.filter((_, i) => assign[i] === j);
      if (!mine.length) return c2;
      return [0, 1, 2].map((ch) => mine.reduce((s, p) => s + p[ch], 0) / mine.length);
    });
  }
  const counts = centers.map((_, j) => assign.filter((a) => a === j).length);
  return centers
    .map((c2, j) => ({ hex: `#${c2.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`, n: counts[j] }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.hex);
}
