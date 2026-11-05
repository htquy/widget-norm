import Link from "next/link";
import Script from "next/script";
import { ArrowRight, BookOpenCheck, CalendarCheck, ChartNoAxesCombined, Headset, Palette, Sparkles, Zap } from "lucide-react";
import { BOT_METAS } from "@/bots/catalog";
import { PLANNED_BOTS } from "@/bots/roadmap";
import { liveCounts } from "@/lib/live-counts";
import { DEMO_SLUG } from "@/infrastructure/db/seed";
import { siteConfig } from "@/lib/site";
import { ChatMock } from "@/components/site/ChatMock";
import { Container } from "@/components/site/Container";
import { BotCard, Faq, FinalCta, PlanGrid, SectionHead } from "@/components/site/Sections";

export const dynamic = "force-dynamic";

const SHARED = [
  { Icon: Zap, title: "Tầng quyết định jev", text: "Mỗi tin nhắn được phân loại trước: chào hỏi, hỏi giờ mở cửa, đặt lịch… trả lời ngay không tốn LLM; câu khó mới gọi model mạnh." },
  { Icon: CalendarCheck, title: "Đặt lịch trong khung chat", text: "Dịch vụ, giờ mở cửa, sức chứa, chống trùng chỗ. Dùng chung cho spa, khảo sát tại nhà, hẹn showroom." },
  { Icon: Headset, title: "Chuyển nhân viên & live chat", text: "Câu ngoài dữ liệu, khách phàn nàn → thẻ gọi lại/Zalo hoặc nhân viên vào chat trực tiếp, bot tự dừng." },
  { Icon: ChartNoAxesCombined, title: "Phân tích nhu cầu khách", text: "Chủ đề hỏi nhiều, câu chưa trả lời được, cảm xúc và báo cáo AI đề xuất việc nên làm." },
  { Icon: BookOpenCheck, title: "Chống trả lời bịa", text: "Số tiền và mã sản phẩm được đối chiếu với dữ liệu shop; sai thì sửa một lần rồi mới trả lời an toàn." },
  { Icon: Palette, title: "Giao diện theo thương hiệu", text: "Màu, vị trí, kiểu nút, chế độ tối, tên và ảnh trợ lý — xem trước trực tiếp, không cần đổi mã nhúng." },
];

const STEPS = [
  { n: "01", title: "Chọn chatbot đúng ngành", text: "Bán hàng & đặt lịch, hoặc chuyên ngành như gạch ốp lát. Một tài khoản thêm được nhiều chatbot." },
  { n: "02", title: "Nhập dữ liệu của bạn", text: "Danh mục sản phẩm/dịch vụ, chính sách giao hàng — đổi trả, giờ mở cửa. Bot chỉ trả lời từ dữ liệu này." },
  { n: "03", title: "Dán một dòng mã", text: "Chỉnh giao diện, dán thẻ script vào WordPress, Haravan, Sapo, LadiPage… Lead và lịch hẹn về trang quản trị." },
];

const FAQ = [
  { q: "Mỗi chatbot khác nhau ở điểm nào?", a: "Phần lõi (AI, đặt lịch, live chat, báo cáo) dùng chung. Mỗi chatbot có thêm nghiệp vụ và dữ liệu riêng của ngành: ví dụ bot gạch có báo giá theo m² và xem thử gạch trên ảnh phòng." },
  { q: "Tôi có thể dùng nhiều chatbot cùng lúc không?", a: "Có. Một tài khoản tạo nhiều chatbot (theo giới hạn của gói), mỗi bot có mã nhúng và dữ liệu riêng, chuyển qua lại bằng một nút trong trang quản trị." },
  { q: "Dữ liệu của tôi có bị lẫn với cửa hàng khác không?", a: "Không. Mọi truy vấn lọc theo cửa hàng ở máy chủ; dữ liệu riêng từng loại chatbot nằm ở schema cơ sở dữ liệu riêng." },
  { q: "Bao giờ có thêm chatbot cho ngành khác?", a: "Các chatbot nhà hàng, tuyển sinh, bất động sản, phòng khám, chăm sóc sau bán đang trong lộ trình. Hạ tầng đã sẵn sàng nên thêm bot mới chỉ cần viết phần nghiệp vụ." },
];

