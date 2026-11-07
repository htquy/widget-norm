"use client";

import { useT } from "@/lib/i18n/client";
import { useActionState, useState } from "react";
import type { PricingRule } from "@/bots/store/estimate";
import { importProductsAction, saveProductAction, saveServiceAction } from "@/app/admin/actions";
import { MAX_DESCRIPTION_LENGTH } from "@/bots/store/product";
import { submitWith } from "./form";
import { Status } from "./LeadEditForm";
import { Field, btnPrimary, btnSecondary, fieldCls } from "./ui";

export function ImportProductsForm() {
  const t = useT();
  const [state, action, pending] = useActionState(importProductsAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted)]">
        {t("Cột:")} <code>sku, name, category, price, description, url, image_url, tags, in_stock, active</code>. Trùng SKU = cập nhật, ô trống = giữ dữ liệu cũ.{" "}
        <a href="/mau-san-pham.csv" className="underline" download>
          {t("Tải file mẫu")}
        </a>
      </p>
      <label className="block">
        <span className="sr-only">File CSV</span>
        <input name="csv" type="file" accept=".csv,text/csv" required className="block w-full text-[13px] file:mr-3 file:min-h-10 file:rounded-lg file:border file:border-[var(--border)] file:bg-white file:px-3 file:text-[13px]" />
      </label>
      <button disabled={pending} className={btnSecondary}>
        {pending ? t("Đang nhập…") : t("Nhập file")}
      </button>
      <Status state={state} />
    </form>
  );
}

