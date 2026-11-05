"use client";

import type { Candidate, PromptPoint, SegSession } from "./segmenter";

export interface SegClient {
  backend: string;
  segmentAll(points: PromptPoint[]): Promise<Candidate[]>;
  dispose(): void;
}

/**
 * Mở phiên tách vùng. Ưu tiên Web Worker (UI không đứng); nếu worker không chạy được thì rơi về main thread.
 */
export async function openSegmenter(imageUrl: string, onProgress?: (pct: number) => void): Promise<SegClient> {
  if (typeof Worker !== "undefined") {
    try {
      return await openInWorker(imageUrl, onProgress);
    } catch (e) {
      console.warn("[segmenter] worker lỗi, chuyển sang main thread", e);
    }
  }
  const { createSession } = await import("./segmenter");
  const s: SegSession = await createSession(imageUrl, onProgress);
  return { backend: `${s.backend.device}/${s.backend.dtype}`, segmentAll: (p) => s.segmentAll(p), dispose() {} };
}

function openInWorker(imageUrl: string, onProgress?: (pct: number) => void): Promise<SegClient> {
  const worker = new Worker(new URL("./segmenter.worker.ts", import.meta.url), { type: "module" });
  let nextId = 1;
  const pending = new Map<number, { resolve: (c: Candidate[]) => void; reject: (e: Error) => void }>();

  return new Promise<SegClient>((resolve, reject) => {
    let ready = false;
    worker.onerror = (e) => {
      const err = new Error(e.message || "Worker lỗi");
      if (!ready) reject(err);
      for (const p of pending.values()) p.reject(err);
      pending.clear();
    };
    worker.onmessage = (ev: MessageEvent) => {
      const m = ev.data as
        | { type: "progress"; pct: number }
        | { type: "ready"; backend: { device: string; dtype: string } }
        | { type: "result"; id: number; cands: Candidate[] }
        | { type: "error"; id?: number; message: string };
      if (m.type === "progress") onProgress?.(m.pct);
      else if (m.type === "ready") {
        ready = true;
        resolve({
          backend: `${m.backend.device}/${m.backend.dtype}`,
          segmentAll: (points) =>
            new Promise((res, rej) => {
              const id = nextId++;
              pending.set(id, { resolve: res, reject: rej });
              worker.postMessage({ type: "segment", id, points });
            }),
          dispose: () => worker.terminate(),
        });
      } else if (m.type === "result") {
        pending.get(m.id)?.resolve(m.cands);
        pending.delete(m.id);
      } else if (m.type === "error") {
        const err = new Error(m.message);
        if (m.id !== undefined) {
          pending.get(m.id)?.reject(err);
          pending.delete(m.id);
        } else if (!ready) {
          worker.terminate();
          reject(err);
        }
      }
    };
    worker.postMessage({ type: "init", imageUrl });
  });
}
