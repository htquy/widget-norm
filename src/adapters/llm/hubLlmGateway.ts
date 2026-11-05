import type { LlmGateway, LlmTier } from "@/application/ports";
import { OpenRouterLlmGateway } from "./openRouterLlmGateway";

/** Reuse the existing bounded tool loop. This transport obtains responses, never provider keys. */
export class HubLlmGateway implements LlmGateway {
  readonly id = "hub";
  private readonly engine: OpenRouterLlmGateway;
  constructor(config: {
    baseUrl: string;
    apiKey: string;
    models: Record<LlmTier, string[]>;
    provider?: string;
    fetchImpl?: typeof fetch;
  }) {
    const transport: typeof fetch = async (_url, init) => {
      const input = JSON.parse(String(init?.body ?? "{}"));
      const response = await (config.fetchImpl ?? fetch)(
        `${config.baseUrl.replace(/\/$/, "")}/api/v1/ai/text/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": config.apiKey,
          },
          signal: init?.signal,
          body: JSON.stringify({
            provider: config.provider ?? "openrouter",
            model: input.model,
            messages: input.messages.map((m: { content: unknown }) => ({
              ...m,
              content: m.content ?? "",
            })),
            tools: input.tools,
            toolChoice: input.tool_choice,
            maxTokens: input.max_tokens,
            temperature: input.temperature,
            dataCollection: "deny",
          }),
        },
      );
      if (!response.ok) return response;
      const result = await response.json();
      return Response.json({
        model: result.model,
        choices: [
          {
            message: { content: result.content, tool_calls: result.toolCalls },
            finish_reason: result.finishReason,
          },
        ],
        usage: {
          prompt_tokens: result.usage?.promptTokens,
          completion_tokens: result.usage?.completionTokens,
        },
      });
    };
    this.engine = new OpenRouterLlmGateway({
      apiKey: config.apiKey,
      models: config.models,
      fetchImpl: transport,
    });
  }
  describe() {
    return this.engine.describe();
  }
  respond(input: Parameters<LlmGateway["respond"]>[0]) {
    return this.engine.respond(input);
  }
  complete(input: Parameters<NonNullable<LlmGateway["complete"]>>[0]) {
    return this.engine.complete(input);
  }
}