export function ServiceForm({ service }: { service?: { id: string; name: string; durationMin: number; price: number; description: string; active: boolean } }) {
  const t = useT();
  const [state, action, pending] = useActionState(saveServiceAction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="grid gap-3 sm:grid-cols-6">
      {service && <input type="hidden" name="id" value={service.id} />}
      <Field label={t("Tên dịch vụ")} className="sm:col-span-3">
        <input name="name" required defaultValue={service?.name} className={fieldCls} />
      </Field>
      <Field label={t("Thời lượng (phút)")} className="sm:col-span-1">
        <input name="durationMin" type="number" min={5} max={600} required defaultValue={service?.durationMin ?? 60} className={fieldCls} />
      </Field>
      <Field label={t("Giá (VND, 0 = miễn phí)")} className="sm:col-span-2">
        <input name="price" inputMode="numeric" defaultValue={service?.price ?? 0} className={fieldCls} />
      </Field>
      <Field label={t("Mô tả ngắn")} className="sm:col-span-5">
        <input name="description" defaultValue={service?.description} maxLength={1000} className={fieldCls} />
      </Field>
      <label className="flex min-h-10 items-center gap-2 self-end text-[14px] sm:col-span-1">
        <input type="checkbox" name="active" defaultChecked={service?.active ?? true} className="h-4 w-4" /> {t("Đang nhận lịch")}
      </label>
      <div className="flex items-center gap-3 sm:col-span-6">
        <button disabled={pending} className={btnPrimary}>
          {pending ? t("Đang lưu…") : service ? t("Lưu") : t("Thêm dịch vụ")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ProductForm({
  product,
}: {
  product?: { id: string; sku: string; name: string; category: string; price: number; description: string; url: string; imageUrl: string; tags: string[]; inStock: boolean; active: boolean; pricing: PricingRule | null };
}) {
  const t = useT();
  const [state, action, pending] = useActionState(saveProductAction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="grid gap-4 sm:grid-cols-2">
      {product && <input type="hidden" name="id" value={product.id} />}
      <Field label={t("Tên sản phẩm / dịch vụ")}>
        <input name="name" required defaultValue={product?.name} className={fieldCls} />
      </Field>
      <Field label={t("Mã SKU")} hint={t("Bot dùng để đối chiếu, không được trùng")}>
        <input name="sku" required defaultValue={product?.sku} className={`${fieldCls} font-mono`} />
      </Field>
      <Field label={t("Danh mục")}>
        <input name="category" defaultValue={product?.category} className={fieldCls} />
      </Field>
      <Field label={t("Giá (VND)")} hint={t("Để 0 nếu muốn bot nói 'liên hệ để biết giá'")}>
        <input name="price" inputMode="numeric" defaultValue={product?.price ?? 0} className={fieldCls} />
      </Field>
      <Field label={t("Mô tả cho bot tư vấn")} hint={`Công dụng, thành phần/thông số, đối tượng phù hợp, cách dùng, lưu ý… Tối đa ${MAX_DESCRIPTION_LENGTH.toLocaleString("vi-VN")} ký tự.`} className="sm:col-span-2">
        <textarea name="description" rows={7} maxLength={MAX_DESCRIPTION_LENGTH} defaultValue={product?.description} className={fieldCls} />
      </Field>
      <Field label={t("Từ khoá / tag")} hint={t("Cách nhau bằng dấu phẩy, giúp bot tìm đúng (vd: da dầu, mụn)")}>
        <input name="tags" defaultValue={product?.tags.join(", ")} className={fieldCls} />
      </Field>
      <Field label={t("Link trang sản phẩm")}>
        <input name="url" type="url" defaultValue={product?.url} placeholder="https://" className={fieldCls} />
      </Field>
      <Field label={t("Link ảnh")} className="sm:col-span-2">
        <input name="imageUrl" type="url" defaultValue={product?.imageUrl} placeholder="https://…/anh.jpg" className={fieldCls} />
      </Field>
      <PricingFields rule={product?.pricing ?? null} />
      <div className="flex flex-wrap gap-6 sm:col-span-2">
        <label className="flex min-h-10 items-center gap-2 text-[14px]">
          <input type="checkbox" name="inStock" defaultChecked={product?.inStock ?? true} className="h-4 w-4" /> {t("Còn hàng")}
        </label>
        <label className="flex min-h-10 items-center gap-2 text-[14px]">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4" /> {t("Hiển thị cho bot")}
        </label>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={btnPrimary}>
          {pending ? t("Đang lưu…") : t("Lưu sản phẩm")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

const MODELS = [
  { value: "", label: "Không dùng — chỉ báo giá niêm yết" },
  { value: "per_area", label: "Theo m² (sàn, kính, tấm ốp…)" },
  { value: "coverage", label: "Theo độ phủ (sơn, chống thấm, keo…)" },
  { value: "per_length", label: "Theo mét dài (rèm, vải, ống…)" },
  { value: "per_unit", label: "Theo số lượng, có bậc giá (đồng phục, in ấn…)" },
] as const;

/** Công thức để bot tự báo giá chính xác; "Giá" ở trên là đơn giá theo đơn vị của công thức. */
function PricingFields({ rule }: { rule: PricingRule | null }) {
  const t = useT();
  const [model, setModel] = useState<string>(rule?.model ?? "");
  const waste = rule && "wastePercent" in rule ? rule.wastePercent : 5;
  return (
    <fieldset className="grid gap-4 rounded-xl border border-[var(--border)] p-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="px-1 text-[13px] font-medium">{t("Công thức báo giá cho bot (tuỳ chọn)")}</legend>
      <Field label={t("Cách tính")} hint={t("Với công thức, ô Giá phía trên là giá mỗi m² / mỗi thùng / mỗi mét / mỗi đơn vị")} className="sm:col-span-2">
        <select name="pricingModel" value={model} onChange={(e) => setModel(e.target.value)} className={fieldCls}>
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {t(m.label)}
            </option>
          ))}
        </select>
      </Field>
      {model && model !== "per_unit" && (
        <Field label={t("Hao hụt (%)")}>
          <input name="pricingWaste" inputMode="decimal" defaultValue={waste} className={fieldCls} />
        </Field>
      )}
      {model === "per_area" && (
        <Field label={t("Diện tích tối thiểu (m²)")} hint={t("0 = không áp dụng")}>
          <input name="pricingMinArea" inputMode="decimal" defaultValue={rule?.model === "per_area" ? rule.minAreaM2 : 0} className={fieldCls} />
        </Field>
      )}
      {model === "coverage" && (
        <>
          <Field label={t("1 đơn vị bán phủ được (m², 1 lớp)")}>
            <input name="pricingCoverage" inputMode="decimal" required defaultValue={rule?.model === "coverage" ? rule.coveragePerUnit : ""} className={fieldCls} />
          </Field>
          <Field label={t("Số lớp")}>
            <input name="pricingCoats" inputMode="numeric" defaultValue={rule?.model === "coverage" ? rule.coats : 2} className={fieldCls} />
          </Field>
        </>
      )}
      {(model === "coverage" || model === "per_unit") && (
        <Field label={t("Đơn vị bán")} hint={t("thùng, lít, bộ, áo…")}>
          <input name="pricingUnit" defaultValue={rule && "unit" in rule ? rule.unit : model === "coverage" ? t("thùng") : t("cái")} className={fieldCls} />
        </Field>
      )}
      {model === "per_length" && (
        <Field label={t("Hệ số nhún/gấp")} hint={t("Rèm nhún gấp 2 lần → 2; không nhún → 1")}>
          <input name="pricingFold" inputMode="decimal" defaultValue={rule?.model === "per_length" ? rule.foldFactor : 1} className={fieldCls} />
        </Field>
      )}
      {model === "per_unit" && (
        <Field label={t("Bậc giá (mỗi dòng: số lượng:giá)")} hint={t("Ví dụ 50:120000 = từ 50 trở lên giá 120.000")} className="sm:col-span-2">
          <textarea name="pricingTiers" rows={3} defaultValue={rule?.model === "per_unit" ? rule.tiers.map((t) => `${t.minQty}:${t.price}`).join("\n") : ""} className={`${fieldCls} font-mono`} />
        </Field>
      )}
      {model && (
        <Field label={t("Phụ phí (mỗi dòng: tên|area/quantity/flat|giá)")} hint={t("area = nhân theo m², quantity = nhân theo số lượng, flat = cộng cố định. Ví dụ: Công thi công|area|45000")} className="sm:col-span-2">
          <textarea name="pricingAddons" rows={3} defaultValue={rule ? rule.addons.map((a) => `${a.label}|${a.per}|${a.price}`).join("\n") : ""} className={`${fieldCls} font-mono`} />
        </Field>
      )}
    </fieldset>
  );
}
