"use client";

import { useT } from "@/lib/i18n/client";
import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  CalendarCheck,
  Check,
  ChevronRight,
  Headset,
  MessageSquare,
  Package,
  Send,
  Sparkles,
  Users,
  Grid3x3,
  GraduationCap,
  Armchair,
  ShoppingBag,
} from "lucide-react";
import { ChatMock } from "./ChatMock";
import type { BotKind } from "@/domain/tenant";

const BOT_TABS: {
  kind: BotKind;
  label: string;
  icon: typeof Bot;
  shopName: string;
  tagline: string;
  badge: string;
  color: string;
}[] = [
  {
    kind: "store",
    label: "AVI Bán lẻ",
    icon: ShoppingBag,
    shopName: "AVI Store",
    tagline: "Tư vấn hàng tồn kho, trả lời giá thật & đặt lịch",
    badge: "Đa ngành",
    color: "#8b5cf6",
  },
  {
    kind: "tile",
    label: "AVI Gạch",
    icon: Grid3x3,
    shopName: "Studio Gạch Hoàng Gia",
    tagline: "Tính số thùng theo m², keo dán ron & ướm ảnh phòng",
    badge: "Vật liệu",
    color: "#38bdf8",
  },
  {
    kind: "education",
    label: "Luyện thi IELTS",
    icon: GraduationCap,
    shopName: "Học viện Sao Mai",
    tagline: "Test nhanh 15 câu, xếp lớp theo band & học phí",
    badge: "Giáo dục",
    color: "#2dd4bf",
  },
  {
    kind: "furniture",
    label: "Nội thất",
    icon: Armchair,
    shopName: "Showroom Nhà Gỗ",
    tagline: "Kiểm tra kích thước sofa vừa phòng khách & hẹn đo",
    badge: "Thiết kế",
    color: "#fb923c",
  },
];

