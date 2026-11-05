export type Pt = [number, number];

/** Giải hệ tuyến tính Ax = b (Gauss, pivot từng phần). */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-12) throw new Error("Bốn góc thẳng hàng — hãy kéo các góc ra xa nhau hơn");
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

/**
 * Homography 3x3 (row-major) biến src[i] → dst[i].
 * Dùng để ánh xạ toạ độ ảnh → toạ độ thật trên mặt sàn/tường (mét).
 */
export function homography(src: Pt[], dst: Pt[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solve(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

export function apply(H: number[], [x, y]: Pt): Pt {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

/** Ma trận cho GLSL (column-major) từ row-major. */
export const toGl = (H: number[]) => new Float32Array([H[0], H[3], H[6], H[1], H[4], H[7], H[2], H[5], H[8]]);

/**
 * Ước lượng 4 góc từ mặt nạ vùng (sàn/tường): lấy các điểm cực trị theo hai đường chéo.
 * Thứ tự trả về: trên-trái, trên-phải, dưới-phải, dưới-trái (toạ độ chuẩn hoá 0..1).
 */
export function quadFromMask(mask: Uint8Array, w: number, h: number): Pt[] | null {
  let tl: Pt | null = null, tr: Pt | null = null, br: Pt | null = null, bl: Pt | null = null;
  let sTl = Infinity, sTr = -Infinity, sBr = -Infinity, sBl = Infinity;
  let count = 0;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 200));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (!mask[y * w + x]) continue;
      count++;
      const s = x + y, d = x - y;
      if (s < sTl) { sTl = s; tl = [x, y]; }
      if (s > sBr) { sBr = s; br = [x, y]; }
      if (d > sTr) { sTr = d; tr = [x, y]; }
      if (d < sBl) { sBl = d; bl = [x, y]; }
    }
  }
  if (count < 50 || !tl || !tr || !br || !bl) return null;
  return [tl, tr, br, bl].map(([x, y]) => [x / w, y / h] as Pt);
}

/** Tứ giác mặc định cho sàn (hình thang phối cảnh ở nửa dưới ảnh). */
export const DEFAULT_FLOOR_QUAD: Pt[] = [
  [0.3, 0.55],
  [0.7, 0.55],
  [0.95, 0.95],
  [0.05, 0.95],
];
export const DEFAULT_WALL_QUAD: Pt[] = [
  [0.15, 0.1],
  [0.85, 0.1],
  [0.85, 0.6],
  [0.15, 0.6],
];
