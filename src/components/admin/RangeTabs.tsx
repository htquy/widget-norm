"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n/client";

export function RangeTabs({ days, base, extra = "" }: { days: number; base: string; extra?: string }) {
  const t = useT();
  return (
    <nav aria-label={t("Khoảng thời gian")} className="flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[13px]">
      {[7, 30, 90].map((d) => (
        <Link
          key={d}
          href={`${base}?days=${d}${extra}`}
          aria-current={d === days ? "page" : undefined}
          className={`flex min-h-9 items-center rounded-md px-3 ${d === days ? "bg-[var(--accent)] text-white" : "text-[var(--fg-muted)] hover:text-[var(--fg)]"}`}
        >
          {d} {t("ngày")}
        </Link>
      ))}
    </nav>
  );
}