export default async function HomePage() {
  const counts = await liveCounts();
  return (
    <>
      {/* Hero */}
      <section className="aurora border-b border-zinc-200 bg-white py-16 sm:py-24">
        <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 -z-10" />
        <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <div className="eyebrow animate-fade-up stagger" style={{ "--d": "0ms" } as React.CSSProperties}>
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-spark-400" />
                <span className="relative inline-flex size-2 rounded-full bg-spark-500" />
              </span>
              <Sparkles className="size-3.5" aria-hidden="true" />
              {BOT_METAS.length} chatbot đang mở bán · thêm ngành mới liên tục
            </div>
            <h1 className="mt-6 max-w-[680px] animate-fade-up stagger text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl [text-wrap:balance]" style={{ "--d": "90ms" } as React.CSSProperties}>
              Chọn chatbot đúng ngành, <span className="text-gradient">bán hàng và chăm khách 24/7</span>
            </h1>
            <p className="mt-6 max-w-[620px] animate-fade-up stagger text-lg leading-relaxed text-zinc-600 [text-wrap:pretty]" style={{ "--d": "180ms" } as React.CSSProperties}>
              {siteConfig.name} gom các chatbot AI cho cửa hàng Việt vào một nơi: tư vấn theo dữ liệu thật, đặt lịch, chuyển nhân viên khi cần và báo cáo nhu cầu khách. Dán một dòng mã là chạy.
            </p>
            <div className="mt-8 flex animate-fade-up stagger flex-col gap-3 sm:flex-row sm:items-center" style={{ "--d": "270ms" } as React.CSSProperties}>
              <Link href="/signup" className="btn-primary group text-base">
                Dùng thử miễn phí 14 ngày
                <ArrowRight className="size-4 transition-transform duration-500 ease-fluid group-hover:translate-x-1" aria-hidden="true" />
              </Link>
              <Link href="#chatbot" className="btn-secondary text-base">
                Xem các chatbot
              </Link>
            </div>
            <p className="mt-4 text-sm text-zinc-500">Bấm nút chat ở góc phải màn hình để thử ngay bot demo.</p>
          </div>
          <div className="relative animate-fade-up stagger lg:col-span-5" style={{ "--d": "220ms" } as React.CSSProperties}>
            <div aria-hidden="true" className="absolute -inset-6 -z-10 hidden rounded-[2.5rem] bg-gradient-to-br from-brand-300/50 via-violet-300/40 to-spark-200/50 blur-2xl sm:block" />
            <ChatMock kind="store" className="md:animate-float" />
          </div>
        </Container>
      </section>

      {/* Danh mục chatbot */}
      <section id="chatbot" className="scroll-mt-20 border-b border-zinc-200 bg-white py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Danh mục chatbot" title="Mỗi ngành một chatbot, chung một nền tảng" subtitle="Chọn chatbot sát nhu cầu nhất. Cần nhiều ngành? Tạo thêm bot trong cùng tài khoản." />
          <ul className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
            {BOT_METAS.map((m) => (
              <BotCard key={m.kind} meta={m} count={counts[m.kind] ?? 0} />
            ))}
          </ul>
        </Container>
      </section>

      {/* Nền tảng chung */}
      <section id="nen-tang" className="scroll-mt-20 border-b border-zinc-200 bg-gradient-to-b from-white to-brand-50/50 py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Dùng chung mọi chatbot" title="Một nền tảng, mọi chatbot đều có sẵn" subtitle="Những phần khó và tốn kém nhất được xây một lần, dùng cho mọi loại chatbot hiện tại và sau này." />
          <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {SHARED.map((f) => (
              <li key={f.title} className="card-lift reveal rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8">
                <span className="inline-grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                  <f.Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold text-zinc-950">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">{f.text}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* 3 bước */}
      <section className="relative overflow-hidden border-b border-zinc-200 bg-white py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Cách hoạt động" title="Từ đăng ký đến khách đầu tiên trong một buổi chiều" />
          <div className="relative mt-12">
            <div aria-hidden="true" className="pointer-events-none absolute left-[16%] right-[16%] top-12 hidden h-px bg-gradient-to-r from-brand-300 via-violet-300 to-spark-300 md:block" />
            <ol className="relative grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
              {STEPS.map((s) => (
                <li key={s.n} className="group card-lift reveal rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8">
                  <div className="inline-grid size-12 place-items-center rounded-2xl bg-zinc-950 font-mono text-base font-bold text-white shadow-glow transition-transform duration-500 ease-spring group-hover:scale-110">
                    <span className="text-gradient">{s.n}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-zinc-950">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 [text-wrap:pretty]">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* Sắp ra mắt */}
      <section className="border-b border-zinc-200 bg-zinc-50 py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Lộ trình" title="Sắp ra mắt" subtitle="Các chatbot đang được phát triển — dùng lại toàn bộ phần lõi nên ra mắt nhanh." />
          <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLANNED_BOTS.map((b) => (
              <li key={b.id} className="rounded-2xl border border-dashed border-zinc-300 bg-white p-5">
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">Dự kiến</span>
                <h3 className="mt-3 text-base font-bold text-zinc-950">{b.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">{b.tagline}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Giá */}
      <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Bảng giá" title="Bắt đầu miễn phí, trả khi bạn thấy hiệu quả" subtitle="Giá theo tháng cho mỗi chatbot. Nâng cấp hoặc đổi gói bất cứ lúc nào." />
          <PlanGrid />
        </Container>
      </section>

      <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Câu hỏi thường gặp" title="Giải đáp nhanh" />
          <Faq items={FAQ} />
        </Container>
      </section>

      <FinalCta title="Có chatbot đầu tiên chỉ trong một buổi chiều" subtitle="Chọn ngành, nhập dữ liệu, dán một dòng mã. 14 ngày đầu miễn phí, không cần thẻ." />
      <Script src="/widget.js" data-tenant={DEMO_SLUG} strategy="afterInteractive" />
    </>
  );
}
