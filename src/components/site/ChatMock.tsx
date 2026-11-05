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
};

export function ChatMock({
  kind,
  className = "",
}: {
  kind: BotKind;
  className?: string;
}) {
  const s = SCRIPTS[kind];
  return (
    <figure
      className={`overflow-hidden rounded-3xl border-gradient shadow-lift ${className}`}
      aria-label={`Ví dụ hội thoại với chatbot ${s.bot}`}
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
          <p className="truncate text-sm font-semibold">{s.bot}</p>
          <p className="text-xs opacity-90">Đang hoạt động</p>
        </div>
      </div>
      <div className="space-y-2.5 bg-zinc-50 p-4">
        {s.lines.map((l, i) => (
          <div
            key={i}
            className={`flex ${l.from === "user" ? "justify-end" : "justify-start"}`}
          >
            <p
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[13.5px] leading-relaxed ${l.from === "user" ? "rounded-br-sm text-white" : "rounded-bl-sm border border-zinc-200 bg-white text-zinc-800"}`}
              style={l.from === "user" ? { background: s.accent } : undefined}
            >
              {l.text}
            </p>
          </div>
        ))}
        {s.card === "handoff" && (
          <div className="ml-0 rounded-2xl border border-zinc-200 bg-white p-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-zinc-900">
              <Headset className="size-4" aria-hidden="true" /> Kết nối với nhân
              viên
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Câu này cần nhân viên của shop hỗ trợ để trả lời chính xác.
            </p>
            <span
              className="mt-2 inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold text-white"
              style={{ background: s.accent }}
            >
              Để lại số, nhân viên gọi lại
            </span>
          </div>
        )}
        {s.card === "quote" && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-[13px]">
            <p className="flex items-center gap-2 font-semibold text-zinc-900">
              <CalendarCheck className="size-4" aria-hidden="true" /> Báo giá dự
              toán (ví dụ)
            </p>
            <p className="mt-1 text-zinc-600">
              25 m² + hao hụt · gạch, keo dán, keo ron tính theo thông số shop
              cài.
            </p>
            <span className="mt-2 inline-flex min-h-9 items-center rounded-lg border border-zinc-300 px-3 text-xs font-semibold text-zinc-800">
              Ướm thử trên ảnh phòng
            </span>
          </div>
        )}
      </div>
      <figcaption className="border-t border-zinc-200 bg-white px-4 py-2 text-[11.5px] text-zinc-500">
        Ví dụ minh hoạ với dữ liệu shop demo.
      </figcaption>
    </figure>
  );
}
