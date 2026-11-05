"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { loginAction } from "@/app/admin/actions";

export function LoginForm({ hub, error }: { hub: boolean; error?: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <div className="w-full max-w-md">
      <p className="text-sm font-semibold text-brand-700">Workspace cửa hàng</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        Chào bạn quay lại.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        Hội thoại, lịch hẹn và khách tiềm năng đang chờ bạn.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
        >
          {error}
        </p>
      )}
      {hub && (
        <>
          <a href="/api/auth/hub/start" className="btn-primary mt-7 w-full">
            <Mail className="size-4" />
            Tiếp tục với tài khoản email
            <ArrowRight className="size-4" />
          </a>
          <p className="mt-4 text-center text-xs leading-relaxed text-zinc-500">
            Dùng chung tài khoản và phiên SSO của Skill Pages trên các website.
          </p>
        </>
      )}
      {!hub && (
        <form action={action} className="mt-7 space-y-5">
          <label className="block text-sm">
            <span className="mb-2 block font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block font-medium">Mật khẩu</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="min-h-12 w-full rounded-xl border border-zinc-300 bg-white px-4"
            />
          </label>
          {state?.error && (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
            >
              {state.error}
            </p>
          )}
          <button disabled={pending} className="btn-primary w-full">
            {pending ? "Đang đăng nhập…" : "Vào workspace"}
            <ArrowRight className="size-4" />
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-zinc-600">
        Bạn mới đến?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand-800 underline underline-offset-4"
        >
          Tạo chatbot đầu tiên
        </Link>
      </p>
    </div>
  );
}
