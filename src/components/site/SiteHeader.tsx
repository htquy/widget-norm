"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { Menu } from "lucide-react";
import { BOT_METAS } from "@/bots/catalog";
import { Container } from "./Container";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitch } from "@/components/LanguageSwitch";

export function SiteHeader() {
  const t = useT();
  const linkCls =
    "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white";

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/85 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#07080b]/85">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent"
      />
      <Container className="flex h-16 items-center justify-between gap-3">
        <Logo />

        <nav
          aria-label={t("Điều hướng chính")}
          className="hidden items-center gap-1 lg:flex"
        >
          {/* Menu chatbot: mở bằng hover/focus, không cần JS */}
          <div className="group relative">
            <Link href="/bots" className={linkCls} aria-haspopup="true">
              Chatbot
            </Link>
            <div className="invisible absolute left-0 top-full z-50 w-80 translate-y-1 rounded-2xl border border-zinc-200 bg-white p-2 opacity-0 shadow-2xl transition duration-300 ease-fluid group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 dark:border-white/10 dark:bg-[#0d1017]">
              {BOT_METAS.map((m) => (
                <Link
                  key={m.kind}
                  href={`/bots/${m.slug}`}
                  className="flex gap-3 rounded-xl p-3 transition-colors hover:bg-zinc-100/70 dark:hover:bg-white/5"
                >
                  <span
                    className={`inline-grid size-10 shrink-0 place-items-center rounded-xl ${m.tile}`}
                  >
                    <Icon name={m.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-zinc-950 dark:text-white">
                      {t(m.shortName)}
                    </span>
                    <span className="block text-xs leading-snug text-zinc-500 dark:text-white/50">
                      {m.industries.slice(0, 2).map((x) => t(x)).join(", ")}…
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <Link href="/pricing" className={linkCls}>
            {t("Bảng giá")}
          </Link>
          <Link href="/#bento" className={linkCls}>
            {t("Công nghệ")}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitch />
          <ThemeToggle />

          <Link
            href="/admin/login"
            className="hidden min-h-11 items-center px-3 text-sm font-semibold text-zinc-700 transition-colors hover:text-zinc-950 dark:text-white/70 dark:hover:text-white sm:inline-flex"
          >
            {t("Đăng nhập")}
          </Link>
          <Link
            href="/signup"
            className="btn-primary hidden text-sm sm:inline-flex"
          >
            {t("Dùng thử miễn phí")}
          </Link>

          {/* Menu di động */}
          <details className="group relative lg:hidden">
            <summary
              aria-label={t("Mở menu")}
              className="flex size-11 cursor-pointer list-none items-center justify-center rounded-lg text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-white/80 dark:hover:bg-white/10 [&::-webkit-details-marker]:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-2 text-zinc-950 shadow-2xl dark:border-white/10 dark:bg-[#0d1017] dark:text-white">
              {BOT_METAS.map((m) => (
                <Link
                  key={m.kind}
                  href={`/bots/${m.slug}`}
                  className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-white/90 dark:hover:bg-white/5"
                >
                  <span
                    className={`inline-grid size-8 place-items-center rounded-lg ${m.tile}`}
                  >
                    <Icon name={m.icon} className="size-4" />
                  </span>
                  {t(m.shortName)}
                </Link>
              ))}
              <hr className="my-1 border-zinc-100 dark:border-white/10" />
              <Link
                href="/pricing"
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-white/90 dark:hover:bg-white/5"
              >
                {t("Bảng giá")}
              </Link>
              <Link
                href="/admin/login"
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:text-white/90 dark:hover:bg-white/5"
              >
                {t("Đăng nhập")}
              </Link>
              <Link href="/signup" className="btn-primary mt-1 w-full text-sm">
                {t("Dùng thử miễn phí")}
              </Link>
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}
