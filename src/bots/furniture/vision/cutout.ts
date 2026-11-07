/**
 * Tách nền ảnh sản phẩm ngay trên trình duyệt của người dùng admin bằng SlimSAM (Apache-2.0, đã dùng cho
 * bot gạch): chạm vào món đồ (điểm dương) và vùng thừa (điểm âm) → ảnh PNG nền trong suốt, cắt sát món.
 */
import type { Candidate, PromptPoint } from "@/bots/tile/vision/segmenter";

/** Chọn mặt nạ tốt nhất: điểm SAM cao, nhưng không phải cả khung hình và không quá nhỏ */
export function pickCandidate(cands: Pick<Candidate, "mask" | "score">[]): number {
  let best = 0;
  let bestScore = -1;
  cands.forEach((c, i) => {
    let on = 0;
    for (let k = 0; k < c.mask.length; k++) if (c.mask[k]) on++;
    const frac = on / c.mask.length;
    if (frac < 0.04 || frac > 0.92) return;
    // Mặt nạ lớn hơn thường bao trọn món đồ (SAM hay trả mặt nạ nhỏ = chỉ một bộ phận)
    const score = c.score * (0.6 + 0.4 * Math.min(1, frac / 0.35));
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return best;
}

/** Hộp bao của vùng alpha > ngưỡng (px) — null nếu trống */
export function alphaBounds(alpha: Uint8Array | Uint8ClampedArray, w: number, h: number, stride = 1, offset = 0, threshold = 24) {
  let x0 = w,
    y0 = h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (alpha[(y * w + x) * stride + offset] > threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** Ghép ảnh gốc + mặt nạ thành canvas PNG trong suốt, cắt sát món (chừa lề 2%) */
export function composeCutout(photo: HTMLCanvasElement, cand: Pick<Candidate, "mask" | "width" | "height">): HTMLCanvasElement {
  const { width: w, height: h } = photo;
  // Mặt nạ → canvas cùng cỡ ảnh, làm mềm mép 1px
  const m = document.createElement("canvas");
  m.width = cand.width;
  m.height = cand.height;
  const mi = new ImageData(cand.width, cand.height);
  for (let i = 0; i < cand.mask.length; i++) {
    mi.data[i * 4 + 3] = cand.mask[i];
  }
  m.getContext("2d")!.putImageData(mi, 0, 0);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  const ctx = out.getContext("2d")!;
  ctx.drawImage(photo, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  ctx.filter = "blur(0.8px)";
  ctx.drawImage(m, 0, 0, w, h);
  ctx.filter = "none";
  ctx.globalCompositeOperation = "source-over";
  const data = ctx.getImageData(0, 0, w, h).data;
  const b = alphaBounds(data, w, h, 4, 3);
  if (!b) return out;
  const padX = Math.round((b.x1 - b.x0) * 0.02);
  const padY = Math.round((b.y1 - b.y0) * 0.02);
  const sx = Math.max(0, b.x0 - padX);
  const sy = Math.max(0, b.y0 - padY);
  const sw = Math.min(w, b.x1 + padX + 1) - sx;
  const sh = Math.min(h, b.y1 + padY + 1) - sy;
  const crop = document.createElement("canvas");
  crop.width = sw;
  crop.height = sh;
  crop.getContext("2d")!.drawImage(out, sx, sy, sw, sh, 0, 0, sw, sh);
  return crop;
}

export const canvasToPng = (c: HTMLCanvasElement) => new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Không xuất được PNG"))), "image/png"));

export type { PromptPoint };
