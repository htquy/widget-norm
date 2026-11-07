import { and, eq, ilike, inArray, or } from "drizzle-orm";
import type { DB } from "@/infrastructure/db/client";
import { courses } from "@/infrastructure/db/schema";
import type { Course, NewCourse } from "./domain";

/** Repository schema `education` — chỉ module education dùng */
export interface CourseRepository {
  list(tenantId: string, f?: { activeOnly?: boolean; search?: string }): Promise<Course[]>;
  findById(tenantId: string, id: string): Promise<Course | null>;
  findManyByIds(tenantId: string, ids: string[]): Promise<Course[]>;
  create(c: NewCourse): Promise<Course>;
  update(tenantId: string, id: string, patch: Partial<NewCourse>): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export const courseRepo = (db: DB): CourseRepository => ({
  async list(tenantId, f = {}) {
    const conds = [eq(courses.tenantId, tenantId)];
    if (f.activeOnly) conds.push(eq(courses.active, true));
    if (f.search) {
      const q = `%${f.search}%`;
      conds.push(or(ilike(courses.name, q), ilike(courses.code, q), ilike(courses.category, q))!);
    }
    return db.select().from(courses).where(and(...conds)).orderBy(courses.category, courses.name);
  },
  async findById(tenantId, id) {
    const [r] = await db.select().from(courses).where(and(eq(courses.tenantId, tenantId), eq(courses.id, id))).limit(1);
    return r ?? null;
  },
  async findManyByIds(tenantId, ids) {
    if (ids.length === 0) return [];
    const rows = await db.select().from(courses).where(and(eq(courses.tenantId, tenantId), inArray(courses.id, ids)));
    return ids.map((id) => rows.find((c) => c.id === id)).filter((c): c is (typeof rows)[number] => !!c);
  },
  async create(c) {
    const [r] = await db.insert(courses).values({ ...c, id: crypto.randomUUID() }).returning();
    return r;
  },
  async update(tenantId, id, patch) {
    await db.update(courses).set(patch).where(and(eq(courses.tenantId, tenantId), eq(courses.id, id)));
  },
  async delete(tenantId, id) {
    await db.delete(courses).where(and(eq(courses.tenantId, tenantId), eq(courses.id, id)));
  },
});
