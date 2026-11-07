import { localizeMeta } from "@/bots/localize";
import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { BOT_METAS } from "@/bots/catalog";
import { liveCounts } from "@/lib/live-counts";
import { Container } from "@/components/site/Container";
import { BotCard, FinalCta, SectionHead } from "@/components/site/Sections";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
  title: t("Danh mục chatbot"),
  description:
    t("Chọn chatbot đúng ngành: bán hàng & đặt lịch, tư vấn gạch ốp lát, luyện thi IELTS và tư vấn nội thất."),
};
}
export const dynamic = "force-dynamic";

export default async function BotsIndexPage() {
  const { t } = await getT();
  const counts = await liveCounts();
  return (
    <>
      <section className="border-b border-zinc-200/80 bg-zinc-50/70 py-16 sm:py-20 transition-colors dark:border-white/10 dark:bg-[#07080b]">
        <Container>
          <SectionHead
            eyebrow={t("Danh mục chatbot")}
            title={t("Chọn chatbot cho ngành của bạn")}
            subtitle={t("Mỗi chatbot có nghiệp vụ chữ ký riêng; tất cả dùng chung Jev Engine, đặt lịch thông minh, live chat và báo cáo chuyển đổi.")}
          />
          <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
            {BOT_METAS.map((raw) => localizeMeta(raw, t)).map((m) => (
              <BotCard key={m.kind} meta={m} count={counts[m.kind] ?? 0} />
            ))}
          </ul>
        </Container>
      </section>
      <FinalCta
        title={t("Chưa biết chọn chatbot nào?")}
        subtitle={t("Dùng thử miễn phí trong 14 ngày — một tài khoản có thể kích hoạt nhiều chatbot.")}
      />
    </>
  );
}
