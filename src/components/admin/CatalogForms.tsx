"use client";

import { useActionState } from "react";
import { importProductsAction, saveProductAction, saveServiceAction } from "@/app/admin/actions";
import { MAX_DESCRIPTION_LENGTH } from "@/domain/product";
import { submitWith } from "./form";
import { Status } from "./LeadEditForm";
import { Field, btnPrimary, btnSecondary, fieldCls } from "./ui";

export function ImportProductsForm() {
  const [state, action, pending] = useActionState(importProductsAction, undefined);
  return (
    <form action={action} className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted)]">
        Cột: <code>sku, name, category, price, description, url, image_url, tags, in_stock, active</code>. Trùng SKU = cập nhật, ô trống = giữ dữ liệu cũ.{" "}
        <a href="/mau-san-pham.csv" className="underline" download>
          Tải file mẫu
        </a>
      </p>
      <label className="block">
        <span className="sr-only">File CSV</span>
        <input name="csv" type="file" accept=".csv,text/csv" required className="block w-full text-[13px] file:mr-3 file:min-h-10 file:rounded-lg file:border file:border-[var(--border)] file:bg-white file:px-3 file:text-[13px]" />
      </label>
      <button disabled={pending} className={btnSecondary}>
        {pending ? "Đang nhập…" : "Nhập file"}
      </button>
      <Status state={state} />
    </form>
  );
}

export function ServiceForm({ service }: { service?: { id: string; name: string; durationMin: number; price: number; description: string; active: boolean } }) {
  const [state, action, pending] = useActionState(saveServiceAction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="grid gap-3 sm:grid-cols-6">
      {service && <input type="hidden" name="id" value={service.id} />}
      <Field label="Tên dịch vụ" className="sm:col-span-3">
        <input name="name" required defaultValue={service?.name} className={fieldCls} />
      </Field>
      <Field label="Thời lượng (phút)" className="sm:col-span-1">
        <input name="durationMin" type="number" min={5} max={600} required defaultValue={service?.durationMin ?? 60} className={fieldCls} />
      </Field>
      <Field label="Giá (VND, 0 = miễn phí)" className="sm:col-span-2">
        <input name="price" inputMode="numeric" defaultValue={service?.price ?? 0} className={fieldCls} />
      </Field>
      <Field label="Mô tả ngắn" className="sm:col-span-5">
        <input name="description" defaultValue={service?.description} maxLength={1000} className={fieldCls} />
      </Field>
      <label className="flex min-h-10 items-center gap-2 self-end text-[14px] sm:col-span-1">
        <input type="checkbox" name="active" defaultChecked={service?.active ?? true} className="h-4 w-4" /> Đang nhận lịch
      </label>
      <div className="flex items-center gap-3 sm:col-span-6">
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Đang lưu…" : service ? "Lưu" : "Thêm dịch vụ"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}

export function ProductForm({
  product,
}: {
  product?: { id: string; sku: string; name: string; category: string; price: number; description: string; url: string; imageUrl: string; tags: string[]; inStock: boolean; active: boolean };
}) {
  const [state, action, pending] = useActionState(saveProductAction, undefined);
  return (
    <form onSubmit={submitWith(action)} className="grid gap-4 sm:grid-cols-2">
      {product && <input type="hidden" name="id" value={product.id} />}
      <Field label="Tên sản phẩm / dịch vụ">
        <input name="name" required defaultValue={product?.name} className={fieldCls} />
      </Field>
      <Field label="Mã SKU" hint="Bot dùng để đối chiếu, không được trùng">
        <input name="sku" required defaultValue={product?.sku} className={`${fieldCls} font-mono`} />
      </Field>
      <Field label="Danh mục">
        <input name="category" defaultValue={product?.category} className={fieldCls} />
      </Field>
      <Field label="Giá (VND)" hint="Để 0 nếu muốn bot nói 'liên hệ để biết giá'">
        <input name="price" inputMode="numeric" defaultValue={product?.price ?? 0} className={fieldCls} />
      </Field>
      <Field label="Mô tả cho bot tư vấn" hint={`Công dụng, thành phần/thông số, đối tượng phù hợp, cách dùng, lưu ý… Tối đa ${MAX_DESCRIPTION_LENGTH.toLocaleString("vi-VN")} ký tự.`} className="sm:col-span-2">
        <textarea name="description" rows={7} maxLength={MAX_DESCRIPTION_LENGTH} defaultValue={product?.description} className={fieldCls} />
      </Field>
      <Field label="Từ khoá / tag" hint="Cách nhau bằng dấu phẩy, giúp bot tìm đúng (vd: da dầu, mụn)">
        <input name="tags" defaultValue={product?.tags.join(", ")} className={fieldCls} />
      </Field>
      <Field label="Link trang sản phẩm">
        <input name="url" type="url" defaultValue={product?.url} placeholder="https://" className={fieldCls} />
      </Field>
      <Field label="Link ảnh" className="sm:col-span-2">
        <input name="imageUrl" type="url" defaultValue={product?.imageUrl} placeholder="https://…/anh.jpg" className={fieldCls} />
      </Field>
      <div className="flex flex-wrap gap-6 sm:col-span-2">
        <label className="flex min-h-10 items-center gap-2 text-[14px]">
          <input type="checkbox" name="inStock" defaultChecked={product?.inStock ?? true} className="h-4 w-4" /> Còn hàng
        </label>
        <label className="flex min-h-10 items-center gap-2 text-[14px]">
          <input type="checkbox" name="active" defaultChecked={product?.active ?? true} className="h-4 w-4" /> Hiển thị cho bot
        </label>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={btnPrimary}>
          {pending ? "Đang lưu…" : "Lưu sản phẩm"}
        </button>
        <Status state={state} />
      </div>
    </form>
  );
}
