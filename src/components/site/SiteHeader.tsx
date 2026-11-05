import Link from "next/link";
import { Menu } from "lucide-react";
import { BOT_METAS } from "@/bots/catalog";
import { Container } from "./Container";
import { Icon } from "./Icon";
import { Logo } from "./Logo";

const linkCls = "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-brand-50 hover:text-brand-700";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/60 bg-white/95 md:bg-white/75 md:backdrop-blur-xl md:backdrop-saturate-150">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-brand-400/60 to-transparent" />
      <Container className="flex h-16 items-center justify-between gap-2">
        <Logo />

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 lg:flex">
          {/* Menu chatbot: mở bằng hover/focus, không cần JS */}
          <div className="group relative">
            <Link href="/bots" className={linkCls} aria-haspopup="true">
              Chatbot
            </Link>
            <div className="invisible absolute left-0 top-full z-50 w-80 translate-y-1 rounded-2xl border border-zinc-200 bg-white p-2 opacity-0 shadow-lift transition duration-300 ease-fluid group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
              {BOT_METAS.map((m) => (
                <Link key={m.kind} href={`/bots/${m.slug}`} className="flex gap-3 rounded-xl p-3 transition-colors hover:bg-zinc-50">
                  <span className={`inline-grid size-10 shrink-0 place-items-center rounded-xl ${m.tile}`}>
                    <Icon name={m.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-zinc-950">{m.shortName}</span>
                    <span className="block text-xs leading-snug text-zinc-500">{m.industries.slice(0, 2).join(", ")}…</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
          <Link href="/pricing" className={linkCls}>
            Bảng giá
          </Link>
          <Link href="/#nen-tang" className={linkCls}>
            Nền tảng chung
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/admin/login" className="hidden min-h-11 items-center px-3 text-sm font-semibold text-zinc-700 hover:text-brand-700 sm:inline-flex">
            Đăng nhập
          </Link>
          <Link href="/signup" className="btn-primary hidden text-sm sm:inline-flex">
            Dùng thử miễn phí
          </Link>

          {/* Menu di động: <details> thuần HTML */}
          <details className="group relative lg:hidden">
            <summary aria-label="Mở menu" className="flex size-11 cursor-pointer list-none items-center justify-center rounded-lg text-zinc-700 hover:bg-brand-50 [&::-webkit-details-marker]:hidden">
              <Menu className="size-5" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-2 shadow-lift">
              {BOT_METAS.map((m) => (
                <Link key={m.kind} href={`/bots/${m.slug}`} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
                  <span className={`inline-grid size-8 place-items-center rounded-lg ${m.tile}`}>
                    <Icon name={m.icon} className="size-4" />
                  </span>
                  {m.shortName}
                </Link>
              ))}
              <hr className="my-1 border-zinc-100" />
              <Link href="/pricing" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
                Bảng giá
              </Link>
              <Link href="/admin/login" className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50">
                Đăng nhập
              </Link>
              <Link href="/signup" className="btn-primary mt-1 w-full text-sm">
                Dùng thử miễn phí
              </Link>
            </div>
          </details>
        </div>
      </Container>
    </header>
  );
}
