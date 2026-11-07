"use client";

import { useT } from "@/lib/i18n/client";
import { useActionState, useRef } from "react";
import { submitWith } from "@/components/admin/form";
import { Status } from "@/components/admin/LeadEditForm";
import { Field, btnPrimary, fieldCls } from "@/components/admin/ui";
import { ROOMS, ROOM_LABELS, type Room } from "../domain";
import { saveFurnitureAction } from "./actions";
import { ItemMedia } from "./ItemMedia";

export interface FurnitureFormValue {
  id: string;
  sku: string;
  name: string;
  category: string;
  rooms: Room[];
  style: string;
  material: string;
  color: string;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  price: number;
  stock: number;
  description: string;
  imageUrl: string;
  cutoutUrl: string;
  modelUrl: string;
  modelStatus: string;
  collection: string;
  pairs: string[];
  active: boolean;
}

export function FurnitureForm({ item }: { item?: FurnitureFormValue }) {
  const t = useT();
  const [state, action, pending] = useActionState(saveFurnitureAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const val = (name: string) => (formRef.current?.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "";
  return (
    <form ref={formRef} onSubmit={submitWith(action)} className="grid gap-4 sm:grid-cols-2">
      {item && <input type="hidden" name="id" value={item.id} />}
      <Field label={t("Tên sản phẩm")}>
        <input name="name" required defaultValue={item?.name} className={fieldCls} />
      </Field>
      <Field label={t("Mã SKU")} hint={t("Không trùng; bot dùng để đối chiếu")}>
        <input name="sku" required defaultValue={item?.sku} className={`${fieldCls} font-mono`} />
      </Field>
      <Field label={t("Loại")} hint={t("Sofa, Bàn ăn, Giường, Tủ quần áo…")}>
        <input name="category" defaultValue={item?.category} className={fieldCls} />
      </Field>
      <Field label={t("Giá (VND)")}>
        <input name="price" inputMode="numeric" defaultValue={item?.price ?? 0} className={fieldCls} />
      </Field>
      <fieldset className="grid grid-cols-3 gap-3 sm:col-span-2">
        <legend className="mb-1 text-[13px] font-medium">{t("Kích thước choán sàn (cm) — bot dùng để kiểm tra đặt vừa")}</legend>
        <Field label={t("Rộng")}>
          <input name="widthCm" type="number" min={5} max={1000} required defaultValue={item?.widthCm} className={fieldCls} />
        </Field>
        <Field label={t("Sâu")}>
          <input name="depthCm" type="number" min={5} max={1000} required defaultValue={item?.depthCm} className={fieldCls} />
        </Field>
        <Field label="Cao">
          <input name="heightCm" type="number" min={5} max={1000} required defaultValue={item?.heightCm} className={fieldCls} />
        </Field>
      </fieldset>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1 text-[13px] font-medium">{t("Phù hợp phòng")}</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {ROOMS.map((r) => (
            <label key={r} className="flex min-h-10 items-center gap-2 text-[14px]">
              <input type="checkbox" name="rooms" value={r} defaultChecked={item?.rooms.includes(r)} className="h-4 w-4" /> {ROOM_LABELS[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={t("Phong cách")} hint={t("Bắc Âu, hiện đại, tối giản, tân cổ điển…")}>
        <input name="style" defaultValue={item?.style} className={fieldCls} />
      </Field>
      <Field label={t("Màu")}>
        <input name="color" defaultValue={item?.color} className={fieldCls} />
      </Field>
      <Field label={t("Chất liệu")} className="sm:col-span-2">
        <input name="material" defaultValue={item?.material} className={fieldCls} />
      </Field>
      <Field label={t("Tồn kho (cái)")}>
        <input name="stock" type="number" min={0} defaultValue={item?.stock ?? 0} className={fieldCls} />
      </Field>
      <Field label={t("Bộ sưu tập")} hint={t("Các món cùng bộ được gợi ý đi cùng nhau")}>
        <input name="collection" defaultValue={item?.collection} className={fieldCls} />
      </Field>
      <Field label={t("Món hợp đi kèm (SKU)")} hint={t("Cách nhau bằng dấu phẩy, vd BTR-80, KTV-180")} className="sm:col-span-2">
        <input name="pairs" defaultValue={item?.pairs.join(", ")} className={`${fieldCls} font-mono`} />
      </Field>
      <ItemMedia
        key={item?.id ?? "new"}
        itemId={item?.id}
        getSku={() => val("sku")}
        getDims={() => ({ widthCm: Number(val("widthCm")), depthCm: Number(val("depthCm")), heightCm: Number(val("heightCm")) })}
        initial={{ imageUrl: item?.imageUrl ?? "", cutoutUrl: item?.cutoutUrl ?? "", modelUrl: item?.modelUrl ?? "", modelStatus: item?.modelStatus ?? "", embedding: false }}
      />
      <Field label={t("Mô tả cho bot tư vấn")} hint={t("Công năng, lưu ý lắp đặt, bảo hành, điều kiện thang máy/cửa… Tối đa 4.000 ký tự.")} className="sm:col-span-2">
        <textarea name="description" rows={5} maxLength={4000} defaultValue={item?.description} className={fieldCls} />
      </Field>
      <label className="flex min-h-10 items-center gap-2 text-[14px] sm:col-span-2">
        <input type="checkbox" name="active" defaultChecked={item?.active ?? true} className="h-4 w-4" /> {t("Đang bán (hiển thị cho bot)")}
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={btnPrimary}>
          {pending ? t("Đang lưu…") : t("Lưu sản phẩm")}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
