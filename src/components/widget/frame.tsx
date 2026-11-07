"use client";

import { createContext, useContext } from "react";
import { useTr } from "./i18n";

/**
 * Phóng to / thu nhỏ khung chat trên trang của shop (widget.js đổi cỡ iframe qua postMessage "wn:expand").
 * Dùng cho chỗ cần nhìn rộng như studio nội thất, thử gạch trên ảnh phòng.
 */
export const FrameCtx = createContext<{ canExpand: boolean; expanded: boolean; toggle: () => void }>({ canExpand: false, expanded: false, toggle: () => undefined });
export const useFrame = () => useContext(FrameCtx);

export function ExpandButton({ className = "" }: { className?: string }) {
  const { canExpand, expanded, toggle } = useFrame();
  const tr = useTr();
  if (!canExpand) return null;
  const label = expanded ? tr("Thu nhỏ khung chat") : tr("Phóng to khung chat");
  return (
    <button type="button" onClick={toggle} aria-label={label} title={label} aria-pressed={expanded} className={`flex h-11 w-11 items-center justify-center rounded-full hover:bg-black/10 ${className}`}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {expanded ? <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /> : <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />}
      </svg>
    </button>
  );
}
