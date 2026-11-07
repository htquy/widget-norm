"use client";

import { useEffect, useState } from "react";
import { spriteThumb } from "../vision/modelSprite";
import type { FurnitureCard } from "./api";

/**
 * Hình đại diện món: có mô hình 3D thì dựng ảnh thật từ chính mô hình đó (không dùng hình vẽ minh hoạ);
 * chưa có thì dùng ảnh/cutout của shop.
 */
export function ItemImage({ card, variant = "card" }: { card: FurnitureCard; variant?: "card" | "thumb" }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!card.modelUrl) return;
    let live = true;
    spriteThumb({ url: card.modelUrl, color: card.color, widthCm: card.widthCm, depthCm: card.depthCm, heightCm: card.heightCm, yaw: 28, pitch: 12 }, variant === "card" ? 360 : 120)
      .then((u) => live && setSrc(u))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [card.modelUrl, card.color, card.widthCm, card.depthCm, card.heightCm, variant]);

  if (variant === "thumb") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src ?? card.imageUrl} alt="" className={`h-10 w-12 shrink-0 rounded ${src ? "bg-[#efe8dc] object-contain p-0.5" : "object-cover"}`} />
    );
  }
  return src ? (
    <div className="flex aspect-[4/3] w-full items-center justify-center bg-gradient-to-b from-[#f7f3ed] to-[#e6dccd]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={card.name} className="h-full w-full object-contain p-2" />
    </div>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={card.imageUrl} alt={card.name} loading="lazy" className="aspect-[4/3] w-full object-cover" />
  );
}
