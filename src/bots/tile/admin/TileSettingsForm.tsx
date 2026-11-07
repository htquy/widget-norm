"use client";

import { useT } from "@/lib/i18n/client";
import { useActionState } from "react";
import { submitWith } from "@/components/admin/form";
import { Status } from "@/components/admin/LeadEditForm";
import { Card, Field, btnPrimary, fieldCls } from "@/components/admin/ui";
import { LAYOUT_LABELS, LAYOUT_PATTERNS, wasteFor } from "../domain/quote";
import type { TileSettings } from "../repository";
import { saveTileSettingsAction } from "./actions";

export function TileSettingsForm({ settings: s }: { settings: TileSettings }) {
  const t = useT();
  const [state, action, pending] = useActionState(saveTileSettingsAction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="space-y-4">
      <Card title={t("Thông số báo giá")}>
        <div className="grid gap-4 sm:grid-cols-4">
          {LAYOUT_PATTERNS.map((p) => (
            <Field key={p} label={`Hao hụt ${LAYOUT_LABELS[p]} (%)`}>
              <input name={`waste_${p}`} type="number" step="0.5" min={0} max={50} defaultValue={wasteFor(s.pricing.wastePercent, p)} className={fieldCls} />
            </Field>
          ))}
          <Field label={t("Keo dán (kg/m²)")}>
            <input name="adhesiveKgPerM2" type="number" step="0.5" defaultValue={s.pricing.adhesiveKgPerM2} className={fieldCls} />
          </Field>
          <Field label="Bao keo (kg)">
            <input name="adhesiveBagKg" type="number" defaultValue={s.pricing.adhesiveBagKg} className={fieldCls} />
          </Field>
          <Field label={t("Giá bao keo (VND)")}>
            <input name="adhesiveBagPrice" type="number" defaultValue={s.pricing.adhesiveBagPrice} className={fieldCls} />
          </Field>
          <Field label={t("Giá keo ron (VND/kg)")}>
            <input name="groutPricePerKg" type="number" defaultValue={s.pricing.groutPricePerKg} className={fieldCls} />
          </Field>
        </div>
      </Card>
      <Card title={t("A/B test trình xem thử")}>
        <Field label={t("% khách thấy tính năng xem thử gạch")} hint={t("100 = tất cả. Đặt 50 để so sánh hiệu quả với nhóm chỉ chat (kết quả ở bên phải).")}>
          <input name="abVisualizerPercent" type="number" min={0} max={100} defaultValue={s.abVisualizerPercent} className={`${fieldCls} max-w-40`} />
        </Field>
      </Card>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btnPrimary}>
          {pending ? t("Đang lưu…") : t("Lưu")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
