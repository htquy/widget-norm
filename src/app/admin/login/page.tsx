"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6">
        <div>
          <h1 className="text-xl font-semibold text-[var(--fg)]">Đăng nhập quản trị</h1>
          <p className="mt-1 text-[14px] text-[var(--fg-muted)]">Widget Norm — trợ lý chat cho cửa hàng</p>
        </div>
        <label className="block text-[14px]">
          <span className="mb-1 block font-medium">Email</span>
          <input name="email" type="email" required autoComplete="username" className="min-h-11 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
        </label>
        <label className="block text-[14px]">
          <span className="mb-1 block font-medium">Mật khẩu</span>
          <input name="password" type="password" required autoComplete="current-password" className="min-h-11 w-full rounded-lg border border-[var(--border)] px-3 py-2" />
        </label>
        {state?.error && (
          <p role="alert" className="text-[14px] text-[var(--danger)]">
            {state.error}
          </p>
        )}
        <button disabled={pending} className="min-h-11 w-full rounded-lg bg-[var(--fg)] text-[14px] font-medium text-white disabled:opacity-60">
          {pending ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}
