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
} from "lucide-react";
import { ChatMock } from "./ChatMock";

export function ProductPreview() {
  return (
    <div className="product-preview">
      <div className="preview-bar">
        <span className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <i key={i} className="size-2 rounded-full bg-zinc-300" />
          ))}
        </span>
        <span>AVI workspace</span>
        <span className="text-emerald-800">Dữ liệu minh họa</span>
      </div>
      <div className="preview-content">
        <div className="preview-rail" aria-hidden="true">
          <span className="mb-6 grid size-9 place-items-center rounded-xl bg-brand-600 text-white">
            <Bot className="size-5" />
          </span>
          {[MessageSquare, Package, CalendarCheck, Users].map((I, i) => (
            <span
              key={i}
              className={`grid size-9 place-items-center rounded-lg ${i === 0 ? "bg-brand-100 text-brand-700" : "text-zinc-400"}`}
            >
              <I className="size-4" />
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1 p-4 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500">Cửa hàng AVI Shop</p>
              <p className="mt-1 text-lg font-semibold">
                Mỗi cuộc trò chuyện,
                <br />
                một cơ hội bán hàng.
              </p>
            </div>
            <Sparkles className="size-6 text-brand-600" />
          </div>
          <div className="mb-5 grid grid-cols-3 gap-2">
            {[
              [MessageSquare, "Tư vấn"],
              [CalendarCheck, "Đặt lịch"],
              [Headset, "Hỗ trợ"],
            ].map(([I, label]) => {
              const Icon = I as typeof Bot;
              return (
                <div
                  key={String(label)}
                  className="rounded-xl border border-zinc-200 bg-white p-3"
                >
                  <Icon className="mb-2 size-4 text-brand-600" />
                  <p className="text-[11px] font-medium text-zinc-600">
                    {String(label)}
                  </p>
                </div>
              );
            })}
          </div>
          <ChatMock kind="store" />
          <Link
            href="/signup"
            className="mt-4 flex min-h-11 items-center justify-between rounded-xl bg-brand-50 px-4 text-sm font-semibold text-brand-800"
          >
            Thử với dữ liệu cửa hàng bạn
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
      <div className="preview-note">
        <Check className="size-4 text-emerald-700" /> Giá và câu trả lời lấy từ
        danh mục của shop <Send className="ml-auto size-4 text-brand-600" />
      </div>
    </div>
  );
}

export function MaterialRoom() {
  return (
    <figure className="material-scene">
      <svg
        viewBox="0 0 720 620"
        role="img"
        aria-label="Minh họa phòng khách với sàn gạch và bảng chọn vật liệu"
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
        <span className="text-xs text-zinc-500">Phối cảnh minh họa</span>
        <strong>
          Không gian của bạn.
          <br />
          Vật liệu bạn chọn.
        </strong>
        <div className="mt-4 flex gap-2" aria-label="Mẫu vật liệu minh họa">
          <span className="swatch swatch-stone" />
          <span className="swatch swatch-wood" />
          <span className="swatch swatch-dark" />
        </div>
      </figcaption>
      <span className="material-tag">
        60 × 60 cm <span className="ml-2 text-zinc-500">Vân đá tự nhiên</span>
      </span>
    </figure>
  );
}
