"use client";

import { createContext, useContext } from "react";
import type { ChatLang } from "@/domain/chat-text";
import { interpolate } from "@/lib/i18n/config";
import { lookup } from "@/lib/i18n/lookup";
import { WIDGET_DICTIONARIES } from "@/lib/i18n/widget";

/**
 * Chữ trong widget theo ngôn ngữ của chatbot (cài đặt của bot, không phải ngôn ngữ trình duyệt):
 * khoá là câu tiếng Việt gốc, giá trị là bản tiếng Anh; thiếu bản dịch thì hiện câu gốc.
 */

export type Tr = (vi: string, vars?: Record<string, string | number>) => string;
export const makeTr = (lang: ChatLang): Tr => (vi, vars) => interpolate(lookup(WIDGET_DICTIONARIES, lang, vi), vars);
/** Câu lắp ghép: dùng hàm thay vì khoá cố định */
export const widgetPhrases = (lang: ChatLang) => ({
  call: (phone: string) => (lang !== "vi" ? `Call ${phone}` : `Gọi ${phone}`),
  askMore: (name: string) => (lang !== "vi" ? `Tell me more about ${name}` : `Cho mình biết thêm về ${name}`),
  confirmAt: (time: string) => (lang !== "vi" ? `Confirm booking at ${time}` : `Xác nhận đặt lúc ${time}`),
  booked: (confirmed: boolean, service: string, time: string, d: number, m: number) =>
    lang !== "vi"
      ? `Booking ${confirmed ? "confirmed" : "received"}: ${service} at ${time} on ${m}/${d}. ${confirmed ? "See you then!" : "The shop will call to confirm soon."}`
      : `Đã ${confirmed ? "xác nhận" : "ghi nhận"} lịch ${service} lúc ${time} ngày ${d}/${m}. ${confirmed ? "Hẹn gặp bạn nhé!" : "Shop sẽ gọi xác nhận sớm."}`,
});

const Ctx = createContext<{ lang: ChatLang; tr: Tr }>({ lang: "vi", tr: makeTr("vi") });
export function TrProvider({ lang, children }: { lang: ChatLang; children: React.ReactNode }) {
  return <Ctx.Provider value={{ lang, tr: makeTr(lang) }}>{children}</Ctx.Provider>;
}
export const useTr = () => useContext(Ctx).tr;
export const useChatLang = () => useContext(Ctx).lang;
