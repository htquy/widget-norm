"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { BOT_METAS } from "@/bots/catalog";
import { siteConfig } from "@/lib/site";
import { Container } from "./Container";
import { Logo } from "./Logo";

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50/80 py-12 text-zinc-600 transition-colors dark:border-white/10 dark:bg-[#07080b] dark:text-white/50">
      <Container className="grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-white/60">
            {t(siteConfig.tagline)}. {t("Mỗi chatbot sở hữu nghiệp vụ chữ ký riêng biệt, chia sẻ cùng nền tảng Jev Engine, đặt lịch thông minh, live chat và phân tích chuyển đổi.")}
          </p>
        </div>

        <nav aria-label="Chatbot">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
            {t("Hệ sinh thái Chatbot")}
          </h2>
          <ul className="mt-3 space-y-1">
            {BOT_METAS.map((m) => (
              <li key={m.kind}>
                <Link
                  href={`/bots/${m.slug}`}
                  className="inline-flex min-h-9 items-center text-sm text-zinc-600 transition-colors hover:text-brand-600 dark:text-white/60 dark:hover:text-brand-400"
                >
                  {t(m.shortName)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={t("Tài khoản & Bắt đầu")}>
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">
            {t("Bắt đầu")}
          </h2>
          <ul className="mt-3 space-y-1">
            {[
              ["/pricing", t("Bảng giá minh bạch")],
              ["/signup", t("Dùng thử 14 ngày miễn phí")],
              ["/admin/login", t("Đăng nhập quản trị")],
            ].map(([href, label]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex min-h-9 items-center text-sm text-zinc-600 transition-colors hover:text-brand-600 dark:text-white/60 dark:hover:text-brand-400"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>

      <Container className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-white/10 dark:text-white/40 sm:flex-row">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. {t("Trả lời của chatbot được đối chiếu trực tiếp từ dữ liệu cửa hàng bạn.")}
        </p>
        <p className="text-[11px]">
          {t("Kiến trúc đa schema độc lập · Bảo mật dữ liệu tuyệt đối")}
        </p>
      </Container>
    </footer>
  );
}
