"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { DomainError } from "@/domain/errors";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { parseIntakes, parsePromos } from "../domain";

export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;

const fail = (e: unknown): ActionState => {
  if (e instanceof DomainError) return { error: e.message };
  if (e instanceof z.ZodError) return { error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  if (e instanceof Error && /courses_tenant_code|duplicate key/.test(e.message)) return { error: "Mã khoá đã tồn tại" };
  console.error(e);
  return { error: "Có lỗi xảy ra" };
};

/** Chỉ bot loại "education" dùng các thao tác này */
async function eduTenant() {
  const s = await requireSession();
  const c = await app();
  const t = await c.tenants.byId(s.tenantId);
  if (!t || t.kind !== "education") throw new DomainError("WRONG_KIND", "Chatbot này không phải bot đào tạo");
  return { s, c };
}

const courseSchema = z.object({
  code: z.string().trim().min(1, "Nhập mã khoá").max(30),
  name: z.string().trim().min(1, "Nhập tên khoá").max(160),
  category: z.string().trim().max(80).default(""),
  level: z.string().trim().max(120).default(""),
  audience: z.string().trim().max(160).default(""),
  durationWeeks: z.coerce.number().int().min(0).max(520).default(0),
  sessionsPerWeek: z.coerce.number().int().min(0).max(14).default(0),
  tuition: z.string().default("0"),
  description: z.string().max(4000).default(""),
  outcomes: z.string().max(1000).default(""),
  intakes: z.string().max(4000).default(""),
  promos: z.string().max(2000).default(""),
});

export async function saveCourseAction(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("id") ?? "");
  try {
    const { s, c } = await eduTenant();
    const d = courseSchema.parse(Object.fromEntries(form));
    const data = {
      code: d.code,
      name: d.name,
      category: d.category,
      level: d.level,
      audience: d.audience,
      durationWeeks: d.durationWeeks,
      sessionsPerWeek: d.sessionsPerWeek,
      tuition: Number(d.tuition.replace(/[^\d]/g, "") || 0),
      description: d.description,
      outcomes: d.outcomes,
      active: form.get("active") === "on",
      intakes: parseIntakes(d.intakes),
      promos: parsePromos(d.promos),
    };
    if (id) await c.courseCatalog.update(s.tenantId, id, data);
    else await c.courseCatalog.create({ ...data, tenantId: s.tenantId });
    revalidatePath("/admin/courses");
  } catch (e) {
    return fail(e);
  }
  redirect("/admin/courses");
}

export async function deleteCourseAction(form: FormData) {
  const { s, c } = await eduTenant();
  await c.courseCatalog.remove(s.tenantId, z.string().uuid().parse(form.get("id")));
  revalidatePath("/admin/courses");
  redirect("/admin/courses");
}

export async function toggleCourseAction(form: FormData) {
  const { s, c } = await eduTenant();
  await c.courseCatalog.update(s.tenantId, z.string().uuid().parse(form.get("id")), { active: form.get("active") === "true" });
  revalidatePath("/admin/courses");
}
