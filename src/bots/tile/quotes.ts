import { DomainError } from "@/domain/errors";
import { calculateQuote, type QuoteOptions, type SurfaceInput } from "./domain/quote";
import type { SurfaceKind } from "./domain/tile";
import type { QuoteRecord, TileRepos } from "./repository";

export function makeQuotes(deps: { repos: TileRepos; track: (e: { tenantId: string; visitorId: string; type: string; variant: string; conversationId: string | null; refId: string; value: number }) => Promise<void> }) {
  return {
    async create(input: {
      tenantId: string;
      visitorId: string;
      variant: string;
      conversationId: string | null;
      tileId: string;
      surfaces: SurfaceInput[];
      options: QuoteOptions;
      /** Bề mặt khách định lát — để cảnh báo mẫu không hợp (vd gạch bóng ngoài trời) */
      surface?: SurfaceKind;
    }): Promise<QuoteRecord & { tileName: string }> {
      const tile = await deps.repos.tiles.findById(input.tenantId, input.tileId);
      if (!tile) throw new DomainError("TILE_NOT_FOUND", "Không tìm thấy mẫu gạch");
      const { pricing } = await deps.repos.settings.get(input.tenantId);
      const result = calculateQuote(tile, input.surfaces, input.options, pricing, { surface: input.surface });
      const saved = await deps.repos.quotes.save({ tenantId: input.tenantId, conversationId: input.conversationId, tileId: tile.id, surfaces: input.surfaces, options: input.options, result });
      await deps.track({ tenantId: input.tenantId, visitorId: input.visitorId, type: "quote_created", variant: input.variant, conversationId: input.conversationId, refId: tile.id, value: result.total });
      return { ...saved, tileName: tile.name };
    },
    async get(tenantId: string, id: string): Promise<(QuoteRecord & { tileName: string }) | null> {
      const q = await deps.repos.quotes.findById(tenantId, id);
      if (!q) return null;
      const tile = await deps.repos.tiles.findById(tenantId, q.tileId);
      return { ...q, tileName: tile?.name ?? "(đã xoá)" };
    },
  };
}

export type Quotes = ReturnType<typeof makeQuotes>;
