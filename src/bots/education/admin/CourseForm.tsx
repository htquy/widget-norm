"use client";

import { useT } from "@/lib/i18n/client";
import { useActionState } from "react";
import { submitWith } from "@/components/admin/form";
import { Status } from "@/components/admin/LeadEditForm";
import { Field, btnPrimary, fieldCls } from "@/components/admin/ui";
import { intakesToText, promosToText, type Intake, type Promo } from "../domain";
import { saveCourseAction } from "./actions";

export interface CourseFormValue {
  id: string;
  code: string;
  name: string;
  category: string;
  level: string;
  audience: string;
  durationWeeks: number;
  sessionsPerWeek: number;
  tuition: number;
  description: string;
  outcomes: string;
  active: boolean;
  intakes: Intake[];
  promos: Promo[];
}

export function CourseForm({ course }: { course?: CourseFormValue }) {
  const t = useT();
  const [state, action, pending] = useActionState(saveCourseAction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="grid gap-4 sm:grid-cols-2">
      {course && <input type="hidden" name="id" value={course.id} />}
      <Field label={t("Tên khoá học")}>
        <input name="name" required defaultValue={course?.name} className={fieldCls} />
      </Field>
      <Field label={t("Mã khoá")} hint={t("Không trùng; bot dùng để đối chiếu")}>
        <input name="code" required defaultValue={course?.code} className={`${fieldCls} font-mono`} />
      </Field>
      <Field label={t("Nhóm khoá")} hint={t("IELTS, Giao tiếp, Thiếu nhi, Tin học…")}>
        <input name="category" defaultValue={course?.category} className={fieldCls} />
      </Field>
      <Field label={t("Học phí cả khoá (VND)")}>
        <input name="tuition" inputMode="numeric" defaultValue={course?.tuition ?? 0} className={fieldCls} />
      </Field>
      <Field label={t("Trình độ (đầu vào → đầu ra)")} hint={t("Ví dụ: Mất gốc → 4.5")}>
        <input name="level" defaultValue={course?.level} className={fieldCls} />
      </Field>
      <Field label={t("Đối tượng")}>
        <input name="audience" defaultValue={course?.audience} placeholder={t("Học sinh THPT, người đi làm…")} className={fieldCls} />
      </Field>
      <Field label={t("Số tuần")}>
        <input name="durationWeeks" type="number" min={0} max={520} defaultValue={course?.durationWeeks ?? 0} className={fieldCls} />
      </Field>
      <Field label={t("Số buổi/tuần")}>
        <input name="sessionsPerWeek" type="number" min={0} max={14} defaultValue={course?.sessionsPerWeek ?? 0} className={fieldCls} />
      </Field>
      <Field label={t("Mô tả cho bot tư vấn")} hint={t("Nội dung, giáo trình, sĩ số, giáo viên… Càng rõ bot tư vấn càng đúng.")} className="sm:col-span-2">
        <textarea name="description" rows={5} maxLength={4000} defaultValue={course?.description} className={fieldCls} />
      </Field>
      <Field label={t("Cam kết đầu ra")} hint={t("Chỉ ghi điều trung tâm thực sự cam kết — bot chỉ nhắc lại đúng nội dung này")} className="sm:col-span-2">
        <textarea name="outcomes" rows={2} maxLength={1000} defaultValue={course?.outcomes} className={fieldCls} />
      </Field>
      <Field label={t("Các đợt khai giảng (mỗi dòng một lớp)")} hint={t("Định dạng: ngày|lịch học|offline hoặc online|cơ sở|số chỗ còn. Ví dụ: 2026-12-01|T2-T4-T6 18:30-20:30|offline|Quận 1|12")} className="sm:col-span-2">
        <textarea name="intakes" rows={4} defaultValue={course ? intakesToText(course.intakes) : ""} className={`${fieldCls} font-mono`} />
      </Field>
      <Field label={t("Ưu đãi (mỗi dòng một ưu đãi)")} hint={t("early|Đăng ký sớm|10|2026-12-31 (giảm % nếu đăng ký đến ngày) · group|Học nhóm|10|3 (giảm % từ 3 người). Mỗi lần chỉ áp một ưu đãi tốt nhất.")} className="sm:col-span-2">
        <textarea name="promos" rows={3} defaultValue={course ? promosToText(course.promos) : ""} className={`${fieldCls} font-mono`} />
      </Field>
      <label className="flex min-h-10 items-center gap-2 text-[14px] sm:col-span-2">
        <input type="checkbox" name="active" defaultChecked={course?.active ?? true} className="h-4 w-4" /> {t("Đang tuyển sinh (hiển thị cho bot)")}
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={btnPrimary}>
          {pending ? t("Đang lưu…") : t("Lưu khoá học")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
