import type { Translate } from "@/lib/i18n/translate";
import type { BotMeta } from "./meta-types";

/**
 * Dịch toàn bộ chữ của một BotMeta (tên, khẩu hiệu, tính năng, các bước, câu hỏi mẫu, FAQ…) sang ngôn ngữ giao diện.
 * Nội dung gốc tiếng Việt nằm ở bots/<loại>/meta.ts; bản dịch ở lib/i18n/messages/<mã>/bot-pages.ts + bots.ts.
 */
export function localizeMeta(m: BotMeta, t: Translate): BotMeta {
  const pair = (x: { title: string; text: string }) => ({ ...x, title: t(x.title), text: t(x.text) });
  return {
    ...m,
    name: t(m.name),
    shortName: t(m.shortName),
    tagline: t(m.tagline),
    description: t(m.description),
    pricingNote: m.pricingNote ? t(m.pricingNote) : m.pricingNote,
    industries: m.industries.map((s) => t(s)),
    heroPoints: m.heroPoints.map((s) => t(s)),
    features: m.features.map((f) => ({ ...f, ...pair(f) })),
    steps: m.steps.map((x) => ({ ...x, ...pair(x) })),
    useCases: m.useCases.map((x) => ({ ...x, ...pair(x) })),
    sampleQuestions: m.sampleQuestions.map((s) => t(s)),
    faq: m.faq.map((f) => ({ q: t(f.q), a: t(f.a) })),
  };
}
