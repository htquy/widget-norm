import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Card, PageHeader, btnSecondary } from "@/components/admin/ui";
import { CourseForm } from "./CourseForm";

export default async function NewCoursePage() {
  const { t } = await getT();
  return (
    <>
      <PageHeader
        title="Thêm khoá học"
        actions={
          <Link href="/admin/courses" className={btnSecondary}>
            {t("← Danh sách")}
          </Link>
        }
      />
      <Card>
        <CourseForm />
      </Card>
    </>
  );
}
