import { describe, expect, it } from "vitest";
import { DEFAULT_TILE_SETTINGS } from "../repository";
import { parseMeasures, detectSurface } from "../rules";
import { DEFAULT_WASTE_PERCENT, calculateQuote, effectiveWastePercent, resolveAreaM2, roofAreaFromFootprint, wasteFor } from "./quote";
import { isRoofTile, isSurfaceKind, piecesPerM2, sellUnit, type Tile } from "./tile";

const pricing = DEFAULT_TILE_SETTINGS.pricing;
const roofTile: Tile = {
  id: "t",
  tenantId: "x",
  sku: "NG-22-DO",
  name: "Ngói 22",
  widthMm: 200,
  heightMm: 227,
  thicknessMm: 12,
  piecesPerBox: 1,
  pricePerM2: 198_000,
  finish: "textured",
  usage: ["roof"],
  style: "",
  color: "",
  textureUrl: "/t.svg",
  description: "",
  images: [],
  stock: 100,
  active: true,
  createdAt: new Date(),
};
const floor6060: Tile = { ...roofTile, sku: "F60", usage: ["floor"], widthMm: 600, heightMm: 600, piecesPerBox: 4, thicknessMm: 9, finish: "matte" };
const opts = { pattern: "straight" as const, groutWidthMm: 2, groutColor: "xám", includeAdhesive: true, includeGrout: true };

describe("bề mặt mới", () => {
  it("nhận diện loại bề mặt", () => {
    expect(isSurfaceKind("roof")).toBe(true);
    expect(isSurfaceKind("outdoor")).toBe(true);
    expect(isSurfaceKind("ceiling")).toBe(false);
  });

  it("ngói: ~22 viên/m², báo giá theo viên, không keo dán/keo ron", () => {
    expect(isRoofTile(roofTile)).toBe(true);
    expect(sellUnit(roofTile)).toBe("viên");
    expect(piecesPerM2(roofTile)).toBeCloseTo(22, 0);
    const q = calculateQuote(roofTile, [{ label: "Mái", areaM2: 40 }], opts, pricing);
    expect(q.lines).toHaveLength(1);
    expect(q.unit).toBe("viên");
    expect(q.lines[0]).toMatchObject({ unit: "viên" });
    // 40 m² × 1,05 hao hụt ÷ 0,0454 m²/viên → 926 viên
    expect(q.boxes).toBe(Math.ceil((40 * 1.05) / ((200 * 227) / 1e6)));
    // Tổng = số viên × diện tích viên × giá/m² (không lệch do làm tròn diện tích)
    expect(q.total).toBe(Math.round(q.boxes * 0.0454 * 198_000));
    expect(q.notes?.some((n) => n.includes("ngói nóc"))).toBe(true);
  });

  it("gạch ốp lát thường vẫn tính thùng + keo + ron", () => {
    const q = calculateQuote(floor6060, [{ label: "Sàn", areaM2: 20 }], opts, pricing);
    expect(q.lines.map((l) => l.kind)).toEqual(["tile", "adhesive", "grout"]);
    expect(q.unit).toBe("thùng");
    expect(q.lines[0].description).toContain("thùng");
    // 20 × 1,05 / 1,44 = 14,58 → 15 thùng = 60 viên
    expect(q.boxes).toBe(15);
    expect(q.pieces).toBe(60);
  });

  it("kiểu lát chéo: shop cũ chưa lưu % hao hụt → dùng mặc định", () => {
    const old = { ...pricing, wastePercent: { straight: 5, half_offset: 7, third_offset: 7, herringbone: 12 } };
    expect(wasteFor(old.wastePercent, "diagonal")).toBe(DEFAULT_WASTE_PERCENT.diagonal);
    const q = calculateQuote(floor6060, [{ label: "Sàn", areaM2: 10 }], { ...opts, pattern: "diagonal" }, old);
    expect(q.wastePercent).toBe(10);
  });

  it("ngói luôn tính như lát thẳng dù chọn kiểu lát khác", () => {
    const q = calculateQuote(roofTile, [{ label: "Mái", areaM2: 40 }], { ...opts, pattern: "herringbone" }, pricing);
    expect(q.wastePercent).toBe(5);
  });
});

