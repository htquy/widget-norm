import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { BOT_METAS, metaBySlug } from "@/bots/catalog";
import { ChatMock } from "@/components/site/ChatMock";
import { Container } from "@/components/site/Container";
import { Icon } from "@/components/site/Icon";
import { Faq, FinalCta, SectionHead } from "@/components/site/Sections";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BOT_METAS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = metaBySlug((await params).slug);
  return m ? { title: m.name, description: m.tagline } : {};
}

/** Trang giới thiệu riêng của từng chatbot — nội dung lấy từ meta.ts của module bot */
export default async function BotPage({ params }: Props) {
  const meta = metaBySlug((await params).slug);
  if (!meta) notFound();
  const signup = `/signup?bot=${meta.slug}`;
  return (
    <>
      {/* Hero */}
      <section className="aurora border-b border-zinc-200 bg-white py-16 sm:py-24">
        <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 -z-10" />
        <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <nav aria-label="Đường dẫn" className="text-sm text-zinc-500">
              <Link href="/bots" className="hover:text-brand-700">
                Chatbot
              </Link>{" "}
              / <span className="text-zinc-800">{meta.shortName}</span>
            </nav>
            <div className="mt-4 flex items-center gap-3">
              <span className={`inline-grid size-12 place-items-center rounded-xl ${meta.tile}`}>
                <Icon name={meta.icon} className="size-6" />
              </span>
              <span className="eyebrow">{meta.status === "live" ? "Đang mở bán" : "Bản thử nghiệm"}</span>
            </div>
            <h1 className="mt-5 max-w-[680px] text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl [text-wrap:balance]">{meta.name}</h1>
            <p className="mt-5 max-w-[620px] text-lg leading-relaxed text-zinc-600 [text-wrap:pretty]">{meta.description}</p>
            <ul className="mt-6 space-y-2">
              {meta.heroPoints.map((p) => (
                <li key={p} className="flex gap-2.5 text-[15px] text-zinc-800">
                  <Check className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={signup} className="btn-primary group text-base">
                Dùng thử {meta.shortName.toLowerCase()} miễn phí
                <ArrowRight className="size-4 transition-transform duration-500 ease-fluid group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link href="/pricing" className="btn-secondary text-base">
                Xem bảng giá
              </Link>
            </div>
            <p className="mt-4 text-sm text-zinc-500">Bấm nút chat ở góc phải màn hình để thử bot demo của ngành này.</p>
          </div>
          <div className="relative lg:col-span-5">
            <div aria-hidden="true" className="absolute -inset-6 -z-10 hidden rounded-[2.5rem] bg-gradient-to-br from-brand-300/50 via-violet-300/40 to-spark-200/50 blur-2xl sm:block" />
            <ChatMock kind={meta.kind} className="md:animate-float" />
          </div>
        </Container>
      </section>

      {/* Tính năng */}
      <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Tính năng" title={`${meta.shortName}: những gì bạn nhận được`} />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {meta.features.map((f) => (
              <li key={f.title} className="card-lift reveal rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8">
                <span className={`inline-grid size-12 place-items-center rounded-xl ${meta.tile}`}>
                  <Icon name={f.icon} className="size-6" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-zinc-950">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">{f.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Cách triển khai */}
      <section className="border-b border-zinc-200 bg-gradient-to-b from-white to-brand-50/50 py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Triển khai" title="Ba bước để chạy trên website của bạn" />
          <ol className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
            {meta.steps.map((s, i) => (
              <li key={s.title} className="card-lift reveal rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8">
                <div className="inline-grid size-12 place-items-center rounded-2xl bg-zinc-950 font-mono text-base font-bold text-white shadow-glow">
                  <span className="text-gradient">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-5 text-lg font-bold text-zinc-950">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">{s.text}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Ngành & tình huống */}
      <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHead eyebrow="Tình huống" title="Dùng vào việc gì" />
            <ul className="mt-8 space-y-4">
              {meta.useCases.map((u) => (
                <li key={u.title} className="rounded-2xl border border-zinc-200 p-5">
                  <h3 className="text-base font-bold text-zinc-950">{u.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">{u.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHead eyebrow="Thử hỏi bot" title="Khách thường hỏi" subtitle="Mở khung chat ở góc phải và thử các câu này." />
            <ul className="mt-8 space-y-3">
              {meta.sampleQuestions.map((q) => (
                <li key={q} className="rounded-2xl bg-zinc-50 px-5 py-3 text-[15px] text-zinc-800 ring-1 ring-zinc-200">
                  “{q}”
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-zinc-500">Phù hợp: {meta.industries.join(" · ")}</p>
            {meta.pricingNote && <p className="mt-2 text-sm text-zinc-500">{meta.pricingNote}</p>}
          </div>
        </Container>
      </section>

      <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Câu hỏi thường gặp" title={`Về ${meta.shortName.toLowerCase()}`} />
          <Faq items={meta.faq} />
        </Container>
      </section>

      <FinalCta title={`Thử ${meta.shortName.toLowerCase()} cho cửa hàng của bạn`} subtitle="Đăng ký trong 1 phút, có bot chạy thử với dữ liệu của bạn ngay hôm nay." primary={{ href: signup, label: "Dùng thử miễn phí 14 ngày" }} />
      <Script src="/widget.js" data-tenant={meta.demoSlug} strategy="afterInteractive" />
    </>
  );
}
