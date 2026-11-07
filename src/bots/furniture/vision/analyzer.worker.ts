/// <reference lib="webworker" />
/** Chạy CLIP + DETR trong Web Worker để giao diện không đứng khi AI đang tính. */
import { analyzeRoom } from "./analyzer";

self.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data as { id: number; imageUrl: string };
  try {
    const result = await analyzeRoom(msg.imageUrl, (stage, pct) => self.postMessage({ type: "progress", stage, pct }));
    self.postMessage({ type: "result", id: msg.id, result });
  } catch (e) {
    self.postMessage({ type: "error", id: msg.id, message: e instanceof Error ? e.message : String(e) });
  }
};
