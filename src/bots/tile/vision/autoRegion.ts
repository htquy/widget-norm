/**
 * Tự nhận diện vùng sàn/tường từ các mặt nạ ứng viên của SAM, rồi ước lượng 4 góc phối cảnh.
 * Toàn bộ là hàm thuần (không đụng DOM) nên test được.
 */
import { quadFromMask, type Pt } from "./homography";
import type { Candidate, PromptPoint } from "./segmenter";

export type Surface = "floor" | "wall";

/**
 * Các bộ điểm gợi ý tự động. SAM cần điểm chạm; khách chưa chạm nên ta "chạm giúp" vào chỗ thường là sàn
 * (nửa dưới ảnh) hoặc tường (giữa ảnh, phần trên). Điểm âm giúp tường không lan xuống sàn.
 */
export function autoPrompts(surface: Surface): PromptPoint[][] {
  const p = (x: number, y: number, positive = true): PromptPoint => ({ x, y, positive });
  if (surface === "floor") {
    return [
      [p(0.5, 0.9)],
      [p(0.5, 0.9), p(0.25, 0.86), p(0.75, 0.86)],
      [p(0.5, 0.8), p(0.35, 0.92), p(0.65, 0.92)],
      [p(0.5, 0.88), p(0.5, 0.2, false)],
    ];
  }
  // Tường: không biết tường nằm đâu → rải lưới điểm ở nửa trên ảnh, lấy mặt nạ tốt nhất.
  const sets: PromptPoint[][] = [];
  for (const y of [0.25, 0.4, 0.55]) for (const x of [0.2, 0.5, 0.8]) sets.push([p(x, y)]);
  sets.push([p(0.5, 0.35), p(0.5, 0.95, false)], [p(0.25, 0.35), p(0.75, 0.35), p(0.5, 0.97, false)]);
  return sets;
}

/** Giữ lại các thành phần liên thông chứa điểm gợi ý (bỏ vệt rời rạc). Nếu không điểm nào trúng, giữ thành phần lớn nhất. */
export function keepComponent(mask: Uint8Array, w: number, h: number, seeds: Pt[]): Uint8Array {
  const label = new Int32Array(w * h); // 0 = chưa xét
  const sizes: number[] = [0];
  const stack = new Int32Array(w * h);
  let next = 0;
  const fill = (start: number) => {
    next++;
    let sp = 0,
      count = 0;
    stack[sp++] = start;
    label[start] = next;
    while (sp) {
      const i = stack[--sp];
      count++;
      const x = i % w,
        y = (i / w) | 0;
      if (x > 0 && mask[i - 1] && !label[i - 1]) {
        label[i - 1] = next;
        stack[sp++] = i - 1;
      }
      if (x < w - 1 && mask[i + 1] && !label[i + 1]) {
        label[i + 1] = next;
        stack[sp++] = i + 1;
      }
      if (y > 0 && mask[i - w] && !label[i - w]) {
        label[i - w] = next;
        stack[sp++] = i - w;
      }
      if (y < h - 1 && mask[i + w] && !label[i + w]) {
        label[i + w] = next;
        stack[sp++] = i + w;
      }
    }
    sizes.push(count);
  };
  for (let i = 0; i < mask.length; i++) if (mask[i] && !label[i]) fill(i);

  const keep = new Set<number>();
  for (const [sx, sy] of seeds) {
    const x = Math.min(w - 1, Math.max(0, Math.round(sx * w)));
    const y = Math.min(h - 1, Math.max(0, Math.round(sy * h)));
    // điểm chạm có thể rơi sát mép mặt nạ: thử thêm vài điểm lân cận
    for (const dy of [0, -3, 3])
      for (const dx of [0, -3, 3]) {
        const xx = Math.min(w - 1, Math.max(0, x + dx)),
          yy = Math.min(h - 1, Math.max(0, y + dy));
        const l = label[yy * w + xx];
        if (l) keep.add(l);
      }
  }
  if (!keep.size && next) {
    let best = 1;
    for (let l = 2; l <= next; l++) if (sizes[l] > sizes[best]) best = l;
    keep.add(best);
  }
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) if (label[i] && keep.has(label[i])) out[i] = 255;
  return out;
}

function stats(mask: Uint8Array, w: number, h: number) {
  let n = 0,
    sy = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (mask[y * w + x]) {
        n++;
        sy += y;
      }
  return { fraction: n / (w * h), centroidY: n ? sy / n / h : 0 };
}

export interface PickedRegion {
  mask: Uint8Array;
  width: number;
  height: number;
  score: number;
  fraction: number;
  /** Bộ điểm gợi ý đã cho ra mặt nạ này (làm nền để khách chạm thêm/bớt) */
  promptIndex: number;
}

