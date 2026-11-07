import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { checkFit, orderTotals, parseRooms } from "./domain";

const sofa = { widthCm: 210, depthCm: 90, heightCm: 82 };

describe("kiểm tra đặt vừa", () => {
  it("vừa thẳng, còn lối đi", () => {
    const r = checkFit(sofa, { widthCm: 400, depthCm: 300 });
    expect(r).toMatchObject({ fits: true, orientation: "as_is", leftoverWidthCm: 190, leftoverDepthCm: 210, walkwayOk: true });
  });

  it("chỉ vừa khi xoay 90° → báo cần xoay", () => {
    const r = checkFit(sofa, { widthCm: 100, depthCm: 230 });
    expect(r).toMatchObject({ fits: true, orientation: "rotated" });
    expect(r.notes.join(" ")).toMatch(/xoay/);
  });

  it("lớn hơn khoảng trống kể cả khi xoay → không vừa, có lý do", () => {
    const r = checkFit(sofa, { widthCm: 180, depthCm: 80 });
    expect(r.fits).toBe(false);
    expect(r.notes.join(" ")).toMatch(/lớn hơn/);
  });

  it("vừa nhưng chật không còn lối đi; trần thấp hơn món → không vừa", () => {
    expect(checkFit(sofa, { widthCm: 220, depthCm: 100 }).walkwayOk).toBe(false);
    expect(checkFit({ ...sofa, heightCm: 220 }, { widthCm: 400, depthCm: 300, heightCm: 200 }).fits).toBe(false);
  });

  it("kích thước vô lý → lỗi", () => {
    expect(() => checkFit(sofa, { widthCm: 0, depthCm: 300 })).toThrow(DomainError);
  });
});

describe("tạm tính đơn", () => {
  const a = { sku: "A", name: "Sofa", price: 12_900_000, stock: 6, active: true };
  const b = { sku: "B", name: "Ghế", price: 1_150_000, stock: 2, active: true };

  it("cộng theo số lượng và cảnh báo tồn kho", () => {
    const r = orderTotals([{ item: a, quantity: 1 }, { item: b, quantity: 4 }]);
    expect(r.subtotal).toBe(12_900_000 + 4 * 1_150_000);
    expect(r.notes.join(" ")).toMatch(/chỉ còn 2/);
    expect(r.notes.join(" ")).toMatch(/vận chuyển/);
  });

  it("món ngừng bán, giá 0, số lượng lẻ, đơn rỗng → lỗi", () => {
    expect(() => orderTotals([{ item: { ...a, active: false }, quantity: 1 }])).toThrow(DomainError);
    expect(() => orderTotals([{ item: { ...a, price: 0 }, quantity: 1 }])).toThrow(DomainError);
    expect(() => orderTotals([{ item: a, quantity: 1.5 }])).toThrow(DomainError);
    expect(() => orderTotals([])).toThrow(DomainError);
  });

  it("parseRooms nhận cả mã lẫn nhãn tiếng Việt", () => {
    expect(parseRooms("living, Phòng ngủ; xxx")).toEqual(["living", "bedroom"]);
  });
});
