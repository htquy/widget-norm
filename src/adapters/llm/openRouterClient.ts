import { LlmUnavailableError } from "@/application/ports";

/** Gọi OpenRouter Chat Completions + phân loại lỗi thống nhất (dùng chung cho LLM chính và tầng jev). */

export interface OpenRouterBase {
  apiKey: string;
  baseUrl?: string;
  appUrl?: string;
  appName?: string;
  /** "deny" = chỉ dùng nhà cung cấp không lưu dữ liệu (model :free thường không có → "allow" khi test) */
  dataCollection?: "allow" | "deny";
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface CompletionResponse {
  model?: string;
  choices?: { message?: { content?: string | null; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] }; finish_reason?: string | null }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { code?: number | string; message?: string };
}

export async function openRouterComplete(provider: string, cfg: OpenRouterBase, body: Record<string, unknown>): Promise<CompletionResponse> {
  const doFetch = cfg.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await doFetch(`${cfg.baseUrl ?? "https://openrouter.ai/api/v1"}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
        ...(cfg.appUrl ? { "HTTP-Referer": cfg.appUrl } : {}),
        "X-Title": cfg.appName ?? "Widget Norm",
      },
      body: JSON.stringify({ ...body, provider: { data_collection: cfg.dataCollection ?? "allow", require_parameters: true, ...((body.provider as object) ?? {}) } }),
      signal: AbortSignal.timeout(cfg.timeoutMs ?? 45_000),
    });
  } catch (e) {
    const timeout = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    throw new LlmUnavailableError(provider, timeout ? "timeout" : "network", e instanceof Error ? e.message : String(e));
  }
  const data = (await res.json().catch(() => ({}))) as CompletionResponse;
  if (!res.ok || data.error) {
    const status = res.ok ? Number(data.error?.code) || 502 : res.status;
    const message = data.error?.message ?? `HTTP ${res.status}`;
    if (status === 429) throw new LlmUnavailableError(provider, "rate_limited", message);
    if (status === 401 || status === 403) throw new LlmUnavailableError(provider, "auth", message);
    if (status === 402) throw new LlmUnavailableError(provider, "payment", message);
    if (status >= 500 || status === 408) throw new LlmUnavailableError(provider, "overloaded", message);
    throw new LlmUnavailableError(provider, "bad_response", `${status}: ${message}`);
  }
  return data;
}

/** Một số model trả kèm khối suy nghĩ <think>…</think> trong content — bỏ đi. */
export function cleanText(s: string | null | undefined): string {
  return (s ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

/** Lấy object JSON đầu tiên trong chuỗi (model đôi khi bọc ```json ... ```) */
export function parseJsonObject(s: string): Record<string, unknown> | null {
  const t = cleanText(s);
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const v = JSON.parse(t.slice(start, end + 1));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
