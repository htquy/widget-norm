import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { formatVnd } from "@/domain/text";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { Badge, Card, Empty, PageHeader, btnPrimary } from "@/components/admin/ui";
import { todayVn } from "../catalog";
import { openIntakes } from "../domain";
import { toggleCourseAction } from "./actions";

export default async function CoursesPage() {
  const { t } = await getT();
  const s = await requireSession();
  const courses = await (await app()).courseCatalog.list(s.tenantId);
  const today = todayVn();
  return (
    <>
      <PageHeader
        title={t("Khoá học")}
        subtitle={t("Bot chỉ tư vấn khoá đang tuyển sinh, lịch khai giảng và số chỗ còn lại theo danh sách này")}
        actions={
          <Link href="/admin/courses/new" className={btnPrimary}>
            {t("+ Thêm khoá học")}
          </Link>
        }
      />
      {courses.length === 0 ? (
        <Empty>{t("Chưa có khoá học nào. Thêm khoá đầu tiên để bot bắt đầu tư vấn.")}</Empty>
      ) : (
        <Card>
          <ul className="divide-y divide-[var(--border)]">
            {courses.map((c) => {
              const open = openIntakes(c, today);
              const seats = open.reduce((n, i) => n + i.seatsLeft, 0);
              return (
                <li key={c.id} className={`flex flex-wrap items-center gap-3 py-3 ${c.active ? "" : "opacity-60"}`}>
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/courses/${c.id}`} className="font-medium underline-offset-2 hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-[13px] text-[var(--fg-muted)]">
                      {c.code} · {c.category || t("Chưa phân nhóm")} · {formatVnd(c.tuition)} · {open.length} lớp tuyển / {seats} chỗ
                    </p>
                  </div>
                  {open.length === 0 && c.active && <Badge tone="amber">{t("Chưa có lớp")}</Badge>}
                  <form action={toggleCourseAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="active" value={String(!c.active)} />
                    <button className="min-h-10 text-[13px] underline">{c.active ? t("Ngừng tuyển") : t("Mở lại")}</button>
                  </form>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
