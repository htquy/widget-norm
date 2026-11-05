import type { BotKind } from "@/domain/tenant";
import type { BotMeta } from "./meta-types";
import { storeMeta } from "./store/meta";
import { tileMeta } from "./tile/meta";

/** Danh mục các loại chatbot đang bán — thêm bot mới: tạo src/bots/<kind>/ và đăng ký ở đây + registry.ts */
export const BOT_METAS: BotMeta[] = [storeMeta, tileMeta];

export const metaByKind = (kind: BotKind): BotMeta =>
  BOT_METAS.find((m) => m.kind === kind) ?? storeMeta;
export const metaBySlug = (slug: string): BotMeta | undefined =>
  BOT_METAS.find((m) => m.slug === (slug === "tro-ly-ban-hang" ? "avi" : slug));

export type { BotMeta };
