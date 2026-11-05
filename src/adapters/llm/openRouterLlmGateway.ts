import { LlmUnavailableError, type ChatTool, type LlmGateway, type LlmTier, type LlmTurnResult, type LlmUsage } from "@/application/ports";
import { cleanText, openRouterComplete, type OpenRouterBase } from "./openRouterClient";

const MAX_TOOL_ROUNDS = 5;
const FALLBACK_TEXT = "Xin lỗi bạn, mình chưa trả lời được câu này. Bạn để lại số điện thoại để nhân viên tư vấn trực tiếp nhé.";

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}
export type OpenAiMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface OpenRouterConfig extends OpenRouterBase {
  /**
   * Chuỗi model theo tầng (model đầu = chính, sau = dự phòng; OpenRouter tự chuyển khi lỗi/quá tải).
   * simple: câu dễ (model rẻ), complex: câu khó / jev không chắc (model mạnh).
   */
  models: Record<LlmTier, string[]>;
  maxTokens?: number;
}

/**
 * LLM chính qua OpenRouter (Chat Completions + tool calling, vòng lặp thủ công).
 * History lưu ở định dạng OpenAI, không gồm system prompt.
 */
export class OpenRouterLlmGateway implements LlmGateway {
  readonly id = "openrouter";

  constructor(private readonly cfg: OpenRouterConfig) {}

  describe() {
    return { simple: this.cfg.models.simple[0], complex: this.cfg.models.complex[0] };
  }

  async respond({ system, history, user, tools, tier }: { system: string; history: unknown[]; user: { text: string }; tools: ChatTool[]; tier: LlmTier }): Promise<LlmTurnResult> {
    const past = history as OpenAiMessage[];
    const turn: OpenAiMessage[] = [{ role: "user", content: user.text }];
    const models = this.cfg.models[tier];
    const usage: LlmUsage = { model: models[0], inputTokens: 0, outputTokens: 0, calls: 0 };
    const toolDefs = tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description, parameters: t.inputSchema } }));
    const finish = (text: string): LlmTurnResult => ({ text, history: [...past, ...turn], usage });

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const lastRound = round === MAX_TOOL_ROUNDS;
      const data = await openRouterComplete(this.id, this.cfg, {
        model: models[0],
        ...(models.length > 1 ? { models } : {}),
        messages: [{ role: "system", content: system }, ...past, ...turn],
        ...(toolDefs.length ? { tools: toolDefs, tool_choice: lastRound ? "none" : "auto" } : {}),
        max_tokens: this.cfg.maxTokens ?? 1200,
        temperature: 0.3,
      });
      usage.calls++;
      usage.inputTokens += data.usage?.prompt_tokens ?? 0;
      usage.outputTokens += data.usage?.completion_tokens ?? 0;
      if (data.model) usage.model = data.model;

      const msg = data.choices?.[0]?.message;
      if (!msg) throw new LlmUnavailableError(this.id, "bad_response", "Phản hồi không có nội dung");
      const calls = (msg.tool_calls ?? []).filter((c) => c?.function?.name);
      turn.push({ role: "assistant", content: msg.content ?? null, ...(calls.length ? { tool_calls: calls } : {}) });
      if (calls.length === 0) return finish(cleanText(msg.content) || FALLBACK_TEXT);

      const results = await Promise.all(
        calls.map(async (c): Promise<OpenAiMessage> => {
          const tool = tools.find((t) => t.name === c.function.name);
          if (!tool) return { role: "tool", tool_call_id: c.id, content: JSON.stringify({ error: `Không có công cụ ${c.function.name}` }) };
          let args: unknown;
          try {
            args = c.function.arguments ? JSON.parse(c.function.arguments) : {};
          } catch {
            return { role: "tool", tool_call_id: c.id, content: JSON.stringify({ error: "Tham số không phải JSON hợp lệ, hãy gọi lại" }) };
          }
          try {
            return { role: "tool", tool_call_id: c.id, content: JSON.stringify(await tool.run(args)) };
          } catch (e) {
            return { role: "tool", tool_call_id: c.id, content: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) };
          }
        }),
      );
      turn.push(...results);
    }
    return finish(FALLBACK_TEXT);
  }

  async complete({ system, user, tier, maxTokens }: { system: string; user: string; tier: LlmTier; maxTokens?: number }) {
    const models = this.cfg.models[tier];
    const data = await openRouterComplete(this.id, this.cfg, {
      model: models[0],
      ...(models.length > 1 ? { models } : {}),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens ?? 800,
      temperature: 0.3,
    });
    const text = cleanText(data.choices?.[0]?.message?.content);
    if (!text) throw new LlmUnavailableError(this.id, "bad_response", "Phản hồi rỗng");
    return { text, usage: { model: data.model ?? models[0], inputTokens: data.usage?.prompt_tokens ?? 0, outputTokens: data.usage?.completion_tokens ?? 0, calls: 1 } };
  }
}
