"use client";

import { useT } from "@/lib/i18n/client";
import { useActionState } from "react";
import { summarizeNeedsAction } from "@/app/admin/actions";
import { Card, btnPrimary } from "./ui";

/** Báo cáo nhu cầu do AI tổng hợp (gọi khi bấm, server cache 10 phút) */
export function NeedsSummary({ days }: { days: number }) {
  const t = useT();
  const [state, action, pending] = useActionState(summarizeNeedsAction, undefined);
  return (
    <Card
      title={t("Báo cáo nhu cầu do AI tổng hợp")}
      right={
        <form action={action}>
          <input type="hidden" name="days" value={days} />
          <button disabled={pending} className={btnPrimary}>
            {pending ? t("Đang phân tích…") : state?.text ? t("Tạo lại") : t("Tạo báo cáo")}
          </button>
        </form>
      }
    >
      {state?.error && (
        <p role="alert" className="text-[14px] text-[var(--danger)]">
          {state.error}
        </p>
      )}
      {state?.text ? (
        <>
          <div className="whitespace-pre-wrap text-[14px] leading-relaxed">{state.text.replace(/\*{1,2}([^*\n]+)\*{1,2}/g, "$1").replace(/^#+\s*/gm, "")}</div>
          {state.message && <p className="mt-2 text-[12px] text-[var(--fg-muted)]">{state.message}</p>}
        </>
      ) : (
        !state?.error && <p className="text-[14px] text-[var(--fg-muted)]">{t("AI đọc nhu cầu, chủ đề và các câu bot chưa trả lời được để đề xuất: nhu cầu nổi bật, sản phẩm nên bổ sung, nội dung cần thêm vào kiến thức shop và việc nên làm tuần này.")}</p>
      )}
    </Card>
  );
}