/**
 * Chọn mặt nạ tốt nhất trong các ứng viên (mỗi bộ điểm → 3 mặt nạ).
 * Loại mặt nạ quá nhỏ/quá lớn (lan ra cả ảnh) hoặc nằm sai vị trí (sàn thì phải ở nửa dưới ảnh, tường thì không).
 */
export function pickRegion(perPrompt: Candidate[][], prompts: PromptPoint[][], surface: Surface): PickedRegion | null {
  let best: PickedRegion | null = null;
  perPrompt.forEach((cands, i) => {
    const seeds = prompts[i].filter((p) => p.positive).map((p) => [p.x, p.y] as Pt);
    for (const c of cands) {
      const mask = keepComponent(c.mask, c.width, c.height, seeds);
      const { fraction, centroidY } = stats(mask, c.width, c.height);
      if (fraction < 0.05 || fraction > 0.92) continue;
      if (surface === "floor" && centroidY < 0.5) continue;
      if (surface === "wall" && centroidY > 0.7) continue;
      // Ưu tiên mặt nạ SAM tự tin, và đủ lớn để là "cả sàn/cả tường" chứ không phải một mảng nhỏ.
      const score = c.score * (0.45 + 0.55 * Math.min(1, fraction / 0.3));
      if (!best || score > best.score) best = { mask, width: c.width, height: c.height, score, fraction, promptIndex: i };
    }
  });
  return best;
}

function fitLine(pts: [number, number][]): { a: number; b: number } | null {
  // x = a*y + b, hồi quy bình phương tối thiểu, loại điểm lệch > 2σ rồi fit lại
  let use = pts;
  for (let pass = 0; pass < 2; pass++) {
    const n = use.length;
    if (n < 4) return null;
    const sy = use.reduce((s, p) => s + p[0], 0),
      sx = use.reduce((s, p) => s + p[1], 0);
    const syy = use.reduce((s, p) => s + p[0] * p[0], 0),
      sxy = use.reduce((s, p) => s + p[0] * p[1], 0);
    const den = n * syy - sy * sy;
    if (Math.abs(den) < 1e-9) return null;
    const a = (n * sxy - sy * sx) / den;
    const b = (sx - a * sy) / n;
    if (pass === 1) return { a, b };
    const res = use.map((p) => p[1] - (a * p[0] + b));
    const sigma = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / n) || 1e-6;
    use = use.filter((_, i) => Math.abs(res[i]) <= 2 * sigma + 0.5);
  }
  return null;
}

/** Tứ giác phối cảnh của sàn: hai cạnh bên là đường thẳng khớp với biên trái/phải của mặt nạ. */
function quadForFloor(mask: Uint8Array, w: number, h: number): Pt[] | null {
  const xmin = new Float32Array(h).fill(-1),
    xmax = new Float32Array(h).fill(-1);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let lo = -1,
      hi = -1;
    for (let x = 0; x < w; x++)
      if (mask[row + x]) {
        if (lo < 0) lo = x;
        hi = x;
      }
    xmin[y] = lo;
    xmax[y] = hi;
  }
  const wide = (y: number) => xmin[y] >= 0 && xmax[y] - xmin[y] >= 0.04 * w;
  let top = 0;
  while (top < h && !wide(top)) top++;
  let bot = h - 1;
  while (bot > top && !wide(bot)) bot--;
  const span = bot - top;
  if (span < 0.08 * h) return null;
  const from = top + Math.round(span * 0.08),
    to = bot - Math.round(span * 0.04);
  const L: [number, number][] = [],
    R: [number, number][] = [];
  for (let y = from; y <= to; y += 2)
    if (wide(y)) {
      L.push([y, xmin[y]]);
      R.push([y, xmax[y]]);
    }
  const fl = fitLine(L),
    fr = fitLine(R);
  if (!fl || !fr) return null;
  const cl = (v: number) => Math.min(1, Math.max(0, v));
  const at = (f: { a: number; b: number }, y: number) => cl((f.a * y + f.b) / w);
  const yT = top / h,
    yB = (bot + 1) / h;
  const q: Pt[] = [
    [at(fl, top), yT],
    [at(fr, top), yT],
    [at(fr, bot), yB],
    [at(fl, bot), yB],
  ];
  return q[1][0] - q[0][0] > 0.03 && q[2][0] - q[3][0] > 0.05 ? q : null;
}

function polygonArea(q: Pt[]): number {
  let a = 0;
  for (let i = 0; i < 4; i++) {
    const [x1, y1] = q[i],
      [x2, y2] = q[(i + 1) % 4];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** Quad hợp lệ (đủ lớn) — nếu không thì để UI dùng quad mặc định. */
export function quadFromRegion(mask: Uint8Array, w: number, h: number, surface: Surface): Pt[] | null {
  const q = (surface === "floor" ? quadForFloor(mask, w, h) : null) ?? quadFromMask(mask, w, h);
  if (!q || polygonArea(q) < 0.03) return null;
  return q;
}
