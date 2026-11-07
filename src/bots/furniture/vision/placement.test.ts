import { describe, expect, it } from "vitest";
import { autoLayout, fitModel, footprint, insideFloor, overlaps, project, type Floor, type Placed } from "./placement";

const floor: Floor = { quad: [[0.2, 0.6], [0.8, 0.6], [1, 1], [0, 1]], widthCm: 400, depthCm: 500 };
const item = (category: string, w: number, d: number, h = 80): Omit<Placed, "x" | "y" | "rot"> => ({ key: category + w, itemId: category, name: category, category, color: "be", price: 1, widthCm: w, depthCm: d, heightCm: h });

describe("kê đồ trên sàn", () => {
  it("bố trí mặc định: sofa sát tường trong, bàn trà cách sofa 45 cm, kệ áp tường bên (xoay)", () => {
    const [sofa, table, shelf] = autoLayout(floor, [item("Sofa", 210, 90), item("Bàn trà", 80, 80), item("Kệ sách", 80, 30)]);
    expect(sofa.y - sofa.depthCm / 2).toBeLessThan(10);
    expect(table.y - table.depthCm / 2 - (sofa.y + sofa.depthCm / 2)).toBe(45);
    expect(shelf.rot).toBe(true);
    expect(footprint(shelf)).toEqual({ w: 30, d: 80 });
    for (const p of [sofa, table, shelf]) expect(insideFloor(floor, p)).toBe(true);
  });

  it("ghế ăn chia hai bên bàn, không bị coi là chồng lên bàn", () => {
    const placed = autoLayout(floor, [item("Bàn ăn", 160, 80), ...[1, 2, 3, 4].map((k) => ({ ...item("Ghế ăn", 45, 52), key: `g${k}` }))]);
    const table = placed.find((p) => p.category === "Bàn ăn")!;
    const chairs = placed.filter((p) => p.category === "Ghế ăn");
    expect(chairs.filter((c) => c.y < table.y)).toHaveLength(2);
    expect(chairs.some((c) => overlaps(c, table))).toBe(false);
  });

  it("đồ ở gần người chụp to hơn đồ ở sát tường trong (phối cảnh)", () => {
    const base = { ...item("Bàn trà", 80, 80), rot: false, x: 200 };
    const far = project(floor, { ...base, y: 60 }, 1000, 1000);
    const near = project(floor, { ...base, y: 440 }, 1000, 1000);
    expect(near.pxPerCm).toBeGreaterThan(far.pxPerCm);
    expect(near.heightPx).toBeCloseTo(80 * near.pxPerCm, 5);
  });

  it("mô hình 3D: tự xoay 90° khi khớp hơn và co giãn về đúng số đo", () => {
    const upright = fitModel({ x: 2.1, y: 0.82, z: 0.9 }, { widthCm: 210, depthCm: 90, heightCm: 82 });
    expect(upright.rotated).toBe(false);
    expect(upright.distortion).toBeCloseTo(0, 5);
    const turned = fitModel({ x: 0.9, y: 0.82, z: 2.1 }, { widthCm: 210, depthCm: 90, heightCm: 82 });
    expect(turned.rotated).toBe(true);
    expect(turned.rotY).toBeCloseTo(Math.PI / 2);
    expect(turned.scale.x).toBeCloseTo(1, 5); // x gốc 0,9 m → sâu 90 cm
    expect(turned.scale.z).toBeCloseTo(1, 5);
    const odd = fitModel({ x: 1, y: 1, z: 1 }, { widthCm: 210, depthCm: 90, heightCm: 82 });
    expect(odd.distortion).toBeGreaterThan(0.5);
  });

  it("phát hiện ra ngoài phòng", () => {
    expect(insideFloor(floor, { ...item("Sofa", 210, 90), rot: false, x: 380, y: 50 })).toBe(false);
  });
});

describe("xoay tự do", () => {
  const base: Placed = { ...item("Sofa", 200, 100), rot: false, x: 200, y: 250 };

  it("góc 0 / 90 / 45: hộp bao theo trục sàn đổi đúng", async () => {
    const { footprint, yawDeg } = await import("./placement");
    expect(footprint({ ...base, angle: 0 })).toEqual({ w: 200, d: 100 });
    expect(footprint({ ...base, angle: 90 })).toEqual({ w: 100, d: 200 });
    const f45 = footprint({ ...base, angle: 45 });
    expect(f45.w).toBeCloseTo(212.13, 1);
    expect(f45.d).toBeCloseTo(212.13, 1);
    // tương thích dữ liệu cũ: rot=true ≡ 90°
    expect(yawDeg({ rot: true })).toBe(90);
    expect(yawDeg({ rot: false, angle: -90 })).toBe(270);
  });

  it("kéo nút xoay: góc tính từ tâm tới con trỏ (0 = về phía người chụp, 90 = sang phải)", async () => {
    const { angleToward, frontVector } = await import("./placement");
    expect(angleToward(0, 0, 0, 10)).toBeCloseTo(0);
    expect(angleToward(0, 0, 10, 0)).toBeCloseTo(90);
    expect(angleToward(0, 0, 0, -10)).toBeCloseTo(180);
    expect(angleToward(0, 0, -10, 0)).toBeCloseTo(270);
    const [fx, fy] = frontVector({ rot: false, angle: 90 });
    expect(fx).toBeCloseTo(1);
    expect(fy).toBeCloseTo(0);
  });

  it("đồ xoay chéo: 4 góc chân đồ cách tâm đúng nửa đường chéo", async () => {
    const { footCorners } = await import("./placement");
    const half = Math.hypot(200, 100) / 2;
    for (const [x, y] of footCorners({ ...base, angle: 33 })) expect(Math.hypot(x - 200, y - 250)).toBeCloseTo(half, 5);
  });

  it("project trả độ chúi camera: sàn co dọc nhiều → góc chúi nhỏ", () => {
    const flat = project({ quad: [[0.1, 0.5], [0.9, 0.5], [1, 0.62], [0, 0.62]], widthCm: 400, depthCm: 500 }, base, 1000, 1000);
    const steep = project({ quad: [[0.2, 0.3], [0.8, 0.3], [1, 1], [0, 1]], widthCm: 400, depthCm: 500 }, base, 1000, 1000);
    expect(flat.pitchDeg).toBeLessThan(steep.pitchDeg);
    expect(steep.pitchDeg).toBeLessThanOrEqual(59);
  });
});
