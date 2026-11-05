import { describe, expect, it, vi } from "vitest";
import { HubLlmGateway } from "./hubLlmGateway";
import { LlmUnavailableError } from "@/application/ports";

describe("shared gateway transport", () => {
  it("executes local tools from hub responses and sends tool results back without provider keys", async () => {
    const requests: Record<string, unknown>[] = [];
    const run = vi.fn(async () => ({ price: 199000 }));
    const fetchImpl: typeof fetch = async (url, init) => {
      expect(String(url)).toBe("https://hub.example/api/v1/ai/text/generate");
      expect((init?.headers as Record<string, string>)["x-api-key"]).toBe(
        "client-test-key",
      );
      requests.push(JSON.parse(String(init?.body)));
      return Response.json(
        requests.length === 1
          ? {
              model: "test-model",
              content: "",
              toolCalls: [
                {
                  id: "call1",
                  type: "function",
                  function: { name: "get_price", arguments: "{}" },
                },
              ],
              usage: { promptTokens: 10, completionTokens: 3 },
            }
          : {
              model: "test-model",
              content: "199.000đ",
              usage: { promptTokens: 15, completionTokens: 2 },
            },
      );
    };
    const gateway = new HubLlmGateway({
      baseUrl: "https://hub.example",
      apiKey: "client-test-key",
      models: { simple: ["test-model"], complex: ["test-model"] },
      fetchImpl,
    });
    const result = await gateway.respond({
      system: "Use tools",
      history: [],
      user: { text: "giá?" },
      tier: "simple",
      tools: [
        {
          name: "get_price",
          description: "price",
          inputSchema: { type: "object" },
          run,
        },
      ],
    });
    expect(run).toHaveBeenCalledOnce();
    expect(requests[0]).toMatchObject({
      provider: "openrouter",
      toolChoice: "auto",
      dataCollection: "deny",
    });
    expect(requests[1].messages).toContainEqual({
      role: "tool",
      tool_call_id: "call1",
      content: '{"price":199000}',
    });
    expect(result.text).toBe("199.000đ");
    expect(result.usage?.inputTokens).toBe(25);
  });
  it("classifies unavailable hub responses so the engine can fall back", async () => {
    const gateway = new HubLlmGateway({
      baseUrl: "https://hub.example",
      apiKey: "test",
      models: { simple: ["test"], complex: ["test"] },
      fetchImpl: async () => new Response("busy", { status: 503 }),
    });
    await expect(
      gateway.respond({
        system: "test",
        history: [],
        user: { text: "hi" },
        tier: "simple",
        tools: [],
      }),
    ).rejects.toBeInstanceOf(LlmUnavailableError);
  });
});
