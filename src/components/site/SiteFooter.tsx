import Link from "next/link";
import { BOT_METAS } from "@/bots/catalog";
import { siteConfig } from "@/lib/site";
import { Container } from "./Container";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 py-12">
      <Container className="grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-600">{siteConfig.tagline}. Mỗi chatbot một nghiệp vụ riêng, chung nền tảng AI, đặt lịch, live chat và báo cáo.</p>
        </div>
        <nav aria-label="Chatbot">
          <h2 className="text-sm font-semibold text-zinc-950">Chatbot</h2>
          <ul className="mt-3 space-y-1">
            {BOT_METAS.map((m) => (
              <li key={m.kind}>
                <Link href={`/bots/${m.slug}`} className="inline-flex min-h-9 items-center text-sm text-zinc-600 hover:text-brand-700">
                  {m.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Tài khoản">
          <h2 className="text-sm font-semibold text-zinc-950">Bắt đầu</h2>
          <ul className="mt-3 space-y-1">
            {[
              ["/pricing", "Bảng giá"],
              ["/signup", "Dùng thử 14 ngày"],
              ["/admin/login", "Đăng nhập quản trị"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="inline-flex min-h-9 items-center text-sm text-zinc-600 hover:text-brand-700">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
      <Container className="mt-10 border-t border-zinc-200 pt-6 text-xs text-zinc-500">© {new Date().getFullYear()} {siteConfig.name}. Trả lời của chatbot do AI tạo ra từ dữ liệu cửa hàng — nên kiểm tra thông tin quan trọng.</Container>
    </footer>
  );
}
