"use client";

import type { FurnitureCard } from "../catalog";
import type { StyleId } from "../design";
import type { Room } from "../domain";
import type { RoomSetView } from "../module";

export type { FurnitureCard, RoomSetView };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Lỗi ${res.status}`);
  return data as T;
}

/** API riêng của bot nội thất: /api/public/[tenant]/x/* */
export function furnitureApi(tenant: string, visitorId: string) {
  const base = `/api/public/${encodeURIComponent(tenant)}`;
  const post = <T,>(path: string, body: object) => call<T>(`${base}/${path}`, { method: "POST", body: JSON.stringify({ visitorId, ...body }) });
  return {
    catalog: () => call<{ items: FurnitureCard[] }>(`${base}/x/catalog`),
    design: (body: { conversationId: string | null; room: Room; style?: StyleId; budget?: number; roomWidthM?: number; roomDepthM?: number; existing: string[]; seats?: number; palette: string[] }) =>
      post<{ set: RoomSetView }>("x/design", body),
    similar: (embedding: number[]) => post<{ items: (FurnitureCard & { similarity: number })[] }>("x/similar", { embedding }),
    lead: (body: { conversationId: string | null; name: string; phone: string; note: string; design: string; total: number; previewBase64?: string }) => post<{ ok: true; leadId: string }>("x/lead", body),
    track: (type: "room_photo_uploaded", conversationId: string | null) => post<{ ok: boolean }>("events", { type, conversationId }).catch(() => undefined),
  };
}
export type FurnitureApi = ReturnType<typeof furnitureApi>;
