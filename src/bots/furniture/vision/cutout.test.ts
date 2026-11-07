import { describe, expect, it } from "vitest";
import { alphaBounds, pickCandidate } from "./cutout";

const mask = (w: number, h: number, rect: [number, number, number, number]) => {
  const m = new Uint8Array(w * h);
  for (let y = rect[1]; y < rect[3]; y++) for (let x = rect[0]; x < rect[2]; x++) m[y * w + x] = 255;
  return m;
};

describe("tách nền", () => {
  it("chọn mặt nạ bao trọn món, bỏ mặt nạ cả khung hình hoặc quá nhỏ", () => {
    const w = 100;
    const h = 100;
    const cands = [
      { mask: mask(w, h, [40, 40, 45, 45]), score: 0.95 }, // quá nhỏ (0,25%)
      { mask: mask(w, h, [20, 20, 80, 80]), score: 0.9 }, // món đồ (36%)
      { mask: mask(w, h, [0, 0, 100, 100]), score: 0.99 }, // cả khung hình
    ];
    expect(pickCandidate(cands)).toBe(1);
  });
  it("hộp bao của vùng alpha", () => {
    const a = new Uint8Array(10 * 8);
    a[2 * 10 + 3] = 255;
    a[5 * 10 + 7] = 255;
    expect(alphaBounds(a, 10, 8)).toEqual({ x0: 3, y0: 2, x1: 7, y1: 5 });
    expect(alphaBounds(new Uint8Array(80), 10, 8)).toBeNull();
  });
});
