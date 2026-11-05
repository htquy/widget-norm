import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import type { Plan } from "@/domain/account";
import { PLANS } from "@/domain/account";
import type { BotMeta } from "@/bots/catalog";
import { siteConfig } from "@/lib/site";
import { Container } from "./Container";
import { Icon } from "./Icon";

/** Đầu section: eyebrow → h2 → mô tả (theo bố cục skill-pages) */
export function SectionHead({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-[680px] text-center">
      <div className="eyebrow">{eyebrow}</div>
      <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl [text-wrap:balance]">{title}</h2>
      {subtitle && <p className="mt-4 text-base text-zinc-600 [text-wrap:pretty]">{subtitle}</p>}
    </div>
  );
}

const money = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;

/** Thẻ giới thiệu một chatbot; count = số cửa hàng đang chạy bot này (số thật từ DB) */
export function BotCard({ meta, count, span = "" }: { meta: BotMeta; count: number; span?: string }) {
  return (
    <li className={span}>
      <Link href={`/bots/${meta.slug}`} className="group card-lift reveal flex h-full flex-col rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className={`inline-grid size-12 place-items-center rounded-xl transition-transform duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-110 ${meta.tile}`}>
            <Icon name={meta.icon} className="size-6" />
          </span>
          {count > 0 ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium tabular-nums text-emerald-700 ring-1 ring-emerald-200">{count} cửa hàng đang dùng</span>
          ) : (
            <span className="rounded-full bg-spark-50 px-2.5 py-1 text-xs font-medium text-spark-700 ring-1 ring-spark-200">Mới ra mắt</span>
          )}
        </div>
        <h3 className="mt-6 text-xl font-bold text-zinc-950">{meta.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">{meta.tagline}</p>
        <ul className="mt-4 space-y-1.5">
          {meta.heroPoints.map((p) => (
            <li key={p} className="flex gap-2 text-sm text-zinc-700">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-zinc-500">Phù hợp: {meta.industries.slice(0, 3).join(" · ")}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-brand-700">
          Xem chi tiết
          <ArrowRight className="size-4 transition-transform duration-500 ease-fluid group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}

export function PlanCard({ plan, cta = true }: { plan: Plan; cta?: boolean }) {
  return (
    <li className={`relative flex flex-col rounded-3xl border bg-white p-6 sm:p-7 ${plan.highlight ? "border-gradient shadow-lift" : "border-zinc-200"}`}>
      {plan.highlight && <span className="absolute -top-3 left-6 rounded-full bg-spark-500 px-3 py-1 text-xs font-semibold text-white">Phổ biến nhất</span>}
      <h3 className="text-lg font-bold text-zinc-950">{plan.name}</h3>
      <p className="mt-1 min-h-10 text-sm text-zinc-600">{plan.tagline}</p>
      <p className="mt-4">
        {plan.priceMonthly === null ? (
          <span className="text-3xl font-bold text-zinc-950">Liên hệ</span>
        ) : plan.priceMonthly === 0 ? (
          <span className="text-3xl font-bold text-zinc-950">0 ₫</span>
        ) : (
          <>
            <span className="text-3xl font-bold tabular-nums text-zinc-950">{money(plan.priceMonthly)}</span>
            <span className="text-sm text-zinc-500"> /tháng</span>
          </>
        )}
      </p>
      <ul className="mt-5 flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex gap-2 text-sm text-zinc-700">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
      {cta &&
        (plan.priceMonthly === null && siteConfig.contactEmail ? (
          <a href={`mailto:${siteConfig.contactEmail}?subject=Gói Doanh nghiệp`} className="btn-secondary mt-6">
            Liên hệ tư vấn
          </a>
        ) : (
          <Link href="/signup" className={`${plan.highlight ? "btn-primary" : "btn-secondary"} mt-6`}>
            {plan.id === "trial" ? "Dùng thử 14 ngày" : "Bắt đầu với gói này"}
          </Link>
        ))}
    </li>
  );
}

export function PlanGrid() {
  return (
    <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {PLANS.map((p) => (
        <PlanCard key={p.id} plan={p} />
      ))}
    </ul>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="mx-auto mt-10 max-w-3xl divide-y divide-zinc-200 rounded-3xl border border-zinc-200 bg-white">
      {items.map((f) => (
        <details key={f.q} className="group px-5 py-1 sm:px-6">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="text-brand-600 transition-transform duration-300 group-open:rotate-45" aria-hidden="true">
              +
            </span>
          </summary>
          <p className="pb-4 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function FinalCta({ title, subtitle, primary = { href: "/signup", label: "Dùng thử miễn phí 14 ngày" } }: { title: string; subtitle: string; primary?: { href: string; label: string } }) {
  return (
    <section className="bg-white py-20 sm:py-28">
      <Container>
        <div className="aurora-dark reveal rounded-3xl bg-zinc-950 p-8 text-center text-white shadow-glow sm:p-16">
          <div aria-hidden="true" className="bg-grid-dark pointer-events-none absolute inset-0 -z-10" />
          <div className="mx-auto max-w-[680px]">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl [text-wrap:balance]">{title}</h2>
            <p className="mt-4 text-base text-zinc-300 sm:text-lg [text-wrap:pretty]">{subtitle}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href={primary.href}
                className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-base font-semibold text-zinc-950 shadow-[0_18px_50px_-12px_rgb(138_127_248/0.7)] transition-all duration-500 ease-fluid hover:-translate-y-0.5 active:scale-[0.98]"
              >
                {primary.label}
                <ArrowRight className="size-4 text-brand-600 transition-transform duration-500 ease-fluid group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-xl px-5 py-3 text-base font-semibold text-white ring-1 ring-white/20 transition-colors hover:bg-white/10">
                Xem bảng giá
              </Link>
            </div>
            <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-300 ring-1 ring-white/10">
              <ShieldCheck className="size-4 text-emerald-400" aria-hidden="true" />
              Không cần thẻ thanh toán · dữ liệu mỗi cửa hàng tách biệt
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
