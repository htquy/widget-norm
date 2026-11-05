import "server-only";
import { BOT_METAS } from "@/bots/catalog";
import { app } from "@/infrastructure/container";

/** Số cửa hàng THẬT đang dùng từng loại chatbot (không tính bot demo của nền tảng) — dùng cho landing */
export async function liveCounts(): Promise<Record<string, number>> {
  const c = await app();
  const counts = await c.tenants.countByKind();
  const out: Record<string, number> = { ...counts };
  for (const m of BOT_METAS) {
    try {
      const demo = await c.tenants.bySlug(m.demoSlug);
      if (demo.kind === m.kind && out[m.kind]) out[m.kind] -= 1;
    } catch {
      /* chưa có bot demo */
    }
  }
  return out;
}
