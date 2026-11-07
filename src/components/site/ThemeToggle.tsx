"use client";

import { useT } from "@/lib/i18n/client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const t = useT();
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Tránh hydration mismatch trước khi mounted
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label={t("Chuyển chế độ sáng / tối")}
        className={`inline-flex size-10 items-center justify-center rounded-xl border border-zinc-200/60 bg-zinc-100/50 text-zinc-600 transition-colors dark:border-white/10 dark:bg-white/5 dark:text-white/70 ${className}`}
        disabled
      >
        <span className="size-4" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t("Chuyển sang chế độ sáng") : t("Chuyển sang chế độ tối")}
      title={isDark ? t("Chuyển sang chế độ sáng") : t("Chuyển sang chế độ tối")}
      className={`relative inline-flex size-10 items-center justify-center rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
        isDark
          ? "border-white/10 bg-white/5 text-amber-300 hover:border-amber-400/40 hover:bg-white/10 hover:text-amber-200 shadow-[0_0_15px_-4px_rgba(251,191,36,0.25)]"
          : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-950 shadow-sm"
      } ${className}`}
    >
      {isDark ? (
        <Sun className="size-4.5 transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon className="size-4.5 transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}
