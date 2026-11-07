import { localizeMeta } from "@/bots/localize";
import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import {
  ArrowRight,
  Armchair,
  Code2,
  Cpu,
  GraduationCap,
  Grid3x3,
  Layers,
  Activity,
  ShoppingBag,
  Sparkles,
  Zap,
  Star,
  ShieldCheck,
  Check,
  CheckCircle2,
} from "lucide-react";
import { BOT_METAS } from "@/bots/catalog";
import { BOT_PRICING } from "@/domain/bot-pricing";
import { Container } from "@/components/site/Container";
import { ConsoleMockup } from "@/components/site/ConsoleMockup";
import { LogoMarquee } from "@/components/site/LogoMarquee";
import { LumenBento } from "@/components/site/LumenBento";
import { HomePricing } from "@/components/site/HomePricing";
import { Testimonials } from "@/components/site/Testimonials";

export default async function HomePage() {
  const { t } = await getT();
  return (
    <div className="w-full bg-white text-zinc-900 transition-colors duration-200 dark:bg-[#07080b] dark:text-[#f4f5f7] overflow-x-hidden selection:bg-brand-500 selection:text-white">
      {/* 1. HERO SECTION (Lumen + SaaS-AI) */}
      <section className="relative min-h-[92vh] flex flex-col justify-center pt-20 pb-16 overflow-hidden">
        {/* Subtle dot matrix background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgba(0,0,0,0.06)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,#000_15%,transparent_80%)] dark:bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)]"
        />

        {/* Ambient colored backlight (SaaS-AI purple + Lumen ember) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 -z-10 w-[650px] h-[380px] rounded-full bg-gradient-to-tr from-brand-600/20 via-violet-500/15 to-spark-500/15 blur-[120px] dark:from-brand-600/25 dark:via-violet-500/20 dark:to-spark-500/15"
        />

        <Container className="relative z-10 flex flex-col items-center text-center">
          {/* Top Pill (Lumen Launch Badge) */}
          <div className="inline-flex items-center gap-2.5 rounded-full border border-zinc-200/80 bg-zinc-100/80 p-1.5 pr-4 text-xs shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.04]">
            <span className="rounded-full bg-gradient-to-r from-brand-500 to-spark-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
              {t("MỚI 2.0")}
            </span>
            <span className="font-medium text-zinc-700 dark:text-white/80">
              {t("AI Chatbot Hub Chuyên Ngành Cho Doanh Nghiệp")}
            </span>
            <ArrowRight className="size-3 text-zinc-400 dark:text-white/40" />
          </div>

          {/* Main Display Headline (SaaS-AI Gradient + Lumen Scale) */}
          <h1 className="mt-8 text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight leading-[1.05] text-zinc-950 dark:text-white [text-wrap:balance]">
            {t("Khách cần là có.")}
            <br />
            <span className="bg-gradient-to-r from-brand-600 via-violet-600 to-[#ff6a2b] bg-clip-text text-transparent dark:from-[#c490ff] dark:via-[#a78bfa] dark:to-[#ff6a2b]">
              {t("Shop bận vẫn bán.")}
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-zinc-600 dark:text-white/60 [text-wrap:pretty]">
            {t("Không chỉ là chatbot trả lời chung chung. Widget Norm mang đến trợ lý AI có nghiệp vụ chuyên biệt: tính toán chính xác, xem thử trực quan, tự chốt lịch và kết nối nhân viên liền mạch.")}
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-spark-500 shadow-[0_0_35px_rgba(95,69,228,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all hover:shadow-[0_0_45px_rgba(255,106,43,0.6)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{t("Tạo trợ lý cho shop ngay")}</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href="#console"
              className="inline-flex items-center justify-center gap-2 rounded-full px-7 py-4 text-sm font-semibold text-zinc-800 border border-zinc-200 bg-white shadow-sm transition-all hover:bg-zinc-50 dark:text-white/90 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] dark:hover:border-white/20"
            >
              {t("Xem Console thực tế")}
            </Link>
          </div>

          {/* Social Proof (Lumen Avatars + Stars) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500 dark:text-white/60">
            <div className="flex -space-x-2">
              {[
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&h=80&fit=crop&crop=faces",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=faces",
                "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=80&h=80&fit=crop&crop=faces",
                "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop&crop=faces",
              ].map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt="Customer avatar"
                  className="size-7 rounded-full object-cover ring-2 ring-white dark:ring-[#07080b]"
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="size-3.5 fill-amber-500" />
              ))}
            </div>
            <span>
              {t("Được tin dùng bởi")}{" "}
              <strong className="text-zinc-900 font-semibold dark:text-white">
                {t("120+ showroom & chuỗi cửa hàng")}
              </strong>
            </span>
          </div>

          {/* Live Telemetry Bar (Lumen Signature!) */}
          <div className="mt-14 w-full max-w-4xl rounded-2xl border border-zinc-200/80 bg-white/90 backdrop-blur-xl p-3 shadow-xl dark:border-white/10 dark:bg-[#0a0c12]/80">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-200/80 dark:divide-white/5 text-left">
              <div className="p-4 flex flex-col justify-between">
                <span className="text-[11px] font-mono text-zinc-500 dark:text-white/40 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  LATENCY P50
                </span>
                <p className="mt-2 text-2xl font-black font-mono text-zinc-950 dark:text-white">
                  &lt; 0.78<small className="text-sm font-normal text-zinc-500 dark:text-white/50">s</small>
                </p>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  {t("Phản hồi tức thì")}
                </span>
              </div>

              <div className="p-4 flex flex-col justify-between">
                <span className="text-[11px] font-mono text-zinc-500 dark:text-white/40 flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-violet-600 dark:text-violet-400" />
                  JEV GUARANTEE
                </span>
                <p className="mt-2 text-2xl font-black font-mono text-zinc-950 dark:text-white">
                  0%<small className="text-sm font-normal text-zinc-500 dark:text-white/50"> {t("Bịa đặt")}</small>
                </p>
                <span className="text-[11px] text-violet-600 dark:text-violet-300 font-medium">
                  {t("Đối chiếu DB thực")}
                </span>
              </div>

              <div className="p-4 flex flex-col justify-between">
                <span className="text-[11px] font-mono text-zinc-500 dark:text-white/40 flex items-center gap-1.5">
                  <Activity className="size-3.5 text-spark-500" />
                  UPTIME FLEET
                </span>
                <p className="mt-2 text-2xl font-black font-mono text-zinc-950 dark:text-white">
                  99.99<small className="text-sm font-normal text-zinc-500 dark:text-white/50">%</small>
                </p>
                <span className="text-[11px] text-spark-600 dark:text-spark-300 font-medium">
                  {t("Trực đêm 24/7")}
                </span>
              </div>

              <div className="p-4 flex flex-col justify-between">
                <span className="text-[11px] font-mono text-zinc-500 dark:text-white/40 flex items-center gap-1.5">
                  <Code2 className="size-3.5 text-sky-600 dark:text-sky-400" />
                  SETUP TIME
                </span>
                <p className="mt-2 text-2xl font-black font-mono text-zinc-950 dark:text-white">
                  1<small className="text-sm font-normal text-zinc-500 dark:text-white/50"> {t("Dòng mã")}</small>
                </p>
                <span className="text-[11px] text-sky-600 dark:text-sky-300 font-medium">
                  {t("Cài đặt < 2 phút")}
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* 2. ELEVATED CONSOLE MOCKUP STAGE (Lumen + SaaS-AI) */}
      <section
        id="console"
        className="relative py-16 sm:py-24 border-y border-zinc-200/80 bg-zinc-50/70 dark:border-white/5 dark:bg-[#08090e]"
      >
        <Container>
          <div className="mx-auto max-w-3xl text-center mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-brand-300">
              <Sparkles className="size-3 text-brand-600 dark:text-brand-400" />
              {t("CONSOLE QUẢN TRỊ TRỰC QUAN")}
            </div>
            <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white [text-wrap:balance]">
              {t("Xem trước Workspace trực tiếp")}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-white/60">
              {t("Mọi tin nhắn, phép tính dự toán, số điện thoại thu về và lịch hẹn được sắp xếp tập trung tại một bảng điều khiển duy nhất.")}
            </p>
          </div>

          <ConsoleMockup />
        </Container>
      </section>

      {/* 3. PLATFORM LOGO MARQUEE */}
      <section className="py-12 border-b border-zinc-200/80 bg-white dark:border-white/5 dark:bg-[#07080b]">
        <Container>
          <p className="text-center text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-white/40 mb-6">
            {t("TƯƠNG THÍCH HOÀN HẢO VỚI MỌI NỀN TẢNG WEBSITE")}
          </p>
          <LogoMarquee />
        </Container>
      </section>

      {/* 4. PINNED STATEMENT / VALUE MANIFESTO */}
      <section className="py-24 sm:py-32 relative overflow-hidden border-b border-zinc-200/80 bg-gradient-to-b from-white via-zinc-50/50 to-white dark:border-white/5 dark:from-[#07080b] dark:via-[#090b10] dark:to-[#07080b]">
        <Container className="max-w-4xl text-center">
          <span className="text-xs font-mono uppercase tracking-widest text-spark-600 dark:text-spark-400">
            {t("TẠI SAO WIDGET NORM RA ĐỜI")}
          </span>
          <p className="mt-6 text-3xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-zinc-950 dark:text-white leading-tight [text-wrap:balance]">
            {t("Chatbot thông thường chỉ biết trò chuyện chung chung. Widget Norm")}{" "}
            <span className="italic font-serif text-brand-600 dark:text-[#c490ff]">
              {t("trực tiếp giải quyết bài toán tiền bạc")}
            </span>{" "}
            {t("bằng các công cụ tính toán chính xác.")}
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=96&h=96&fit=crop&crop=faces"
              alt="Leader avatar"
              className="size-10 rounded-full object-cover ring-2 ring-brand-500/50"
            />
            <div className="text-left text-xs">
              <p className="font-bold text-zinc-900 dark:text-white">
                {t("Đội ngũ Kỹ nghệ Widget Norm")}
              </p>
              <p className="text-zinc-500 dark:text-white/40">
                {t("Thiết kế cho Doanh nghiệp & Showroom")}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* 5. SHOWCASE 4 CHATBOTS CHUYÊN NGÀNH */}
      <section
        id="chatbot"
        className="py-24 border-b border-zinc-200/80 dark:border-white/5"
      >
        <Container>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-brand-300">
              <Layers className="size-3 text-brand-600 dark:text-brand-400" />
              {t("HỆ SINH THÁI ĐA NGÀNH")}
            </div>
            <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white [text-wrap:balance]">
              {t("Shop của bạn không giống ai.")}
              <br />
              {t("Chatbot cũng phải như vậy.")}
            </h2>
            <p className="mt-4 text-base text-zinc-600 dark:text-white/60 [text-wrap:pretty]">
              {t("Chọn đúng người đồng hành được đào tạo chuyên sâu về ngành hàng của bạn, sở hữu công cụ chữ ký giải quyết vấn đề khách hàng trong nháy mắt.")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {BOT_METAS.map((raw) => localizeMeta(raw, t)).map((m) => {
              const pricing = BOT_PRICING[m.kind];
              const isStore = m.kind === "store";
              const isTile = m.kind === "tile";
              const isEdu = m.kind === "education";

              return (
                <article
                  key={m.kind}
                  className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-7 sm:p-9 shadow-lg flex flex-col justify-between group hover:border-brand-500/40 hover:shadow-2xl transition-all dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-brand-500/40"
                >
                  {/* Subtle leak glow */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full blur-3xl opacity-15 group-hover:opacity-30 transition-opacity"
                    style={{ background: m.accentHex }}
                  />

                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid size-12 place-items-center rounded-2xl shadow-sm ${m.tile}`}
                        >
                          {isStore ? (
                            <ShoppingBag className="size-6 text-brand-700" />
                          ) : isTile ? (
                            <Grid3x3 className="size-6 text-[#15476d]" />
                          ) : isEdu ? (
                            <GraduationCap className="size-6 text-[#0f766e]" />
                          ) : (
                            <Armchair className="size-6 text-[#9a5b2e]" />
                          )}
                        </span>
                        <div>
                          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block dark:text-white/40">
                            {isStore
                              ? t("Cho mọi cửa hàng bán lẻ")
                              : isTile
                                ? t("Showroom gạch & VLXD")
                                : isEdu
                                  ? t("Trung tâm ngoại ngữ")
                                  : t("Showroom nội thất")}
                          </span>
                          <h3 className="text-2xl font-bold text-zinc-950 dark:text-white">
                            {m.shortName}
                          </h3>
                        </div>
                      </div>

                      <span className="rounded-full bg-zinc-100 border border-zinc-200 px-3 py-1 text-xs font-mono font-bold text-zinc-800 dark:bg-white/5 dark:border-white/10 dark:text-white">
                        {t("Từ")} {pricing.monthly.toLocaleString("vi-VN")} ₫
                        <span className="text-[10px] text-zinc-500 dark:text-white/40">
                          {t("/tháng")}
                        </span>
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-relaxed text-zinc-600 dark:text-white/70">
                      {m.tagline}
                    </p>

                    {/* Signature Feature Preview Box */}
                    <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4 font-mono text-xs dark:border-white/5 dark:bg-white/[0.02]">
                      <span className="text-[10px] uppercase tracking-wider text-brand-600 dark:text-brand-300 font-semibold block mb-2">
                        {t("⚡ Công cụ chữ ký độc quyền:")}
                      </span>

                      {isStore && (
                        <div className="rounded-xl border border-zinc-200/80 bg-white p-3 text-zinc-800 dark:border-white/10 dark:bg-[#12151e] dark:text-white/90">
                          <p className="font-semibold text-brand-600 dark:text-violet-300">
                            {t("🛍️ Tra cứu tồn kho & Gợi ý quà tặng")}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-500 dark:text-white/50">
                            {t("“Bình giữ nhiệt Everyday — 249.000 ₫ (Còn 8 chiếc, có hộp quà)”")}
                          </p>
                        </div>
                      )}

                      {isTile && (
                        <div className="rounded-xl border border-zinc-200/80 bg-white p-3 text-zinc-800 dark:border-white/10 dark:bg-[#12151e] dark:text-white/90">
                          <p className="font-semibold text-sky-700 dark:text-sky-300">
                            {t("🧱 Báo giá dự toán & Ướm ảnh phòng")}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-500 dark:text-white/50">
                            {t("Phòng 25 m² lát gạch 80x80: 39 thùng (hao hụt 5%) + 4 bao keo. Tổng 13.650.000 ₫")}
                          </p>
                        </div>
                      )}

                      {isEdu && (
                        <div className="rounded-xl border border-zinc-200/80 bg-white p-3 text-zinc-800 dark:border-white/10 dark:bg-[#12151e] dark:text-white/90">
                          <p className="font-semibold text-teal-700 dark:text-teal-300">
                            {t("🎓 Test xếp lớp 15 câu & Lộ trình band")}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-500 dark:text-white/50">
                            {t("Mất gốc lên IELTS 6.5: Lộ trình Foundation 16 tuần. Khai giảng T2-T4-T6.")}
                          </p>
                        </div>
                      )}

                      {!isStore && !isTile && !isEdu && (
                        <div className="rounded-xl border border-zinc-200/80 bg-white p-3 text-zinc-800 dark:border-white/10 dark:bg-[#12151e] dark:text-white/90">
                          <p className="font-semibold text-amber-700 dark:text-amber-300">
                            {t("🛋️ Đo đạc đặt vừa phòng & Báo giá combo")}
                          </p>
                          <p className="mt-1 text-[11px] text-zinc-500 dark:text-white/50">
                            {t("Sofa Milan 280 × 160 cm vừa phòng 3m × 2.5m, còn lối đi 90cm. Hẹn đo tại nhà.")}
                          </p>
                        </div>
                      )}
                    </div>

                    <ul className="mt-5 space-y-2 text-xs text-zinc-700 dark:text-white/70">
                      {m.heroPoints.map((p) => (
                        <li key={p} className="flex items-center gap-2">
                          <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-5 border-t border-zinc-200/80 dark:border-white/5 flex items-center justify-between">
                    <Link
                      href={`/bots/${m.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-white transition-colors"
                    >
                      <span>{t("Khám phá công nghệ {name}", { name: t(m.shortName) })}</span>
                      <ArrowRight className="size-3.5" />
                    </Link>

                    <Link
                      href={`/signup?bot=${m.slug}`}
                      className="rounded-xl px-4 py-2 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border border-zinc-200 transition-all dark:bg-white/10 dark:hover:bg-white/15 dark:text-white dark:border-white/10"
                    >
                      {t("Dùng thử 14 ngày")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 6. BENTO GRID OF LIVE MINI UIs */}
      <section
        id="bento"
        className="py-24 border-b border-zinc-200/80 bg-zinc-50/70 dark:border-white/5 dark:bg-[#08090e]"
      >
        <Container>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-brand-300">
              <Cpu className="size-3 text-brand-600 dark:text-brand-400" />
              {t("CÔNG NGHỆ LÕI WIDGET NORM")}
            </div>
            <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white [text-wrap:balance]">
              {t("Hạ tầng thông minh giữa website và khách hàng")}
            </h2>
            <p className="mt-4 text-base text-zinc-600 dark:text-white/60">
              {t("Định tuyến câu hỏi, tự động kiểm tra tồn kho, chống ảo giác và co giãn chịu tải. Bạn tập trung bán hàng, Widget Norm lo phần công nghệ.")}
            </p>
          </div>

          <LumenBento />
        </Container>
      </section>

      {/* 7. STATS WITH GIANT WATERMARK NUMBER */}
      <section className="py-24 relative overflow-hidden border-b border-zinc-200/80 bg-white dark:border-white/5 dark:bg-[#07080b]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[18vw] font-black text-zinc-950/[0.03] dark:text-white/[0.02] tracking-tighter select-none"
        >
          99.9%
        </div>

        <Container className="relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200/80 dark:divide-white/10 text-center">
            <div className="pt-6 lg:pt-0">
              <p className="text-4xl sm:text-6xl font-black text-zinc-950 dark:text-white font-mono tracking-tight">
                &lt; 0.8<small className="text-xl text-brand-600 dark:text-brand-400 font-normal">s</small>
              </p>
              <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500 dark:text-white/40">
                {t("Tốc độ phản hồi trung bình")}
              </p>
            </div>

            <div className="pt-6 lg:pt-0">
              <p className="text-4xl sm:text-6xl font-black text-zinc-950 dark:text-white font-mono tracking-tight">
                0<small className="text-xl text-emerald-600 dark:text-emerald-400 font-normal">%</small>
              </p>
              <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500 dark:text-white/40">
                {t("Tỷ lệ bịa giá nhờ Jev Engine")}
              </p>
            </div>

            <div className="pt-6 lg:pt-0">
              <p className="text-4xl sm:text-6xl font-black text-zinc-950 dark:text-white font-mono tracking-tight">
                4<small className="text-xl text-spark-600 dark:text-spark-400 font-normal"> {t("Ngành")}</small>
              </p>
              <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500 dark:text-white/40">
                {t("Có công cụ chữ ký tương tác")}
              </p>
            </div>

            <div className="pt-6 lg:pt-0">
              <p className="text-4xl sm:text-6xl font-black text-zinc-950 dark:text-white font-mono tracking-tight">
                14<small className="text-xl text-violet-600 dark:text-violet-400 font-normal"> {t("Ngày")}</small>
              </p>
              <p className="mt-2 text-xs uppercase tracking-wider text-zinc-500 dark:text-white/40">
                {t("Dùng thử không cần thẻ")}
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* 8. ONBOARDING STEPS */}
      <section className="py-24 border-b border-zinc-200/80 bg-zinc-50/70 dark:border-white/5 dark:bg-[#08090e]">
        <Container>
          <div className="mx-auto max-w-3xl text-center mb-16">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-brand-300">
              <Zap className="size-3 text-brand-600 dark:text-brand-400" />
              {t("TRIỂN KHAI NHANH CHÓNG")}
            </div>
            <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white [text-wrap:balance]">
              {t("Bạn hiểu cửa hàng. Trợ lý học từ bạn.")}
            </h2>
            <p className="mt-4 text-base text-zinc-600 dark:text-white/60">
              {t("Không cần kiến thức lập trình phức tạp. Khởi động trợ lý AI cho website chỉ trong 3 bước.")}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                idx: "01",
                title: t("Kết nối tài khoản & domain"),
                desc: t("Đăng nhập bằng email, chọn chatbot ngành phù hợp và nhập domain website bạn muốn cài đặt."),
                badge: t("Xác minh tức thì"),
              },
              {
                idx: "02",
                title: t("Nạp dữ liệu cửa hàng"),
                desc: t("Tải lên danh mục sản phẩm từ file CSV hoặc nhập chính sách giao hàng, đổi trả và giờ mở cửa."),
                badge: t("Đồng bộ trong 1 phút"),
              },
              {
                idx: "03",
                title: t("Dán mã nhúng & đón khách 24/7"),
                desc: t("Sao chép 1 dòng script duy nhất dán vào website. Trợ lý AI sẵn sàng chào đón khách hàng ngay lập tức."),
                badge: t("Kích hoạt toàn diện"),
              },
            ].map((st) => (
              <div
                key={st.idx}
                className="relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-lg flex flex-col justify-between group hover:border-brand-500/30 transition-all dark:border-white/10 dark:bg-[#0d1017]"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-5xl font-black text-zinc-200 font-mono group-hover:text-brand-500/30 transition-colors dark:text-white/10 dark:group-hover:text-brand-500/20">
                      {st.idx}
                    </span>
                    <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-white/5 dark:border-white/10 dark:text-brand-300">
                      {st.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-zinc-950 dark:text-white">
                    {st.title}
                  </h3>
                  <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-white/60">
                    {st.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="size-4" />
                  <span>{t("Hoàn tất dưới 2 phút")}</span>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 9. TESTIMONIALS */}
      <section className="py-24 border-b border-zinc-200/80 bg-white dark:border-white/5 dark:bg-[#07080b]">
        <Container>
          <div className="mx-auto max-w-3xl text-center mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-brand-300">
              <Star className="size-3 text-amber-500" />
              {t("ĐÁNH GIÁ TỪ CHỦ SHOP")}
            </div>
            <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white [text-wrap:balance]">
              {t("Được tin chọn bởi các showroom & chuỗi cửa hàng")}
            </h2>
            <p className="mt-3 text-base text-zinc-600 dark:text-white/60">
              {t("Xem các doanh nghiệp thực tế giải phóng thời gian trực chat và tăng trưởng doanh thu nhờ chatbot chuyên ngành của Widget Norm.")}
            </p>
          </div>

          <Testimonials />
        </Container>
      </section>

      {/* 10. INTERACTIVE PRICING */}
      <section
        id="pricing"
        className="py-24 border-b border-zinc-200/80 bg-zinc-50/70 dark:border-white/5 dark:bg-[#08090e]"
      >
        <Container>
          <div className="mx-auto max-w-3xl text-center mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-brand-300">
              <Sparkles className="size-3 text-brand-600 dark:text-brand-400" />
              {t("BẢNG GIÁ MINH BẠCH")}
            </div>
            <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white [text-wrap:balance]">
              {t("Bắt đầu gọn nhẹ. Mở rộng đúng lúc.")}
            </h2>
            <p className="mt-3 text-base text-zinc-600 dark:text-white/60">
              {t("Trải nghiệm 14 ngày đầy đủ tính năng hoàn toàn miễn phí. Không cần thẻ tín dụng.")}
            </p>
          </div>

          <HomePricing />
        </Container>
      </section>

      {/* 11. FAQ ACCORDION */}
      <section className="py-24 border-b border-zinc-200/80 bg-white dark:border-white/5 dark:bg-[#07080b]">
        <Container className="max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-brand-300">
              {t("HỎI ĐÁP")}
            </div>
            <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-zinc-950 dark:text-white">
              {t("Bạn có thể đang băn khoăn")}
            </h2>
            <p className="mt-3 text-base text-zinc-600 dark:text-white/60">
              {t("Mọi điều bạn cần biết trước khi tích hợp Widget Norm vào website.")}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200/80 bg-zinc-50/60 p-6 sm:p-8 divide-y divide-zinc-200/80 dark:border-white/10 dark:bg-[#0d1017] dark:divide-white/5">
            {[
              {
                q: t("AVI dùng được cho những loại cửa hàng nào?"),
                a: t("AVI được thiết kế cho mọi cửa hàng bán lẻ và dịch vụ: thời trang, gia dụng, thiết bị, mỹ phẩm, quà tặng... Bạn chỉ cần tải lên danh mục sản phẩm và kiến thức chính sách; bot sẽ tự động tư vấn chuẩn xác."),
              },
              {
                q: t("Chatbot chuyên ngành (Gạch, Nội thất, Ngoại ngữ) có gì khác biệt?"),
                a: t("Ngoài tính năng tư vấn và đặt lịch của AVI, bot chuyên ngành có thêm công cụ chữ ký: tự tính số thùng gạch có hao hụt, ướm thử vật liệu lên ảnh phòng, làm bài test xếp lớp 15 câu, kiểm tra kích thước sofa... giúp chốt đơn trực tiếp ngay trong khung chat."),
              },
              {
                q: t("Dữ liệu và giá bán của cửa hàng có được bảo mật không?"),
                a: t("Dữ liệu mỗi cửa hàng được lưu trữ trong một database schema độc lập (Multi-schema architecture). AI của shop bạn chỉ đọc dữ liệu của chính bạn và không chia sẻ chéo cho bất kỳ cửa hàng nào khác."),
              },
              {
                q: t("Chính sách dùng thử 14 ngày hoạt động thế nào?"),
                a: t("Bạn đăng nhập bằng tài khoản email để kích hoạt ngay 14 ngày dùng thử miễn phí với đầy đủ toàn bộ tính năng. Hệ thống không yêu cầu thẻ tín dụng và không tự động trừ tiền khi hết hạn dùng thử."),
              },
              {
                q: t("Tôi có thể cài đặt một chatbot cho nhiều website được không?"),
                a: t("Mỗi giấy phép (license) chatbot được liên kết với một domain website đã xác minh để đảm bảo an toàn bản quyền và hiệu năng ổn định. Bạn có thể quản lý nhiều chatbot cho nhiều website từ cùng một tài khoản quản trị duy nhất."),
              },
            ].map((faq, i) => (
              <details key={i} className="group py-4 first:pt-0 last:pb-0">
                <summary className="flex cursor-pointer list-none items-center justify-between text-base font-semibold text-zinc-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-300 transition-colors [&::-webkit-details-marker]:hidden">
                  <span>{faq.q}</span>
                  <span className="ml-4 flex size-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm text-zinc-700 transition-transform group-open:rotate-45 dark:border-white/10 dark:bg-white/5 dark:text-white">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-white/60 [text-wrap:pretty]">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* 12. FINAL RISING SUN CTA */}
      <section className="relative min-h-[70vh] flex flex-col justify-center items-center text-center py-24 sm:py-32 overflow-hidden bg-zinc-950 text-white">
        {/* Rising sun ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 bottom-0 -translate-x-1/2 w-[850px] h-[450px] rounded-full bg-gradient-to-t from-brand-600/35 via-violet-600/20 to-transparent blur-[120px]"
        />

        <Container className="relative z-10 max-w-4xl flex flex-col items-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/80 backdrop-blur-md">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t("Sẵn sàng phục vụ khách hàng trên website của bạn")}</span>
          </div>

          <h2 className="mt-8 text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-white leading-none [text-wrap:balance]">
            {t("Một cửa hàng bận rộn.")}
            <br />
            <span className="bg-gradient-to-r from-white via-white/90 to-brand-300 bg-clip-text text-transparent">
              {t("Một trợ lý luôn sẵn sàng.")}
            </span>
          </h2>

          <p className="mt-6 max-w-xl text-base sm:text-lg text-white/60 [text-wrap:pretty]">
            {t("Bắt đầu từ dữ liệu của shop bạn. Trải nghiệm trọn vẹn trợ lý AI chuyên ngành miễn phí trong 14 ngày.")}
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full px-9 py-4 text-base font-semibold text-white bg-gradient-to-r from-brand-600 via-brand-500 to-spark-500 shadow-[0_0_40px_rgba(95,69,228,0.6),inset_0_1px_0_rgba(255,255,255,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              <span>{t("Bắt đầu dùng thử miễn phí")}</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-white/90 border border-white/10 bg-white/[0.05] transition-all hover:bg-white/10 hover:border-white/20"
            >
              {t("Xem bảng giá")}
            </Link>
          </div>

          <p className="mt-8 text-xs text-white/40 flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-400" />
            {t("Không yêu cầu thẻ tín dụng · Hủy bất kỳ lúc nào · Dữ liệu bảo mật tuyệt đối")}
          </p>
        </Container>
      </section>
    </div>
  );
}
