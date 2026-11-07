"use client";
import { useT } from "@/lib/i18n/client";
import { useActionState } from "react";
import {
  registerDomainAction,
  verifyDomainAction,
  activateLicenseAction,
} from "@/app/admin/domain-actions";
import { btnPrimary, btnSecondary, fieldCls } from "./ui";

export function DomainForm() {
  const t = useT();
  const [state, action, pending] = useActionState(
    registerDomainAction,
    undefined,
  );
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="website-domain">
        {t("Website của bạn")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="website-domain"
          name="domain"
          required
          maxLength={253}
          placeholder="cuahang.vn"
          className={fieldCls}
        />
        <button disabled={pending} className={`${btnPrimary} shrink-0`}>
          {pending ? t("Đang kiểm tra…") : t("Đăng ký domain")}
        </button>
      </div>
      <p className="text-xs text-zinc-500">
        {t("Một domain thuộc một tài khoản. Đổi email không cấp lại thời gian dùng thử.")}
      </p>
      {state?.error && (
        <p role="alert" className="text-sm text-rose-700">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="text-sm text-emerald-800">
          {state.message}
        </p>
      )}
    </form>
  );
}
export function VerifyDomainForm({ domain }: { domain: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(
    verifyDomainAction,
    undefined,
  );
  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="domain" value={domain} />
      <button disabled={pending} className={btnSecondary}>
        {pending ? t("Đang kiểm tra DNS…") : t("Xác minh & kết nối bot này")}
      </button>
      {state?.error && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="mt-2 text-sm text-emerald-800">
          {state.message}
        </p>
      )}
    </form>
  );
}

export function ActivateLicenseForm() {
  const t = useT();
  const [state, action, pending] = useActionState(
    activateLicenseAction,
    undefined,
  );
  return (
    <form action={action} className="my-4">
      <button disabled={pending} className={`${btnPrimary} w-full`}>
        {pending
          ? t("Đang kiểm tra thanh toán…")
          : t("Kích hoạt gói cho chatbot này")}
      </button>
      <p className="mt-2 text-xs text-zinc-500">
        {t("Mỗi gói theo loại bot phục vụ một chatbot đang chọn. Kích hoạt ở đây sẽ chuyển gói khỏi bot cùng loại trước đó.")}
      </p>
      {state?.error && (
        <p role="alert" className="mt-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p role="status" className="mt-2 text-sm text-emerald-800">
          {state.message}
        </p>
      )}
    </form>
  );
}
