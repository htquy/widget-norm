import type { BotKind } from "@/domain/tenant";
import type { BotMeta } from "./meta-types";
import { storeMeta } from "./store/meta";
import { tileMeta } from "./tile/meta";
import { educationMeta } from "./education/meta";
import { furnitureMeta } from "./furniture/meta";

/** Danh mục các loại chatbot đang bán — thêm bot mới: tạo src/bots/<kind>/ và đăng ký ở đây + registry.ts */
export const BOT_METAS: BotMeta[] = [storeMeta, tileMeta, educationMeta, furnitureMeta];

export const metaByKind = (kind: BotKind): BotMeta =>
  BOT_METAS.find((m) => m.kind === kind) ?? storeMeta;
/** Slug cũ → slug mới (giữ link cũ hoạt động) */
const SLUG_ALIASES: Partial<Record<string, string>> = { "tro-ly-ban-hang": "avi", "tu-van-tuyen-sinh": "luyen-thi-ielts" };
export const metaBySlug = (slug: string): BotMeta | undefined =>
  BOT_METAS.find((m) => m.slug === (SLUG_ALIASES[slug] ?? slug));

export type { BotMeta };
