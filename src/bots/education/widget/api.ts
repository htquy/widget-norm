"use client";

import type { PathwayView } from "../module";
import type { PlacementResult, PublicQuestion } from "../placement";

export type { PathwayView, PlacementResult, PublicQuestion };

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Lỗi ${res.status}`);
  return data as T;
}

/** API riêng của bot IELTS: /api/public/[tenant]/x/* */
export function educationApi(tenant: string, visitorId: string) {
  const base = `/api/public/${encodeURIComponent(tenant)}`;
  const post = <T,>(path: string, body: object) => call<T>(`${base}/${path}`, { method: "POST", body: JSON.stringify({ visitorId, ...body }) });
  return {
    questions: () => call<{ questions: PublicQuestion[] }>(`${base}/x/test`),
    grade: (body: { conversationId: string | null; answers: Record<string, number>; targetBand?: number; examDate?: string }) => post<{ result: PlacementResult; pathway: PathwayView | null }>("x/test", body),
    pathway: (body: { current: number; target: number; examDate?: string }) => post<{ pathway: PathwayView }>("x/pathway", body),
    lead: (body: { conversationId: string | null; name: string; phone: string; note: string; band?: number; cefr?: string; target?: number; examDate?: string; plan: string }) => post<{ ok: true }>("x/lead", body),
    track: (type: "placement_started", conversationId: string | null) => post<{ ok: boolean }>("events", { type, conversationId }).catch(() => undefined),
  };
}
export type EducationApi = ReturnType<typeof educationApi>;
