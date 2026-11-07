import { describe, expect, it } from "vitest";
import { demoCourses } from "./demo";
import type { Course } from "./domain";
import { bandRange, planPathway } from "./pathway";
import { PLACEMENT_SIZE, gradePlacement, publicQuestions } from "./placement";

const today = "2026-11-07";
const courses: Course[] = demoCourses(today).map((c, i) => ({ ...c, id: `c${i}`, tenantId: "t", createdAt: new Date() }));

describe("band của khoá", () => {
  it.each([
    ["Mất gốc → 4.5", { from: 0, to: 4.5 }],
    ["5.0 → 6.5", { from: 5, to: 6.5 }],
    ["4.5 -> 5.5", { from: 4.5, to: 5.5 }],
    ["6-8 tuổi, chưa học", null],
    ["Mất gốc → giao tiếp tự tin", null],
  ])("%s", (level, want) => expect(bandRange(level)).toEqual(want));
});

describe("lộ trình IELTS", () => {
  it("mất gốc → 6.5: chuỗi khoá nối tiếp, ngày sau không trước ngày trước, cộng đúng học phí", () => {
    const p = planPathway(courses, { current: 0, target: 6.5, today });
    expect(p.steps.map((s) => s.code)).toEqual(["IELTS-F", "IELTS-PRE", "IELTS-65"]);
    expect(p.reachesTarget).toBe(true);
    for (let i = 1; i < p.steps.length; i++) expect(p.steps[i].start >= p.steps[i - 1].end).toBe(true);
    expect(p.totalTuition).toBe(p.steps.reduce((s, x) => s + x.tuition, 0));
    expect(p.finishDate).toBe(p.steps.at(-1)!.end);
  });

  it("5.0 → 6.5 chỉ cần một khoá; có ngày thi gần thì báo không kịp", () => {
    const p = planPathway(courses, { current: 5, target: 6.5, today, examDate: "2027-01-15" });
    expect(p.steps).toHaveLength(1);
    expect(p.onTime).toBe(false);
    expect(p.notes.join(" ")).toContain("dời ngày thi");
  });

  it("mục tiêu vượt khoá cao nhất: báo chưa tới mục tiêu", () => {
    const p = planPathway(courses, { current: 6.5, target: 8.5, today });
    expect(p.reachesTarget).toBe(false);
    expect(p.reached).toBe(7.5);
  });

  it("đầu vào không hợp lệ", () => {
    expect(() => planPathway(courses, { current: 6, target: 5, today })).toThrow();
    expect(() => planPathway(courses, { current: 4.3, target: 6, today })).toThrow();
  });
});

describe("test xếp lớp", () => {
  const all = (pick: (level: string, i: number) => number) => Object.fromEntries(publicQuestions().map((q, i) => [q.id, pick(q.level, i)]));
  it("không gửi đáp án xuống trình duyệt", () => {
    expect(publicQuestions()[0]).not.toHaveProperty("answer");
    expect(publicQuestions()).toHaveLength(PLACEMENT_SIZE);
  });
  it("làm đúng A1–B1, sai B2–C1 → B1 ≈ band 5", () => {
    // Đáp án đúng của bộ câu hỏi: lấy bằng cách thử từng phương án
    const correct: Record<string, number> = {};
    for (const q of publicQuestions()) {
      for (let o = 0; o < q.options.length; o++) {
        const r = gradePlacement({ ...all(() => 9), [q.id]: o });
        if (r.correct === 1) correct[q.id] = o;
      }
    }
    const answers = Object.fromEntries(publicQuestions().map((q) => [q.id, ["A1", "A2", "B1"].includes(q.level) ? correct[q.id] : (correct[q.id] + 1) % 4]));
    const r = gradePlacement(answers);
    expect(r.cefr).toBe("B1");
    expect(r.band).toBe(5);
  });
  it("đúng câu khó nhưng sai câu dễ không được tính cấp cao", () => {
    const r = gradePlacement(all(() => 9));
    expect(r.cefr).toBe("Pre-A1");
    expect(r.band).toBe(2.5);
  });
  it("chọn cùng một chữ cái cho mọi câu không vượt quá A1", () => {
    for (const k of [0, 1, 2, 3]) expect(["Pre-A1", "A1"]).toContain(gradePlacement(all(() => k)).cefr);
  });
  it("làm thiếu câu thì báo lỗi", () => {
    expect(() => gradePlacement({ "a1-1": 1 })).toThrow();
  });
});
