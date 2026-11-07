"use client";

import type { RoomAnalysis } from "./analyzer";

let worker: Worker | null = null;
let nextId = 1;

/** Phân tích ảnh phòng trong Web Worker (giữ worker để lần sau không nạp lại model); lỗi worker → chạy main thread. */
export async function analyzeInBackground(imageUrl: string, onProgress?: (stage: "clip" | "detr", pct: number) => void): Promise<RoomAnalysis> {
  if (typeof Worker !== "undefined") {
    try {
      worker ??= new Worker(new URL("./analyzer.worker.ts", import.meta.url), { type: "module" });
      const w = worker;
      const id = nextId++;
      return await new Promise<RoomAnalysis>((resolve, reject) => {
        const onMsg = (ev: MessageEvent) => {
          const m = ev.data as { type: string; id?: number; stage?: "clip" | "detr"; pct?: number; result?: RoomAnalysis; message?: string };
          if (m.type === "progress") onProgress?.(m.stage!, m.pct!);
          else if (m.id === id) {
            w.removeEventListener("message", onMsg);
            if (m.type === "result") resolve(m.result!);
            else reject(new Error(m.message));
          }
        };
        w.addEventListener("message", onMsg);
        w.onerror = (e) => reject(new Error(e.message || "Worker lỗi"));
        w.postMessage({ id, imageUrl });
      });
    } catch (e) {
      console.warn("[analyzer] worker lỗi, chuyển sang main thread", e);
      worker?.terminate();
      worker = null;
    }
  }
  const { analyzeRoom } = await import("./analyzer");
  return analyzeRoom(imageUrl, onProgress);
}
