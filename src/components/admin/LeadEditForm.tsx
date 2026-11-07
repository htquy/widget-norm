"use client";

import { useT } from "@/lib/i18n/client";
import { useActionState } from "react";
import { updateLeadAction } from "@/app/admin/actions";
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/domain/lead";
import { submitWith } from "./form";
import { Field, btnPrimary, fieldCls } from "./ui";

export function LeadEditForm({ lead }: { lead: { id: string; status: LeadStatus; note: string; wonValue: number | null } }) {
  const t = useT();
  const [state, action, pending] = useActionState(updateLeadAction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-3">
      <input type="hidden" name="id" value={lead.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Trạng thái")}>
          <select name="status" defaultValue={lead.status} className={fieldCls}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(LEAD_STATUS_LABELS[s])}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Giá trị đơn khi chốt (VND)")}>
          <input name="wonValue" inputMode="numeric" defaultValue={lead.wonValue ?? ""} className={fieldCls} />
        </Field>
      </div>
      <Field label={t("Ghi chú")}>
        <textarea name="note" rows={5} defaultValue={lead.note} className={fieldCls} />
      </Field>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btnPrimary}>
          {pending ? t("Đang lưu…") : t("Lưu")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function Status({ state }: { state: { error?: string; message?: string } | undefined }) {
  if (state?.error)
    return (
      <p role="alert" className="text-[14px] text-[var(--danger)]">
        {state.error}
      </p>
    );
  if (state?.message)
    return (
      <p role="status" className="text-[14px] text-[var(--success)]">
        {state.message}
      </p>
    );
  return null;
}
