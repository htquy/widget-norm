import { LlmUnavailableError, type DecisionGateway } from "@/application/ports";
import { HubLlmGateway } from "./hubLlmGateway";
import { buildDecisionPrompt, toDecision } from "./jevDecisionGateway";
import { parseJsonObject } from "./openRouterClient";

/** Decision classification uses the same central key boundary as the answering model. */
export class HubDecisionGateway implements DecisionGateway {
  readonly id = "hub-jev";
  private readonly gateway: HubLlmGateway;
  constructor(
    private readonly config: {
      baseUrl: string;
      apiKey: string;
      model: string;
      provider?: string;
    },
  ) {
    this.gateway = new HubLlmGateway({
      ...config,
      models: { simple: [config.model], complex: [config.model] },
    });
  }
  get model() {
    return this.config.model;
  }
  async classify({
    text,
    recent,
    shop,
  }: Parameters<DecisionGateway["classify"]>[0]) {
    const context = recent.map((m) => `${m.role}: ${m.text}`).join("\n");
    const response = await this.gateway.complete({
      system: buildDecisionPrompt(shop),
      user: `${context}\n<tin_nhan_khach>\n${text.slice(0, 1500)}\n</tin_nhan_khach>`,
      tier: "simple",
      maxTokens: 400,
    });
    const decision = toDecision(
      parseJsonObject(response.text),
      response.usage?.model ?? this.model,
    );
    if (!decision)
      throw new LlmUnavailableError(
        this.id,
        "bad_response",
        "Không đọc được quyết định từ hub",
      );
    return { ...decision, usage: response.usage };
  }
}
