import { describe, expect, it } from "vitest";
import { keepComponent, pickRegion, quadFromRegion } from "./autoRegion";
import type { Candidate } from "./segmenter";

const W = 200,
  H = 100;

/** Hình thang "sàn": đỉnh y=40 (x 70..130), đáy y=99 (x 5..195) */
function trapezoid(): Uint8Array {
  const m = new Uint8Array(W * H);
  for (let y = 40; y < H; y++) {
    const t = (y - 40) / 59;
    const lo = Math.round(70 - 65 * t),
      hi = Math.round(130 + 65 * t);
    for (let x = lo; x <= hi; x++) m[y * W + x] = 255;
  }
  return m;
}

describe("keepComponent", () => {
  it("bỏ vệt rời, giữ mảng chứa điểm chạm", () => {
    const m = trapezoid();
    m[5 * W + 5] = 255; // vệt rời ở góc trên
    const out = keepComponent(m, W, H, [[0.5, 0.9]]);
    expect(out[5 * W + 5]).toBe(0);
    expect(out[90 * W + 100]).toBe(255);
  });

  it("không có điểm nào trúng → giữ mảng lớn nhất", () => {
    const m = trapezoid();
    m[5 * W + 5] = 255;
    const out = keepComponent(m, W, H, [[0.02, 0.5]]);
    expect(out[5 * W + 5]).toBe(0);
    expect(out[90 * W + 100]).toBe(255);
  });
});

describe("quadFromRegion (sàn)", () => {
  it("khôi phục hình thang phối cảnh", () => {
    const q = quadFromRegion(trapezoid(), W, H, "floor")!;
    expect(q).not.toBeNull();
    const [tl, tr, br, bl] = q;
    expect(tl[1]).toBeCloseTo(0.4, 1);
    expect(tl[0]).toBeCloseTo(0.35, 1);
    expect(tr[0]).toBeCloseTo(0.65, 1);
    expect(bl[0]).toBeLessThan(0.1);
    expect(br[0]).toBeGreaterThan(0.9);
    expect(br[1]).toBeCloseTo(1, 1);
  });

  it("mặt nạ quá nhỏ → null để dùng quad mặc định", () => {
    const m = new Uint8Array(W * H);
    for (let y = 50; y < 54; y++) for (let x = 50; x < 54; x++) m[y * W + x] = 255;
    expect(quadFromRegion(m, W, H, "floor")).toBeNull();
  });
});

describe("pickRegion", () => {
  const cand = (mask: Uint8Array, score: number): Candidate => ({ mask, width: W, height: H, score });
  const full = new Uint8Array(W * H).fill(255);
  const tiny = new Uint8Array(W * H);
  tiny[95 * W + 100] = 255;

  it("bỏ mặt nạ phủ cả ảnh và mặt nạ quá nhỏ, chọn sàn", () => {
    const picked = pickRegion([[cand(tiny, 0.99), cand(full, 0.98), cand(trapezoid(), 0.9)]], [[{ x: 0.5, y: 0.95, positive: true }]], "floor");
    expect(picked).not.toBeNull();
    expect(picked!.fraction).toBeGreaterThan(0.2);
    expect(picked!.fraction).toBeLessThan(0.5);
  });

  it("sàn không được nằm ở nửa trên ảnh", () => {
    const top = new Uint8Array(W * H);
    for (let y = 0; y < 30; y++) for (let x = 0; x < W; x++) top[y * W + x] = 255;
    expect(pickRegion([[cand(top, 0.95)]], [[{ x: 0.5, y: 0.1, positive: true }]], "floor")).toBeNull();
  });
});