export function ProductPreview() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<BotKind>("store");
  const current = BOT_TABS.find((t) => t.kind === activeTab) ?? BOT_TABS[0];

  return (
    <div className="relative">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 rounded-3xl opacity-40 blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${current.color}45, transparent 70%)`,
        }}
      />

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c11] shadow-[0_24px_70px_-15px_rgba(0,0,0,0.8),0_0_60px_-15px_rgba(95,69,228,0.2)] transition-all">
        {/* Top window bar */}
        <div className="bg-[#0d1017] px-4 py-3 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex gap-1.5" aria-hidden="true">
              <i className="size-2.5 rounded-full bg-rose-500/80" />
              <i className="size-2.5 rounded-full bg-amber-500/80" />
              <i className="size-2.5 rounded-full bg-emerald-500/80" />
            </span>
            <span className="ml-2 text-xs font-semibold text-white/70">
              Widget Norm Workspace
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t("AI trực tuyến 24/7")}</span>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex overflow-x-auto border-b border-white/5 bg-white/[0.02] p-1.5 gap-1 text-xs">
          {BOT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.kind === activeTab;
            return (
              <button
                key={tab.kind}
                type="button"
                onClick={() => setActiveTab(tab.kind)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-white/10 text-white shadow-sm ring-1 ring-white/15 font-semibold"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon
                  className="size-3.5"
                  style={{ color: isActive ? tab.color : undefined }}
                />
                <span>{t(tab.label)}</span>
              </button>
            );
          })}
        </div>

        {/* Workspace body */}
        <div className="flex flex-col sm:flex-row bg-[#0b0d13]">
          {/* Side rail */}
          <div
            className="hidden sm:flex flex-col gap-2 p-3 border-r border-white/5 bg-[#08090d]"
            aria-hidden="true"
          >
            <span
              className="mb-3 grid size-8 place-items-center rounded-xl text-white shadow-md"
              style={{ background: current.color }}
            >
              <Bot className="size-4" />
            </span>
            {[MessageSquare, Package, CalendarCheck, Users].map((I, i) => (
              <span
                key={i}
                className={`grid size-8 place-items-center rounded-lg transition-colors ${
                  i === 0
                    ? "bg-white/10 text-white"
                    : "text-white/30 hover:text-white/60"
                }`}
              >
                <I className="size-4" />
              </span>
            ))}
          </div>

          {/* Main stage */}
          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white">
                    {t(current.shopName)}
                  </span>
                  <span className="rounded bg-white/10 px-1.5 py-0.2 text-[10px] text-white/60">
                    {t(current.badge)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-white/50">{t(current.tagline)}</p>
              </div>
              <Sparkles
                className="size-4 shrink-0 transition-colors"
                style={{ color: current.color }}
              />
            </div>

            {/* Dynamic Chat Mock in Dark Mode */}
            <ChatMock kind={activeTab} dark={true} />

            <div className="mt-3 flex items-center justify-between gap-2">
              <Link
                href={`/signup?bot=${activeTab === "store" ? "avi" : activeTab === "tile" ? "tu-van-gach-op-lat" : activeTab === "education" ? "luyen-thi-ielts" : "tu-van-noi-that"}`}
                className="flex flex-1 min-h-10 items-center justify-between rounded-xl bg-white/10 hover:bg-white/15 px-3.5 text-xs font-semibold text-white border border-white/10 transition-colors"
              >
                <span>{t("Dùng thử chatbot {label} cho shop", { label: t(current.label) })}</span>
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom indicator note */}
        <div className="flex items-center justify-between gap-2 bg-[#08090d] px-4 py-2.5 text-xs text-white/60 border-t border-white/5">
          <span className="flex items-center gap-1.5">
            <Check className="size-3.5 text-emerald-400" />
            <span>{t("Phép tính tất định & dữ liệu shop thực")}</span>
          </span>
          <span className="flex items-center gap-1 text-[11px] font-medium text-brand-300">
            <Send className="size-3" />
            <span>{t("Tốc độ < 0.8s")}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function MaterialRoom() {
  const t = useT();
  return (
    <figure className="material-scene">
      <svg
        viewBox="0 0 720 620"
        role="img"
        aria-label={t("Minh họa phòng khách với sàn gạch và bảng chọn vật liệu")}
        className="w-full"
      >
        <defs>
          <linearGradient id="wall" x2="0" y2="1">
            <stop stopColor="#e8e8e1" />
            <stop offset="1" stopColor="#c5d1cd" />
          </linearGradient>
          <linearGradient id="floor" x2="1" y2="1">
            <stop stopColor="#dad6ca" />
            <stop offset="1" stopColor="#f6f2e8" />
          </linearGradient>
          <pattern
            id="stone"
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M0 16C45 54 52 3 100 50M0 70C34 35 46 100 100 83"
              fill="none"
              stroke="#aca796"
              strokeOpacity=".25"
              strokeWidth="2"
            />
          </pattern>
        </defs>
        <rect width="720" height="620" fill="url(#wall)" />
        <path d="M0 360H720V620H0Z" fill="url(#floor)" />
        <path d="M0 360H720V620H0Z" fill="url(#stone)" />
        <g stroke="#a9a99d" strokeWidth="1.5" opacity=".65">
          <path d="M0 400H720M0 467H720M0 565H720M280 360L40 620M360 360V620M440 360L680 620M200 360L-200 620M520 360L920 620" />
        </g>
        <rect x="70" y="50" width="195" height="250" rx="3" fill="#f7fbf7" />
        <path d="M168 50V300M70 175H265" stroke="#a2b3ae" strokeWidth="7" />
        <path
          d="M70 50H97V300H70M242 50H265V300H242"
          fill="#fcfaf3"
          opacity=".6"
        />
        <ellipse
          cx="458"
          cy="460"
          rx="157"
          ry="26"
          fill="#616d65"
          opacity=".15"
        />
        <rect x="320" y="287" width="300" height="113" rx="20" fill="#6e7d72" />
        <rect x="305" y="342" width="330" height="85" rx="17" fill="#829184" />
        <rect x="325" y="322" width="140" height="66" rx="14" fill="#94a192" />
        <rect x="477" y="322" width="140" height="66" rx="14" fill="#a6b09f" />
        <path d="M330 425V444M610 425V444" stroke="#3d4a41" strokeWidth="10" />
        <ellipse cx="285" cy="471" rx="100" ry="36" fill="#856f53" />
        <path
          d="M252 478L239 540M319 480L334 540"
          stroke="#6c5942"
          strokeWidth="9"
        />
        <rect x="270" y="433" width="25" height="36" rx="4" fill="#e9e1ce" />
        <path d="M655 365V206" stroke="#6a7460" strokeWidth="5" />
        <path
          d="M654 270C590 250 600 210 653 240M655 240C710 221 704 187 655 213M655 216C613 175 623 150 654 179"
          fill="#677c57"
        />
        <path d="M630 355H680L670 408H640Z" fill="#bfae95" />
        <rect
          x="395"
          y="91"
          width="155"
          height="130"
          fill="#ddd5c5"
          stroke="#a99e88"
          strokeWidth="6"
        />
        <path d="M413 204L460 117L496 204Z" fill="#8e9c88" />
        <circle cx="506" cy="129" r="17" fill="#bd9766" />
      </svg>
      <figcaption className="material-caption">
        <span className="text-xs text-zinc-500">{t("Phối cảnh minh họa")}</span>
        <strong>
          {t("Không gian của bạn.")}
          <br />
          {t("Vật liệu bạn chọn.")}
        </strong>
        <div className="mt-4 flex gap-2" aria-label={t("Mẫu vật liệu minh họa")}>
          <span className="swatch swatch-stone" />
          <span className="swatch swatch-wood" />
          <span className="swatch swatch-dark" />
        </div>
      </figcaption>
      <span className="material-tag">
        60 × 60 cm <span className="ml-2 text-zinc-500">{t("Vân đá tự nhiên")}</span>
      </span>
    </figure>
  );
}
