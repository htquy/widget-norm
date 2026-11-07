"use client";

import { useTransition } from "react";
import { setLocaleAction } from "@/app/locale-actions";
import { LOCALES, type Locale } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/client";

/** Nút VI | EN dùng ở header website và admin */
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label="Language / Ngôn ngữ" className={`inline-flex rounded-xl border border-zinc-200 bg-white p-0.5 text-[12.5px] font-semibold dark:border-white/10 dark:bg-white/5 ${className}`}>
      {LOCALES.map((l: Locale) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          aria-pressed={l === locale}
          onClick={() => start(() => setLocaleAction(l))}
          className={`min-h-9 min-w-10 rounded-lg px-2 uppercase transition ${l === locale ? "bg-brand-600 text-white" : "text-zinc-600 hover:text-zinc-950 dark:text-white/60 dark:hover:text-white"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
