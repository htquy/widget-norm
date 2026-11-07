"use client";

import { localizeMeta } from "@/bots/localize";
import { useT } from "@/lib/i18n/client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { BOT_METAS } from "@/bots/catalog";
import { BOT_PRICING } from "@/domain/bot-pricing";
import { Icon } from "./Icon";

export function HomePricing() {
  const t = useT();
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="mt-12">
      {/* Billing toggle */}
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100/80 p-1.5 shadow-md backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`min-h-10 rounded-full px-5 text-sm font-semibold transition-all ${
              billing === "monthly"
                ? "bg-white text-zinc-950 shadow-md"
                : "text-zinc-600 hover:text-zinc-950 dark:text-white/60 dark:hover:text-white"
            }`}
          >
            {t("Thanh toán theo tháng")}
          </button>
          <button
            type="button"
            onClick={() => setBilling("yearly")}
            className={`inline-flex min-h-10 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all ${
              billing === "yearly"
                ? "bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-lg"
                : "text-zinc-600 hover:text-zinc-950 dark:text-white/60 dark:hover:text-white"
            }`}
          >
            <span>{t("Thanh toán theo năm")}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${
                billing === "yearly"
                  ? "bg-white/20 text-white"
                  : "bg-spark-500/20 text-spark-600 dark:text-spark-300 border border-spark-500/30"
              }`}
            >
              {t("Tiết kiệm 20%")}
            </span>
          </button>
        </div>
        <p className="text-xs text-zinc-500 dark:text-white/50">
          {billing === "yearly"
            ? t("🎁 Ưu đãi thanh toán năm: Tặng 2 tháng sử dụng miễn phí + Hỗ trợ nạp dữ liệu shop ban đầu")
            : t("Có thể chuyển đổi hoặc hủy bất kỳ lúc nào · Không phát sinh chi phí ẩn")}
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {BOT_METAS.map((raw) => localizeMeta(raw, t)).map((m) => {
          const pricing = BOT_PRICING[m.kind];
          const monthlyFee = pricing.monthly;
          const displayedFee =
            billing === "yearly"
              ? Math.round((monthlyFee * 0.8) / 1000) * 1000
              : monthlyFee;
          const isStore = m.kind === "store";

          return (
            <div
              key={m.kind}
              className={`relative flex flex-col rounded-3xl border p-6 sm:p-7 transition-all ${
                isStore
                  ? "border-brand-500/50 bg-white shadow-xl ring-1 ring-brand-500/30 dark:bg-[#121522] dark:shadow-[0_20px_50px_-15px_rgba(95,69,228,0.35)]"
                  : "border-zinc-200/80 bg-white shadow-md dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-white/20"
              }`}
            >
              {isStore && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-violet-600 px-3.5 py-1 text-xs font-semibold text-white shadow-lg border border-white/20">
                    <Sparkles className="size-3.5" /> {t("Gói phổ biến nhất")}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <span
                  className={`inline-grid size-11 place-items-center rounded-xl ${m.tile}`}
                >
                  <Icon name={m.icon} className="size-5" />
                </span>
                <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-700 dark:bg-white/5 dark:border-white/10 dark:text-white/70">
                  {m.kind === "store"
                    ? t("Mọi cửa hàng")
                    : m.kind === "tile"
                      ? t("Gạch & VLXD")
                      : m.kind === "education"
                        ? t("Đào tạo & Ngoại ngữ")
                        : t("Showroom Nội thất")}
                </span>
              </div>

              <h3 className="mt-4 text-xl font-bold text-zinc-950 dark:text-white">
                {m.shortName}
              </h3>
              <p className="mt-1.5 min-h-10 text-xs leading-relaxed text-zinc-600 dark:text-white/50">
                {m.tagline}
              </p>

              <div className="my-5 border-y border-zinc-200/80 py-4 dark:border-white/5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-white font-mono">
                    {displayedFee.toLocaleString("vi-VN")} ₫
                  </span>
                  <span className="text-xs font-normal text-zinc-500 dark:text-white/40">
                    {t("/tháng")}
                  </span>
                </div>
                {billing === "yearly" && (
                  <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Tiết kiệm {(monthlyFee * 2.4).toLocaleString("vi-VN")} ₫/năm
                  </p>
                )}
                <p className="mt-1 text-[11px] text-zinc-500 dark:text-white/40">
                  {t("Dùng thử đầy đủ 14 ngày không rủi ro")}
                </p>
              </div>

              <div className="mb-6 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-white/30">
                  {t("Bao gồm:")}
                </p>
                <ul className="mt-3 space-y-2 text-xs text-zinc-700 dark:text-white/70">
                  {pricing.includes.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="leading-snug">{t(feature)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <Link
                  href={`/signup?bot=${m.slug}`}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold transition-all ${
                    isStore
                      ? "bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-lg hover:shadow-brand-500/40"
                      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 dark:bg-white/10 dark:hover:bg-white/15 dark:text-white dark:border-white/10"
                  }`}
                >
                  {t("Dùng thử 14 ngày miễn phí")}
                  <ArrowRight className="size-3.5" />
                </Link>
                <Link
                  href={`/bots/${m.slug}`}
                  className="block text-center text-xs font-semibold text-zinc-500 hover:text-zinc-950 dark:text-white/40 dark:hover:text-white transition-colors py-1"
                >
                  {t("Xem chi tiết")} {m.shortName}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
