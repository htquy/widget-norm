/// <reference lib="webworker" />
/** Chạy SlimSAM trong Web Worker để giao diện không bị đứng khi AI đang tính. */
import { createSession, type PromptPoint, type SegSession } from "./segmenter";

let session: SegSession | null = null;

self.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data as
    | { type: "init"; imageUrl: string }
    | { type: "segment"; id: number; points: PromptPoint[] };
  try {
    if (msg.type === "init") {
      session = await createSession(msg.imageUrl, (pct) => self.postMessage({ type: "progress", pct }));
      self.postMessage({ type: "ready", backend: session.backend });
    } else if (msg.type === "segment") {
      if (!session) throw new Error("Phiên chưa sẵn sàng");
      const cands = await session.segmentAll(msg.points);
      self.postMessage({ type: "result", id: msg.id, cands }, cands.map((c) => c.mask.buffer));
    }
  } catch (e) {
    self.postMessage({ type: "error", id: (msg as { id?: number }).id, message: e instanceof Error ? e.message : String(e) });
  }
};
