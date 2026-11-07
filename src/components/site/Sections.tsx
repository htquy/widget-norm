"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import type { BotMeta } from "@/bots/catalog";
import { Container } from "./Container";
import { Icon } from "./Icon";
import { BOT_PRICING } from "@/domain/bot-pricing";

/** Đầu section: eyebrow → h2 → mô tả (theo bố cục skill-pages) */
export function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-[680px] text-center">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl [text-wrap:balance]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-4 text-base text-zinc-600 dark:text-white/60 [text-wrap:pretty]">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Thẻ giới thiệu một chatbot; count = số cửa hàng đang chạy bot này (số thật từ DB) */
export function BotCard({
  meta,
  count,
  span = "",
}: {
  meta: BotMeta;
  count: number;
  span?: string;
}) {
  const t = useT();
  return (
    <li className={span}>
      <Link
        href={`/bots/${meta.slug}`}
        className="group card-lift reveal flex h-full flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-brand-500/30 hover:shadow-xl dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-white/20 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <span
            className={`inline-grid size-12 place-items-center rounded-xl transition-transform duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-110 ${meta.tile}`}
          >
            <Icon name={meta.icon} className="size-6" />
          </span>
          {count > 0 ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium tabular-nums text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-800/60">
              {t("{n} cửa hàng đang dùng", { n: count })}
            </span>
          ) : (
            <span className="rounded-full bg-spark-50 px-2.5 py-1 text-xs font-medium text-spark-700 ring-1 ring-spark-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800/60">
              {t("Mới ra mắt")}
            </span>
          )}
        </div>
        <h3 className="mt-6 text-xl font-bold text-zinc-950 dark:text-white">
          {t(meta.name)}
        </h3>
        <p className="mt-2 text-lg font-semibold text-zinc-900 dark:text-white">
          {t("Từ")} {BOT_PRICING[meta.kind].monthly.toLocaleString("vi-VN")} ₫
          <span className="text-xs font-normal text-zinc-500 dark:text-white/50">
            {" "}
            {t("/tháng")}
          </span>
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-white/60 [text-wrap:pretty]">
          {t(meta.tagline)}
        </p>
        <ul className="mt-4 space-y-1.5">
          {meta.heroPoints.map((p0) => { const p = t(p0); return (
            <li
              key={p}
              className="flex gap-2 text-sm text-zinc-700 dark:text-white/80"
            >
              <Check
                className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden="true"
              />
              {p}
            </li>
          ); })}
        </ul>
        <p className="mt-4 text-xs text-zinc-500 dark:text-white/40">
          {t("Phù hợp:")} {meta.industries.slice(0, 3).map((x) => t(x)).join(" · ")}
        </p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-brand-600 dark:text-brand-400">
          {t("Xem chi tiết")}
          <ArrowRight
            className="size-4 transition-transform duration-500 ease-fluid group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </Link>
    </li>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const t = useT();
  return (
    <div className="mx-auto mt-10 max-w-3xl divide-y divide-zinc-200 rounded-3xl border border-zinc-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#0d1017]">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-1 sm:px-6">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-zinc-900 transition-colors dark:text-white [&::-webkit-details-marker]:hidden">
            {f.q}
            <span
              className="text-brand-600 transition-transform duration-300 group-open:rotate-45 dark:text-brand-400"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <p className="pb-4 text-sm leading-relaxed text-zinc-600 dark:text-white/70 [text-wrap:pretty]">
            {f.a}
          </p>
        </details>
      ))}
    </div>
  );
}

export function FinalCta({
  title,
  subtitle,
  primary: primaryProp,
}: {
  title: string;
  subtitle: string;
  primary?: { href: string; label: string };
}) {
  const t = useT();
  const primary = primaryProp ?? { href: "/signup", label: t("Dùng thử miễn phí 14 ngày") };
  return (
    <section className="bg-transparent py-20 sm:py-28">
      <Container>
        <div className="aurora-dark reveal rounded-3xl bg-zinc-950 p-8 text-center text-white shadow-glow sm:p-16">
          <div
            aria-hidden="true"
            className="bg-grid-dark pointer-events-none absolute inset-0 -z-10"
          />
          <div className="mx-auto max-w-[680px]">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl [text-wrap:balance]">
              {title}
            </h2>
            <p className="mt-4 text-base text-zinc-300 sm:text-lg [text-wrap:pretty]">
              {subtitle}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={primary.href}
                className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-base font-semibold text-zinc-950 shadow-[0_18px_50px_-12px_rgb(138_127_248/0.7)] transition-all duration-500 ease-fluid hover:-translate-y-0.5 active:scale-[0.98]"
              >
                {primary.label}
                <ArrowRight
                  className="size-4 text-brand-600 transition-transform duration-500 ease-fluid group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-base font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/10"
              >
                {t("Xem bảng giá")}
              </Link>
            </div>
            <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-white/10">
              <ShieldCheck
                className="size-4 text-emerald-400"
                aria-hidden="true"
              />
              {t("Không cần thẻ thanh toán · dữ liệu mỗi cửa hàng tách biệt")}
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
