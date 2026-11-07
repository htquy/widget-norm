"use client";

import type { TileCard } from "../catalog";
import type { QuoteOptions, SurfaceInput } from "../domain/quote";
import type { SurfaceKind } from "../domain/tile";
import type { QuoteRecord as QuoteRow } from "../repository";

export type { TileCard };
export type QuoteRecord = QuoteRow & { tileName: string };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Lỗi ${res.status}`);
  return data as T;
}

/** API riêng của bot gạch: /api/public/[tenant]/x/* (module tile) + sự kiện dùng chung */
export function tileApi(tenant: string, visitorId: string) {
  const base = `/api/public/${encodeURIComponent(tenant)}`;
  const post = <T,>(path: string, body: object) => call<T>(`${base}/${path}`, { method: "POST", body: JSON.stringify({ visitorId, ...body }) });
  return {
    catalog: () => call<{ tiles: TileCard[] }>(`${base}/x/catalog`),
    quote: (body: { conversationId: string | null; tileId: string; surfaces: SurfaceInput[]; options: QuoteOptions; surface?: SurfaceKind }) => post<{ quote: QuoteRecord }>("x/quote", body),
    lead: (body: { conversationId: string | null; quoteId: string | null; name: string; phone: string; note: string; previewBase64?: string }) => post<{ ok: true; leadId: string }>("x/lead", body),
    track: (type: "photo_uploaded" | "preview_rendered", extra: { conversationId?: string | null; tileId?: string | null } = {}) =>
      post<{ ok: boolean }>("events", { type, conversationId: extra.conversationId, refId: extra.tileId }).catch(() => undefined),
  };
}

export type WidgetApi = ReturnType<typeof tileApi>;
