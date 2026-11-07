import { DomainError } from "@/domain/errors";
import { fold, keywords, priceText } from "@/domain/text";
import { openIntakes, type Course, type NewCourse } from "./domain";
import type { CourseRepository } from "./repository";

/** Thẻ khoá học gửi cho widget — cùng hình dạng thẻ sản phẩm nên dùng lại giao diện thẻ có sẵn */
export interface CourseCard {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  priceText: string;
  imageUrl: string;
  url: string;
  /** Còn lớp đang tuyển */
  inStock: boolean;
  summary: string;
}

export const toCard = (c: Course, today: string): CourseCard => {
  const next = openIntakes(c, today)[0];
  const meta = [c.level, c.durationWeeks ? `${c.durationWeeks} tuần` : "", next ? `khai giảng ${next.startDate.split("-").reverse().join("/")}` : "chưa có lớp mới"].filter(Boolean).join(" · ");
  return { id: c.id, sku: c.code, name: c.name, category: c.category, price: c.tuition, priceText: priceText(c.tuition), imageUrl: "", url: "", inStock: !!next, summary: meta };
};

export const todayVn = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);

export function makeCourseCatalog(deps: { courses: CourseRepository }) {
  const score = (c: Course, words: string[]) => {
    const name = fold(`${c.name} ${c.code}`);
    const cat = fold(`${c.category} ${c.level} ${c.audience}`);
    const desc = fold(`${c.description} ${c.outcomes}`);
    return words.reduce((s, w) => s + (name.includes(w) ? 3 : 0) + (cat.includes(w) ? 2 : 0) + (desc.includes(w) ? 1 : 0), 0);
  };
  return {
    list: (tenantId: string, f?: { activeOnly?: boolean; search?: string }) => deps.courses.list(tenantId, f),
    get: (tenantId: string, id: string) => deps.courses.findById(tenantId, id),
    async cardsByIds(tenantId: string, ids: string[]) {
      const today = todayVn();
      return (await deps.courses.findManyByIds(tenantId, ids)).filter((c) => c.active).map((c) => toCard(c, today));
    },

    /** Tìm khoá theo mục tiêu/đối tượng/trình độ/ngân sách; ưu tiên khoá đang có lớp tuyển */
    async search(tenantId: string, q: { query?: string; category?: string; maxTuition?: number; mode?: "offline" | "online"; limit?: number }) {
      const today = todayVn();
      const all = await deps.courses.list(tenantId, { activeOnly: true });
      const words = keywords(`${q.query ?? ""} ${q.category ?? ""}`);
      return all
        .filter((c) => !q.maxTuition || (c.tuition > 0 && c.tuition <= q.maxTuition))
        .filter((c) => !q.mode || openIntakes(c, today).some((i) => i.mode === q.mode))
        .map((c) => ({ c, s: score(c, words) }))
        .filter((x) => words.length === 0 || x.s > 0)
        .sort((a, b) => b.s - a.s || Number(openIntakes(b.c, today).length > 0) - Number(openIntakes(a.c, today).length > 0) || a.c.name.localeCompare(b.c.name))
        .slice(0, q.limit ?? 4)
        .map((x) => x.c);
    },

    async categories(tenantId: string) {
      return [...new Set((await deps.courses.list(tenantId, { activeOnly: true })).map((c) => c.category).filter(Boolean))].sort();
    },

    async create(c: NewCourse) {
      validate(c);
      return deps.courses.create(c);
    },
    async update(tenantId: string, id: string, patch: Partial<NewCourse>) {
      validate(patch);
      await deps.courses.update(tenantId, id, patch);
    },
    remove: (tenantId: string, id: string) => deps.courses.delete(tenantId, id),
  };
}

function validate(c: Partial<NewCourse>) {
  if (c.tuition !== undefined && (!Number.isFinite(c.tuition) || c.tuition < 0)) throw new DomainError("BAD_PRICE", "Học phí không hợp lệ");
  if (c.durationWeeks !== undefined && (c.durationWeeks < 0 || c.durationWeeks > 520)) throw new DomainError("BAD_DURATION", "Thời lượng không hợp lệ");
}

export type CourseCatalog = ReturnType<typeof makeCourseCatalog>;
