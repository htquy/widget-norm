"use client";

import { useT } from "@/lib/i18n/client";
import { CalendarCheck, Headset } from "lucide-react";
import type { BotKind } from "@/domain/tenant";

type Line = { from: "user" | "bot"; text: string };

/** Hội thoại ví dụ (dữ liệu của shop demo) — chỉ để minh hoạ, không phải số liệu khách hàng thật */
const SCRIPTS: Record<
  BotKind,
  {
    bot: string;
    accent: string;
    lines: Line[];
    card?: "booking" | "quote" | "handoff";
  }
> = {
  store: {
    bot: "AVI",
    accent: "#5f45e4",
    lines: [
      { from: "user", text: "Shop có quà tặng dưới 300.000đ không?" },
      {
        from: "bot",
        text: "Bình giữ nhiệt Everyday giá 249.000 ₫, còn hàng và có hộp quà. Bạn muốn xem thông số hay đặt lịch ghé shop?",
      },
      { from: "user", text: "Đơn hàng hôm qua của mình giao tới đâu rồi?" },
    ],
    card: "handoff",
  },
  tile: {
    bot: "Gạch Đẹp",
    accent: "#15476d",
    lines: [
      { from: "user", text: "Phòng khách 25m² nên lát gạch gì?" },
      {
        from: "bot",
        text: "Phòng khách rộng bạn nên chọn khổ lớn ít mạch ron, ví dụ Vân đá Botticino kem 80x80. Mình tính nhanh cho 25 m² nhé?",
      },
      { from: "user", text: "Báo giá giúp mình, lát thẳng" },
    ],
    card: "quote",
  },
  education: {
    bot: "Sao Mai",
    accent: "#0f766e",
    lines: [
      { from: "user", text: "Em mất gốc muốn thi IELTS 6.5 thì học lớp nào?" },
      {
        from: "bot",
        text: "Bạn nên bắt đầu IELTS Foundation (16 tuần) rồi lên Intensive 6.5+. Lớp T2-T4-T6 tối khai giảng sau 6 ngày, còn 9 chỗ. Đăng ký sớm giảm 10%.",
      },
      { from: "user", text: "Cho mình học thử một buổi được không?" },
    ],
    card: "booking",
  },
  furniture: {
    bot: "Nhà Gỗ",
    accent: "#9a5b2e",
    lines: [
      { from: "user", text: "Sofa góc L Milan có vừa góc phòng 3m x 2,5m không?" },
      {
        from: "bot",
        text: "Milan choán 280 × 160 cm nên đặt vừa, còn 20 cm chiều rộng và 90 cm chiều sâu để đi lại. Giá 21.500.000 ₫, còn 2 bộ. Bạn muốn đặt lịch đo đạc tại nhà không?",
      },
      { from: "user", text: "Ok, hẹn cuối tuần giúp mình" },
    ],
    card: "booking",
  },
};

export function ChatMock({
  kind,
  className = "",
  dark = false,
}: {
  kind: BotKind;
  className?: string;
  dark?: boolean;
}) {
  const t = useT();
  const s = SCRIPTS[kind];
  return (
    <figure
      className={`overflow-hidden rounded-3xl ${
        dark
          ? "border border-white/10 bg-[#0d1017] shadow-2xl"
          : "border-gradient shadow-lift"
      } ${className}`}
      aria-label={`${t("Ví dụ hội thoại với chatbot")} ${t(s.bot)}`}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 text-white"
        style={{ background: s.accent }}
      >
        <span
          className="grid size-9 place-items-center rounded-full bg-white/20 text-sm font-bold"
          aria-hidden="true"
        >
          {s.bot.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{t(s.bot)}</p>
          <p className="text-xs opacity-90">{t("Đang hoạt động")}</p>
        </div>
      </div>
      <div
        className={`space-y-2.5 p-4 ${
          dark ? "bg-[#0b0d13]" : "bg-zinc-50"
        }`}
      >
        {s.lines.map((l, i) => (
          <div
            key={i}
            className={`flex ${l.from === "user" ? "justify-end" : "justify-start"}`}
          >
            <p
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${
                l.from === "user"
                  ? "rounded-br-sm text-white"
                  : dark
                    ? "rounded-bl-sm border border-white/10 bg-[#161a24] text-white/90"
                    : "rounded-bl-sm border border-zinc-200 bg-white text-zinc-800"
              }`}
              style={l.from === "user" ? { background: s.accent } : undefined}
            >
              {t(l.text)}
            </p>
          </div>
        ))}
        {s.card === "handoff" && (
          <div
            className={`ml-0 rounded-2xl p-3 ${
              dark
                ? "border border-white/10 bg-[#161a24] text-white"
                : "border border-zinc-200 bg-white text-zinc-900"
            }`}
          >
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <Headset className="size-4" aria-hidden="true" /> {t("Kết nối với nhân viên")}
            </p>
            <p
              className={`mt-1 text-xs ${
                dark ? "text-white/50" : "text-zinc-500"
              }`}
            >
              {t("Câu này cần nhân viên của shop hỗ trợ để trả lời chính xác.")}
            </p>
            <span
              className="mt-2 inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold text-white shadow-sm"
              style={{ background: s.accent }}
            >
              {t("Để lại số, nhân viên gọi lại")}
            </span>
          </div>
        )}
        {s.card === "quote" && (
          <div
            className={`rounded-2xl p-3 text-[13px] ${
              dark
                ? "border border-white/10 bg-[#161a24] text-white"
                : "border border-zinc-200 bg-white text-zinc-900"
            }`}
          >
            <p className="flex items-center gap-2 font-semibold">
              <CalendarCheck className="size-4" aria-hidden="true" /> {t("Báo giá dự toán (ví dụ)")}
            </p>
            <p className={`mt-1 ${dark ? "text-white/60" : "text-zinc-600"}`}>
              {t("25 m² + hao hụt · gạch, keo dán, keo ron tính theo thông số shop cài.")}
            </p>
            <span
              className={`mt-2 inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold ${
                dark
                  ? "border border-white/20 bg-white/5 text-white"
                  : "border border-zinc-300 bg-white text-zinc-800"
              }`}
            >
              {t("Ướm thử trên ảnh phòng")}
            </span>
          </div>
        )}
      </div>
      <figcaption
        className={`border-t px-4 py-2 text-[11.5px] ${
          dark
            ? "border-white/5 bg-[#08090e] text-white/40"
            : "border-zinc-200 bg-white text-zinc-500"
        }`}
      >
        {t("Ví dụ minh hoạ với dữ liệu shop demo.")}
      </figcaption>
    </figure>
  );
}
