/**
 * Tách vùng sàn/tường bằng SlimSAM (Apache-2.0) chạy ngay trên trình duyệt.
 * Model nạp từ /models và runtime WASM từ /ort (tự host) — ảnh nhà khách không đi đâu cả.
 *
 * File này chạy được cả trên main thread lẫn trong Web Worker (xem segmenter.worker.ts).
 */
import type { PreTrainedModel, Processor, Tensor as TTensor } from "@huggingface/transformers";

const MODEL_ID = "Xenova/slimsam-77-uniform";

type Lib = typeof import("@huggingface/transformers");
export type Backend = { device: "webgpu" | "wasm"; dtype: "fp16" | "q8" };

let libPromise: Promise<Lib> | null = null;
const loadedByBackend = new Map<string, Promise<{ lib: Lib; model: PreTrainedModel; processor: Processor }>>();

async function lib(): Promise<Lib> {
  libPromise ??= import("@huggingface/transformers").then((m) => {
    m.env.allowRemoteModels = false;
    m.env.allowLocalModels = true;
    m.env.localModelPath = "/models/";
    // Runtime WASM tự host thay vì tải từ CDN
    const wasm = m.env.backends.onnx.wasm;
    if (wasm) {
      wasm.wasmPaths = { mjs: "/ort/ort-wasm-simd-threaded.asyncify.mjs", wasm: "/ort/ort-wasm-simd-threaded.asyncify.wasm" };
    }
    return m;
  });
  return libPromise;
}

/**
 * Chọn backend. `"gpu" in navigator` KHÔNG đủ: nhiều máy có navigator.gpu nhưng không có adapter,
 * hoặc adapter không hỗ trợ fp16 → nạp model fp16 lỗi. Phải hỏi adapter thật.
 */
export async function detectBackends(): Promise<Backend[]> {
  const list: Backend[] = [];
  try {
    const gpu = (globalThis.navigator as unknown as { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } } | undefined)?.gpu;
    const adapter = gpu ? await gpu.requestAdapter() : null;
    if (adapter?.features.has("shader-f16")) list.push({ device: "webgpu", dtype: "fp16" });
  } catch {
    /* không có WebGPU */
  }
  list.push({ device: "wasm", dtype: "q8" });
  return list;
}

async function loadFor(backend: Backend, onProgress?: (pct: number) => void) {
  const key = `${backend.device}/${backend.dtype}`;
  let p = loadedByBackend.get(key);
  if (!p) {
    p = (async () => {
      const m = await lib();
      const progress = (e: { status: string; progress?: number }) => {
        if (e.status === "progress" && typeof e.progress === "number") onProgress?.(e.progress);
      };
      const model = await m.SamModel.from_pretrained(MODEL_ID, { device: backend.device, dtype: backend.dtype, progress_callback: progress });
      const processor = await m.AutoProcessor.from_pretrained(MODEL_ID, {});
      return { lib: m, model, processor };
    })();
    p.catch(() => loadedByBackend.delete(key));
    loadedByBackend.set(key, p);
  }
  return p;
}

export interface Segmentation {
  /** Mặt nạ 0/255 kích thước width × height (bằng ảnh gốc) */
  mask: Uint8Array;
  width: number;
  height: number;
}

export interface Candidate extends Segmentation {
  /** Điểm IoU SAM dự đoán (0..1) */
  score: number;
}

export interface PromptPoint {
  x: number;
  y: number;
  positive: boolean;
}

export interface SegSession {
  backend: Backend;
  /** Mỗi bộ điểm chạm cho ra 3 mặt nạ ứng viên (nhỏ → lớn). */
  segmentAll(points: PromptPoint[]): Promise<Candidate[]>;
}

/** Tạo phiên tách vùng cho một ảnh: tính embedding một lần, sau đó mỗi lần chạm chỉ chạy decoder (nhanh). */
export async function createSession(imageUrl: string, onProgress?: (pct: number) => void): Promise<SegSession> {
  let lastError: unknown;
  for (const backend of await detectBackends()) {
    try {
      return await createSessionOn(backend, imageUrl, onProgress);
    } catch (e) {
      console.warn(`[segmenter] ${backend.device}/${backend.dtype} lỗi, thử backend khác`, e);
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Không khởi tạo được AI tách vùng");
}

async function createSessionOn(backend: Backend, imageUrl: string, onProgress?: (pct: number) => void): Promise<SegSession> {
  const t0 = performance.now();
  const { lib: m, model, processor } = await loadFor(backend, onProgress);
  const t1 = performance.now();
  const image = await m.RawImage.fromURL(imageUrl);
  const inputs = await processor(image);
  const embeddings = await (model as unknown as { get_image_embeddings(i: unknown): Promise<Record<string, TTensor>> }).get_image_embeddings(inputs);
  console.info(`[segmenter] ${backend.device}/${backend.dtype}: nạp model ${Math.round(t1 - t0)}ms, mã hoá ảnh ${Math.round(performance.now() - t1)}ms`);
  const reshaped = (inputs.reshaped_input_sizes as number[][])[0]; // [h, w]

  return {
    backend,
    async segmentAll(points) {
      const coords = points.flatMap((p) => [p.x * reshaped[1], p.y * reshaped[0]]);
      const input_points = new m.Tensor("float32", Float32Array.from(coords), [1, 1, points.length, 2]);
      const input_labels = new m.Tensor("int64", BigInt64Array.from(points.map((p) => BigInt(p.positive ? 1 : 0))), [1, 1, points.length]);
      const out = (await (model as unknown as (i: unknown) => Promise<{ pred_masks: TTensor; iou_scores: TTensor }>)({
        ...embeddings,
        input_points,
        input_labels,
      }));
      const masks = (
        await (processor as unknown as { post_process_masks(a: TTensor, b: unknown, c: unknown): Promise<TTensor[]> }).post_process_masks(
          out.pred_masks,
          inputs.original_sizes,
          inputs.reshaped_input_sizes,
        )
      )[0];
      const scores = out.iou_scores.data as Float32Array;
      const [, n, height, width] = masks.dims as number[];
      const data = masks.data as Uint8Array | boolean[];
      const size = width * height;
      const result: Candidate[] = [];
      for (let k = 0; k < n; k++) {
        const mask = new Uint8Array(size);
        for (let i = 0; i < size; i++) mask[i] = data[k * size + i] ? 255 : 0;
        result.push({ mask, width, height, score: scores[k] });
      }
      return result;
    },
  };
}
