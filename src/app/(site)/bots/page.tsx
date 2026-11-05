import type { Metadata } from "next";
import { BOT_METAS } from "@/bots/catalog";
import { liveCounts } from "@/lib/live-counts";
import { Container } from "@/components/site/Container";
import { BotCard, FinalCta, SectionHead } from "@/components/site/Sections";

export const metadata: Metadata = { title: "Danh mục chatbot", description: "Chọn chatbot đúng ngành: bán hàng & đặt lịch, tư vấn gạch ốp lát và nhiều ngành khác." };
export const dynamic = "force-dynamic";

export default async function BotsIndexPage() {
  const counts = await liveCounts();
  return (
    <>
      <section className="aurora border-b border-zinc-200 py-16 sm:py-20">
        <Container>
          <SectionHead eyebrow="Danh mục chatbot" title="Chọn chatbot cho ngành của bạn" subtitle="Mỗi chatbot có nghiệp vụ riêng; tất cả dùng chung AI, đặt lịch, live chat và báo cáo." />
          <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
            {BOT_METAS.map((m) => (
              <BotCard key={m.kind} meta={m} count={counts[m.kind] ?? 0} />
            ))}
          </ul>
        </Container>
      </section>
      <FinalCta title="Chưa biết chọn chatbot nào?" subtitle="Dùng thử cả hai trong 14 ngày — một tài khoản tạo được nhiều chatbot." />
    </>
  );
}