describe("hao hụt thực tế", () => {
  it("viên khổ lớn trên diện tích nhỏ và phòng < 5 m² cộng thêm", () => {
    const big: Tile = { ...floor6060, widthMm: 800, heightMm: 800, piecesPerBox: 3 };
    expect(effectiveWastePercent(big, 12, "straight", pricing).percent).toBe(8);
    expect(effectiveWastePercent(big, 40, "straight", pricing).percent).toBe(5);
    expect(effectiveWastePercent(floor6060, 4, "straight", pricing).percent).toBe(7);
    expect(effectiveWastePercent(floor6060, 20, "straight", pricing).percent).toBe(5);
  });

  it("cảnh báo xương cá với viên vuông, gạch bóng ngoài trời, mẫu không đúng công dụng", () => {
    const glossy: Tile = { ...floor6060, finish: "glossy" };
    const q = calculateQuote(glossy, [{ label: "Sân", areaM2: 20 }], { ...opts, pattern: "herringbone" }, pricing, { surface: "outdoor" });
    const notes = q.notes!.join(" ");
    expect(notes).toContain("xương cá");
    expect(notes).toContain("trơn");
    expect(notes).toContain("không khuyến nghị");
  });
});

describe("diện tích từ kích thước", () => {
  it("sàn dài × rộng, tường 4 mặt × cao trừ cửa, mái theo độ dốc", () => {
    expect(resolveAreaM2({ surface: "floor", lengthM: 4, widthM: 5 }).areaM2).toBe(20);
    expect(resolveAreaM2({ surface: "wall", lengthM: 3, widthM: 2, heightM: 2.5, openingsM2: 2 }).areaM2).toBe(23);
    expect(resolveAreaM2({ surface: "wall", lengthM: 3, heightM: 0.6 }).areaM2).toBe(1.8);
    expect(resolveAreaM2({ surface: "roof", areaM2: 100, roofPitchDeg: 30 }).areaM2).toBeCloseTo(115.47, 1);
    expect(() => resolveAreaM2({ surface: "floor" })).toThrow();
    expect(() => resolveAreaM2({ surface: "wall", areaM2: 5, openingsM2: 6 })).toThrow();
  });

  it("diện tích mái từ mặt bằng và độ dốc", () => {
    expect(roofAreaFromFootprint(100, 0)).toBe(100);
    expect(roofAreaFromFootprint(100, 30)).toBeCloseTo(115.47, 1);
    expect(() => roofAreaFromFootprint(100, 80)).toThrow();
  });
});

describe("bot luật đọc số đo", () => {
  it.each([
    ["phong 4x5", { lengthM: 4, widthM: 5 }],
    ["phong 4m x 5m", { lengthM: 4, widthM: 5 }],
    ["4,5 nhan 6", { lengthM: 4.5, widthM: 6 }],
    ["dai 4 rong 3,5", { lengthM: 4, widthM: 3.5 }],
    ["phong tam 2x1,5x2,7", { lengthM: 2, widthM: 1.5, heightM: 2.7 }],
    ["san 20m2", { areaM2: 20 }],
    ["mai 80m2 doc 30 do", { areaM2: 80, roofPitchDeg: 30 }],
    ["tuong 12 m2 tru cua 2m2", { areaM2: 12, openingsM2: 2 }],
    ["gach 60x60 cho phong 25m2", { areaM2: 25 }],
  ])("%s", (text, want) => {
    expect(parseMeasures(text)).toEqual(want);
  });

  it("nhận bề mặt", () => {
    expect(detectSurface("lop mai ngoi")).toBe("roof");
    expect(detectSurface("lat san vuon")).toBe("outdoor");
    expect(detectSurface("op tuong bep")).toBe("wall");
    expect(detectSurface("lat san phong khach")).toBe("floor");
  });
});
