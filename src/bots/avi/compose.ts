import type { BotModule } from "../types";

/** Compose capabilities through ports; an industry module never reads the core's schema. */
export function composeWithAvi(
  core: BotModule,
  extension: BotModule,
): BotModule {
  return {
    ...extension,
    clientEvents: [
      ...new Set([...core.clientEvents, ...extension.clientEvents]),
    ],
    tools: (ctx) => {
      const tools = [...core.tools(ctx), ...extension.tools(ctx)];
      if (new Set(tools.map((t) => t.name)).size !== tools.length)
        throw new Error("Industry tools must not override AVI capabilities");
      return tools;
    },
    promptLines: (tenant, variant) => [
      ...core.promptLines(tenant, variant),
      ...extension.promptLines(tenant, variant),
    ],
    async groundingFacts(tenant) {
      const facts = await Promise.all([
        core.groundingFacts(tenant),
        extension.groundingFacts(tenant),
      ]);
      return {
        amounts: [...new Set(facts.flatMap((f) => f.amounts))],
        skus: [...new Set(facts.flatMap((f) => f.skus))],
      };
    },
    async shopSummary(id) {
      return (
        await Promise.all([core.shopSummary(id), extension.shopSummary(id)])
      ).join("\n");
    },
    async cards(id, ids) {
      return (
        await Promise.all([core.cards(id, ids), extension.cards(id, ids)])
      ).flat();
    },
    async namesByIds(id, ids) {
      return new Map(
        (
          await Promise.all([
            core.namesByIds(id, ids),
            extension.namesByIds(id, ids),
          ])
        ).flatMap((m) => [...m]),
      );
    },
    async resolveExtras(id, extras) {
      return Object.assign(
        {},
        ...(await Promise.all([
          core.resolveExtras(id, extras),
          extension.resolveExtras(id, extras),
        ])),
      );
    },
    async publicConfig(tenant, visitor) {
      return {
        ...(await core.publicConfig(tenant, visitor)),
        ...(await extension.publicConfig(tenant, visitor)),
      };
    },
    async onCreate(id) {
      await core.onCreate(id);
      await extension.onCreate(id);
    },
    // Fixtures belong to the industry; inheriting capabilities must not inject unrelated demo inventory.
    seedDemo: (id) => extension.seedDemo(id),
  };
}
