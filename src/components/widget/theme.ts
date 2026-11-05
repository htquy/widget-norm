import type { CSSProperties } from "react";
import { FONT_STACKS, RADIUS_PX, textOn, type WidgetTheme } from "@/domain/theme";

/** Biến CSS cho widget theo theme của shop. Sáng/tối dùng bảng màu có tương phản ≥ 4.5:1. */
export function widgetVars(theme: WidgetTheme, dark: boolean): CSSProperties {
  const r = RADIUS_PX[theme.radius];
  const palette = dark
    ? { bg: "#0f1115", surface: "#1a1d23", surface2: "#242831", fg: "#eef0f3", muted: "#a3aab6", border: "#2f343e" }
    : { bg: "#f4f5f7", surface: "#ffffff", surface2: "#f1f2f5", fg: "#15181d", muted: "#5b6371", border: "#e2e5ea" };
  return {
    ["--w-primary" as string]: theme.primaryColor,
    ["--w-on-primary" as string]: textOn(theme),
    ["--w-bg" as string]: palette.bg,
    ["--w-surface" as string]: palette.surface,
    ["--w-surface-2" as string]: palette.surface2,
    ["--w-fg" as string]: palette.fg,
    ["--w-muted" as string]: palette.muted,
    ["--w-border" as string]: palette.border,
    ["--w-r-frame" as string]: `${r.frame}px`,
    ["--w-r-bubble" as string]: `${r.bubble}px`,
    ["--w-r-control" as string]: `${Math.min(r.control, 24)}px`,
    ["--w-r-pill" as string]: `${r.control}px`,
    fontFamily: FONT_STACKS[theme.font].css,
    colorScheme: dark ? "dark" : "light",
  };
}

export function fontHref(theme: WidgetTheme): string | null {
  const g = FONT_STACKS[theme.font].google;
  return g ? `https://fonts.googleapis.com/css2?family=${g}&display=swap` : null;
}
