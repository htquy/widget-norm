"use client";

import type { ProductCard } from "@/application/use-cases/catalog";
import type { PublicConfig } from "@/application/use-cases/tenants";
import type { Slot } from "@/domain/booking";
import type { ConversationMode, TranscriptEntry } from "@/domain/conversation";

export type { ProductCard, PublicConfig, Slot };
export type Entry = Omit<TranscriptEntry, "meta">;

export interface ServiceItem {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  description: string;
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Lỗi ${res.status}`);
  return data as T;
}

export function widgetApi(tenant: string, visitorId: string) {
  const base = `/api/public/${encodeURIComponent(tenant)}`;
  const post = <T,>(path: string, body: object) => call<T>(`${base}/${path}`, { method: "POST", body: JSON.stringify({ visitorId, ...body }) });
  const q = (o: Record<string, string>) => new URLSearchParams({ visitorId, ...o }).toString();
  return {
    config: (origin: string | null) =>
      call<{ config: PublicConfig; conversationId: string; mode: ConversationMode; rating: number | null; transcript: Entry[]; products: ProductCard[] }>(`${base}/config?${q(origin ? { origin } : {})}`),
    chat: (text: string) => post<{ conversationId: string; mode: ConversationMode; reply: Entry | null; products: ProductCard[] }>("chat", { text }),
    poll: (conversationId: string, after: string | null) => call<{ entries: Entry[]; mode: ConversationMode }>(`${base}/messages?${q({ conversationId, ...(after ? { after } : {}) })}`),
    lead: (body: { conversationId: string | null; name: string; phone: string; email: string; note: string }) => post<{ ok: true }>("lead", body),
    callback: (body: { conversationId: string; name: string; phone: string; note: string }) => post<{ ok: true }>("handoff", body),
    services: () => call<{ services: ServiceItem[] }>(`${base}/booking?view=services`),
    days: (serviceId: string) => call<{ days: { date: string; slots: number }[] }>(`${base}/booking?view=days&serviceId=${encodeURIComponent(serviceId)}`),
    slots: (serviceId: string, date: string) => call<{ slots: Slot[] }>(`${base}/booking?view=slots&serviceId=${encodeURIComponent(serviceId)}&date=${date}`),
    book: (body: { conversationId: string | null; serviceId: string; date: string; time: string; name: string; phone: string; note: string }) =>
      post<{ ok: true; booking: { id: string; startAt: string; status: string } }>("booking", body),
    feedback: (conversationId: string, entryId: string, value: 1 | -1) => post<{ ok: true }>("feedback", { conversationId, entryId, value }),
    rate: (conversationId: string, rating: number) => post<{ ok: true }>("feedback", { conversationId, rating }),
    track: (type: "widget_open" | "product_clicked" | "booking_opened", extra: { conversationId?: string | null; refId?: string | null } = {}) =>
      post<{ ok: boolean }>("events", { type, ...extra }).catch(() => undefined),
  };
}

export type WidgetApi = ReturnType<typeof widgetApi>;

/** Thông tin khách đã nhập (nhớ trong trình duyệt để không phải gõ lại) */
export function rememberContact(c?: { name: string; phone: string }): { name: string; phone: string } {
  try {
    if (c) localStorage.setItem("wn_contact", JSON.stringify(c));
    return JSON.parse(localStorage.getItem("wn_contact") ?? "null") ?? { name: "", phone: "" };
  } catch {
    return c ?? { name: "", phone: "" };
  }
}
