import { describe, expect, it } from "vitest";
import { checkGrounding, collectAmounts, extractAmounts, extractSkuLike } from "./use-cases/grounding";

describe("extractAmounts", () => {
  it("đọc các cách viết tiền phổ biến", () => {
    expect(extractAmounts("Giá 245.000 ₫/m², tổng 6.102.000đ")).toEqual([245_000, 6_102_000]);
    expect(extractAmounts("khoảng 6,1 triệu, ngân sách 300k, keo 180.000 VND")).toEqual([6_100_000, 300_000, 180_000]);
    expect(extractAmounts("1.5tr hoặc 250 nghìn")).toEqual([1_500_000, 250_000]);
  });

  it("bỏ qua số không phải tiền", () => {
    expect(extractAmounts("Phòng 4x5 m, 20 m², 18 thùng, gạch 60x60")).toEqual([]);
  });
});

describe("checkGrounding", () => {
  const facts = { amounts: new Set([245_000, 6_102_000]), skus: new Set(["VD-6060-TR"]) };

  it("chấp nhận số có trong dữ liệu và số làm tròn trong 2%", () => {
    expect(checkGrounding("Mẫu VD-6060-TR giá 245.000 ₫/m², tổng khoảng 6,1 triệu", facts).ok).toBe(true);
  });

  it("bắt số tiền và mã sản phẩm bịa", () => {
    const r = checkGrounding("Mẫu XX-9999 đang giảm còn 199.000 ₫", facts);
    expect(r.ok).toBe(false);
    expect(r.unknownAmounts).toEqual([199_000]);
    expect(r.unknownSkus).toEqual(["XX-9999"]);
  });

  it("gom số từ kết quả tool lồng nhau", () => {
    const s = new Set<number>();
    collectAmounts({ total: "5.481.000 ₫", lines: ["Keo: 4 bao = 720.000 ₫"], price: 210_000, boxes: 18 }, s);
    expect([...s].sort((a, b) => a - b)).toEqual([210_000, 720_000, 5_481_000]);
  });

  it("nhận diện SKU", () => {
    expect(extractSkuLike("mẫu VD-6060-TR và BT-2020-XD, không phải WIFI-ABC")).toEqual(["VD-6060-TR", "BT-2020-XD"]);
  });
});
