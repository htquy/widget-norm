"use client";

import { useLocale, useT } from "@/lib/i18n/client";
import { useActionState } from "react";
import { createBotAction } from "@/app/admin/actions";
import { submitWith } from "./form";
import { Status } from "./LeadEditForm";
import { Field, btnPrimary, fieldCls } from "./ui";

export function CreateBotForm({ kinds }: { kinds: { kind: string; name: string; tagline: string }[] }) {
  const t = useT();
  const locale = useLocale();
  const [state, action, pending] = useActionState(createBotAction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-[14px] font-medium">{t("Loại chatbot")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {kinds.map((k, i) => (
            <label key={k.kind} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-[var(--border)] p-3 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-brand-50">
              <input type="radio" name="kind" value={k.kind} defaultChecked={i === 0} className="mt-1" />
              <span>
                <span className="block text-[14px] font-semibold">{k.name}</span>
                <span className="block text-[13px] text-[var(--fg-muted)]">{k.tagline}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t("Tên cửa hàng")}>
        <input name="shopName" required maxLength={80} className={fieldCls} />
      </Field>
      <Field label={t("Ngôn ngữ chatbot")}>
        <select name="language" defaultValue={locale} className={fieldCls}>
          <option value="vi">Tiếng Việt</option>
          <option value="en">English</option>
        </select>
      </Field>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btnPrimary}>
          {pending ? t("Đang tạo…") : t("Tạo chatbot")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
