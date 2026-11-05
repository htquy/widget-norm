import Link from "next/link";
import { Bot, Check, MessageSquare } from "lucide-react";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const code = (await searchParams).error;
  const error =
    code === "hub_unavailable"
      ? "Chưa kết nối được trung tâm tài khoản. Kiểm tra cấu hình hub hoặc đăng nhập workspace đã có."
      : code === "oauth_failed"
        ? "Đăng nhập chưa hoàn tất. Phiên có thể đã hết hạn hoặc tài khoản trung tâm đã liên kết workspace khác. Hãy thử lại."
        : undefined;
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#202438] p-12 text-white lg:flex">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-3 text-lg font-semibold"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-brand-500">
            <Bot className="size-6" />
          </span>
          Widget Norm
        </Link>
        <div className="relative z-10 max-w-lg">
          <MessageSquare className="size-12 text-brand-300" />
          <h2 className="mt-7 text-5xl font-semibold leading-tight tracking-tight">
            Phía sau mỗi
            <br />
            cuộc trò chuyện
            <br />
            là một cơ hội mới.
          </h2>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-indigo-200">
            AVI giúp bạn lắng nghe khách, tư vấn đúng lúc và giữ mọi cơ hội
            trong tầm tay.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 text-xs text-indigo-100">
            {["Tư vấn sản phẩm", "Nhận lịch hẹn", "Kết nối nhân viên"].map(
              (x) => (
                <span key={x} className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-300" />
                  {x}
                </span>
              ),
            )}
          </div>
        </div>
        <p className="text-xs text-indigo-200">
          Không gian làm việc cho cửa hàng của bạn.
        </p>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -right-40 size-[500px] rounded-full border-[70px] border-white/5"
        />
      </section>
      <section className="flex items-center justify-center bg-[#fafafe] px-6 py-14 sm:px-12">
        <LoginForm hub={!!process.env.HUB_CLIENT_ID} error={error} />
      </section>
    </main>
  );
}
