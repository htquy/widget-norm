"use client";

import { useT } from "@/lib/i18n/client";
import { useActionState } from "react";
import { signupAction } from "@/app/admin/actions";

const field =
  "min-h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-[15px] text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";

export function SignupForm({
  kinds,
  defaultKind,
  signedIn = false,
}: {
  kinds: { kind: string; name: string; tagline: string }[];
  defaultKind: string;
  signedIn?: boolean;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(signupAction, undefined);
  return (
    <form
      action={action}
      className="space-y-5 rounded-3xl border border-zinc-200 bg-white p-6 shadow-lift sm:p-8"
    >
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-zinc-900">
          {t("Loại chatbot")}
        </legend>
        <div className="space-y-2">
          {kinds.map((k) => (
            <label
              key={k.kind}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3 transition-colors has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50"
            >
              <input
                type="radio"
                name="kind"
                value={k.kind}
                defaultChecked={k.kind === defaultKind}
                className="mt-1 accent-brand-600"
              />
              <span>
                <span className="block text-sm font-semibold text-zinc-900">
                  {k.name}
                </span>
                <span className="block text-[13px] text-zinc-600">
                  {k.tagline}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-zinc-900">
          {t("Tên cửa hàng")}
        </span>
        <input
          name="shopName"
          required
          maxLength={80}
          autoComplete="organization"
          className={field}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-zinc-900">
          Domain website
        </span>
        <input
          name="domain"
          required
          maxLength={253}
          placeholder="cuahang.vn"
          autoComplete="url"
          className={field}
        />
        <span className="mt-1 block text-xs leading-relaxed text-zinc-500">
          {t("Domain thuộc một tài khoản duy nhất. Xác minh DNS trong workspace trước khi nhúng.")}
        </span>
      </label>
      {!signedIn && (
        <>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-zinc-900">
              {t("Tên của bạn")}
            </span>
            <input
              name="name"
              required
              maxLength={80}
              autoComplete="name"
              className={field}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-zinc-900">
              Email
            </span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={field}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-semibold text-zinc-900">
              {t("Mật khẩu")}
            </span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={field}
            />
            <span className="mt-1 block text-xs text-zinc-500">
              {t("Tối thiểu 8 ký tự.")}
            </span>
          </label>
        </>
      )}
      {state?.error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {state.error}
        </p>
      )}
      <button disabled={pending} className="btn-primary w-full text-base">
        {pending ? t("Đang tạo…") : t("Tạo chatbot & kiểm tra domain")}
      </button>
    </form>
  );
}
