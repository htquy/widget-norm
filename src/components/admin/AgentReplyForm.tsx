"use client";

import { useT } from "@/lib/i18n/client";
import { useActionState, useEffect, useRef } from "react";
import { agentReplyAction } from "@/app/admin/actions";
import { btnPrimary, fieldCls } from "./ui";

export function AgentReplyForm({ id }: { id: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(agentReplyAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="agent-text" className="sr-only">
        {t("Trả lời khách")}
      </label>
      <textarea
        id="agent-text"
        name="text"
        rows={3}
        required
        maxLength={2000}
        placeholder={t("Nhập tin nhắn gửi khách…")}
        className={fieldCls}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
        }}
      />
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btnPrimary}>
          {pending ? t("Đang gửi…") : t("Gửi cho khách")}
        </button>
        <span className="text-[12px] text-[var(--fg-muted)]">{t("Ctrl + Enter để gửi")}</span>
      </div>
      {state?.error && (
        <p role="alert" className="text-[13px] text-[var(--danger)]">
          {state.error}
        </p>
      )}
    </form>
  );
}
