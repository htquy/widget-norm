import { describe, expect, it } from "vitest";
import { furnitureSvg } from "./art";
import { DEMO_FURNITURE } from "./demo";
import { colorHex, designRoomSet, paletteScore, styleFromText, styleScore } from "./design";
import { NO_ASSETS, type FurnitureItem } from "./domain";

const catalog: FurnitureItem[] = DEMO_FURNITURE.map((d, i) => ({ ...NO_ASSETS, ...d, id: `i${i}`, tenantId: "t", imageUrl: "", active: true, createdAt: new Date() }));
const by = (sku: string) => catalog.find((i) => i.sku === sku)!;

describe("phong cách và màu", () => {
  it("nhận phong cách từ chữ của shop", () => {
    expect(styleFromText("Bắc Âu")).toBe("scandinavian");
    expect(styleFromText("phong cách Đông Dương")).toBe("indochine");
    expect(styleFromText("abc")).toBeUndefined();
  });
  it("chấm điểm phong cách: đúng 2, họ gần 1, lệch 0", () => {
    expect(styleScore(by("SF-2-JP"), "japandi")).toBe(2);
    expect(styleScore(by("SF-L3-XAM"), "japandi")).toBe(1);
    expect(styleScore(by("SF-3-IND"), "modern")).toBe(0);
  });
  it("màu tên tiếng Việt và bảng màu ảnh", () => {
    expect(colorHex("xám ghi")).toBe("#8d8f91");
    expect(paletteScore({ color: "xám ghi" }, ["#8a8c8e"])).toBe(2);
    expect(paletteScore({ color: "đỏ" }, ["#f2f0ec"])).toBe(0);
  });
});

describe("gợi ý trọn bộ theo phòng", () => {
  it("phòng khách Japandi: mỗi danh mục một món đúng phong cách, có tổng và % sàn", () => {
    const r = designRoomSet(catalog, { room: "living", style: "japandi", roomWidthCm: 400, roomDepthCm: 500 });
    const cats = r.picks.map((p) => p.category);
    expect(cats).toContain("Sofa");
    expect(cats).toContain("Bàn trà");
    expect(r.picks.find((p) => p.category === "Sofa")!.item.sku).toBe("SF-2-JP");
    expect(r.picks.find((p) => p.category === "Bàn trà")!.item.sku).toBe("BTR-JP");
    expect(r.subtotal).toBe(r.picks.reduce((s, p) => s + p.total, 0));
    expect(r.coveragePercent).toBeGreaterThan(0);
    expect(r.coveragePercent).toBeLessThan(40);
  });

  it("không gợi ý món khách đã có; ghế ăn theo số người", () => {
    const r = designRoomSet(catalog, { room: "dining", seats: 6, existing: ["Bàn ăn"] });
    expect(r.picks.map((p) => p.category)).toEqual(["Ghế ăn"]);
    expect(r.picks[0].quantity).toBe(6);
    expect(r.skipped[0]).toContain("đã có");
  });

  it("tôn trọng ngân sách: không vượt, báo danh mục vượt ngân sách", () => {
    const r = designRoomSet(catalog, { room: "living", budget: 8_000_000 });
    expect(r.subtotal).toBeLessThanOrEqual(8_000_000);
    expect(r.skipped.some((s) => s.startsWith("Sofa"))).toBe(true);
  });

  it("phòng nhỏ: loại món không vừa, cảnh báo bàn ăn không đủ chỗ kéo ghế", () => {
    const r = designRoomSet(catalog, { room: "dining", roomWidthCm: 220, roomDepthCm: 220 });
    const table = r.picks.find((p) => p.category === "Bàn ăn");
    expect(table?.item.sku).toBe("BA-4-TRON");
    expect(r.notes.join(" ")).toContain("kéo ghế");
  });

  it("phòng kín đồ: cảnh báo chiếm quá 40% sàn", () => {
    const r = designRoomSet(catalog, { room: "bedroom", roomWidthCm: 300, roomDepthCm: 320 });
    expect(r.coveragePercent).toBeGreaterThan(40);
    expect(r.notes.join(" ")).toContain("40%");
  });

  it("ngân sách / phòng không hợp lệ", () => {
    expect(() => designRoomSet(catalog, { room: "living", budget: -1 })).toThrow();
    expect(() => designRoomSet(catalog, { room: "living", roomWidthCm: 50, roomDepthCm: 400 })).toThrow();
  });
});

describe("hình minh hoạ", () => {
  it("viewBox đúng tỉ lệ rộng × cao thật", () => {
    const svg = furnitureSvg(by("SF-L3-XAM"));
    expect(svg).toContain('viewBox="0 0 210 82"');
  });
});

describe("màu nhuộm mô hình 3D", async () => {
  const { colorTint } = await import("./design");
  it("một màu nhận ra được → mã màu; nhiều màu hoặc màu lạ → giữ màu gốc của mô hình", () => {
    expect(colorTint("xám ghi")).toBe("#8d8f91");
    expect(colorTint("nâu óc chó")).toBe("#5b3d2b");
    expect(colorTint("trắng - đen")).toBeNull();
    expect(colorTint("xám / trắng")).toBeNull();
    expect(colorTint("hồng phấn lạ")).not.toBe("#9b8f80");
    expect(colorTint("màu lạ hoắc")).toBeNull();
  });
});
