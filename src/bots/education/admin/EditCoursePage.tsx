import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { Card, PageHeader, btnSecondary } from "@/components/admin/ui";
import { deleteCourseAction } from "./actions";
import { CourseForm } from "./CourseForm";

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getT();
  const s = await requireSession();
  const { id } = await params;
  const c = await (await app()).courseCatalog.get(s.tenantId, id);
  if (!c) notFound();
  return (
    <>
      <PageHeader
        title={c.name}
        subtitle={c.code}
        actions={
          <Link href="/admin/courses" className={btnSecondary}>
            {t("← Danh sách")}
          </Link>
        }
      />
      <Card>
        <CourseForm
          course={{
            id: c.id,
            code: c.code,
            name: c.name,
            category: c.category,
            level: c.level,
            audience: c.audience,
            durationWeeks: c.durationWeeks,
            sessionsPerWeek: c.sessionsPerWeek,
            tuition: c.tuition,
            description: c.description,
            outcomes: c.outcomes,
            active: c.active,
            intakes: c.intakes,
            promos: c.promos,
          }}
        />
      </Card>
      <form action={deleteCourseAction} className="mt-4">
        <input type="hidden" name="id" value={c.id} />
        <button className="min-h-10 text-[14px] text-[var(--danger)] underline">Xoá khoá học này</button>
      </form>
    </>
  );
}
