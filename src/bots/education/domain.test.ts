import { describe, expect, it } from "vitest";
import { DomainError } from "@/domain/errors";
import { calculateTuition, intakesToText, openIntakes, parseIntakes, parsePromos, promosToText, type Course } from "./domain";

const promos = parsePromos("early|Đăng ký sớm|10|2026-12-31\ngroup|Học nhóm|15|3");
const base = { tuition: 10_000_000, promos };

describe("học phí & ưu đãi", () => {
  it("đăng ký sớm còn hạn → giảm 10%, chỉ áp một ưu đãi tốt nhất", () => {
    const r = calculateTuition(base, { today: "2026-12-01" });
    expect(r).toMatchObject({ discountPercent: 10, perPerson: 9_000_000, total: 9_000_000, discountLabel: "Đăng ký sớm" });
  });

  it("3 người: nhóm 15% thắng sớm 10%, không cộng dồn", () => {
    const r = calculateTuition(base, { today: "2026-12-01", people: 3 });
    expect(r.discountPercent).toBe(15);
    expect(r.total).toBe(3 * 8_500_000);
    expect(r.discount).toBe(3 * 1_500_000);
    expect(r.notes.join(" ")).toMatch(/không cộng dồn/);
  });

  it("hết hạn đăng ký sớm → giá gốc và có ghi chú; 1 người không được ưu đãi nhóm", () => {
    const r = calculateTuition(base, { today: "2027-01-02" });
    expect(r.discountPercent).toBe(0);
    expect(r.total).toBe(10_000_000);
    expect(r.notes.join(" ")).toMatch(/hết hạn/);
    expect(r.notes.join(" ")).toMatch(/từ 3 người/);
  });

  it("trả góp: làm tròn lên mỗi kỳ", () => {
    const r = calculateTuition({ tuition: 10_000_000, promos: [] }, { today: "2026-12-01", installments: 3 });
    expect(r.perInstallment).toBe(3_333_334);
  });

  it("đầu vào sai → lỗi rõ ràng", () => {
    expect(() => calculateTuition(base, { today: "2026-12-01", people: 0 })).toThrow(DomainError);
    expect(() => calculateTuition(base, { today: "2026-12-01", installments: 1 })).toThrow(DomainError);
    expect(() => calculateTuition({ tuition: 0, promos: [] }, { today: "2026-12-01" })).toThrow(/học phí/);
  });
});

describe("lớp khai giảng", () => {
  const course: Pick<Course, "intakes"> = {
    intakes: parseIntakes("2026-12-20|T7 08:00|offline|Q1|5\n2026-12-05|T2-T4 18:30|online||0\n2026-12-01|T3-T5 19:00|offline|Q3|8\n2026-11-01|cũ|offline||9"),
  };

  it("chỉ lấy lớp còn chỗ, chưa quá muộn, sớm nhất trước", () => {
    expect(openIntakes(course, "2026-12-03").map((i) => i.startDate)).toEqual(["2026-12-01", "2026-12-20"]);
  });

  it("form admin: parse hai chiều và báo lỗi định dạng", () => {
    const list = parseIntakes("2026-12-01|T2-T4-T6 18:30|offline|Quận 1|12");
    expect(parseIntakes(intakesToText(list))).toEqual(list);
    expect(parsePromos(promosToText(promos))).toEqual(promos);
    expect(() => parseIntakes("sai dinh dang")).toThrow(DomainError);
    expect(() => parsePromos("lạ|x|1|2")).toThrow(DomainError);
  });
});
