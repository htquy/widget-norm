"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ShoppingBag,
  Calendar,
  Headset,
  BookOpen,
  TrendingUp,
  Palette,
  Sparkles,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import type { BotMeta } from "@/bots/catalog";
import { BOT_PRICING } from "@/domain/bot-pricing";
import { Container } from "@/components/site/Container";
import { ChatMock } from "@/components/site/ChatMock";
import { Faq, FinalCta } from "@/components/site/Sections";

export function AviLanding({ meta }: { meta: BotMeta }) {
  const t = useT();
  const price = BOT_PRICING[meta.kind];
  const signup = `/signup?bot=${meta.slug}`;

  const industries = [
    t("Thời trang & May mặc"),
    t("Mỹ phẩm & Chăm sóc da"),
    t("Gia dụng & Đời sống"),
    t("Thiết bị công nghệ"),
    t("Quà tặng & Phụ kiện"),
    t("Spa & Dịch vụ làm đẹp"),
  ];

  const features = [
    {
      icon: ShoppingBag,
      title: t("Tư vấn theo danh mục & giỏ hàng"),
      text: t("Tìm sản phẩm theo ngân sách, mục đích sử dụng, kích cỡ. Hiện thẻ sản phẩm kèm ảnh, giá và nút mua hàng một chạm."),
      tag: t("Tìm kiếm thông minh"),
    },
    {
      icon: Calendar,
      title: t("Đặt lịch hẹn tự động ngay trong chat"),
      text: t("Dịch vụ, giờ mở cửa, sức chứa và ngày nghỉ được đồng bộ. Khách chọn giờ còn trống, shop nhận thông báo xác nhận ngay."),
      tag: t("Đồng bộ thời gian thực"),
    },
    {
      icon: Headset,
      title: t("Chuyển tiếp nhân viên đúng lúc"),
      text: t("Khi khách hỏi việc phức tạp, khiếu nại hay cần thương lượng giá, bot kích hoạt thông báo live chat cho nhân viên xử lý tiếp."),
      tag: t("Live chat mượt mà"),
    },
    {
      icon: BookOpen,
      title: t("Nạp kiến thức cửa hàng từ file & text"),
      text: t("Chính sách đổi trả, thời gian giao hàng, bảo hành, chương trình hội viên... Bot đối chiếu từ dữ liệu chuẩn của shop, không suy đoán."),
      tag: t("Chuẩn xác 100%"),
    },
    {
      icon: TrendingUp,
      title: t("Phân tích nhu cầu & báo cáo chuyển đổi"),
      text: t("Thống kê những câu hỏi khách quan tâm nhất, sản phẩm được hỏi nhiều, chủ đề chưa trả lời được để chủ shop cải thiện tức thì."),
      tag: t("Dữ liệu kinh doanh"),
    },
    {
      icon: Palette,
      title: t("Tùy biến nhận diện thương hiệu"),
      text: t("Đổi màu chủ đạo, ảnh đại diện trợ lý, vị trí nút mở chat, lời chào mở đầu và chế độ sáng/tối phù hợp hoàn hảo với website."),
      tag: t("May đo giao diện"),
    },
  ];

  const steps = [
    {
      step: "01",
      title: t("Nạp sản phẩm & chính sách"),
      desc: t("Tải file CSV sản phẩm hoặc nhập đường link website. Nạp chính sách đổi trả, bảo hành chỉ trong 3 phút."),
    },
    {
      step: "02",
      title: t("Tuỳ chỉnh trợ lý thương hiệu"),
      desc: t("Đặt tên, chọn avatar, cài màu chủ đạo đúng tông website và chọn kịch bản mở đầu thân thiện."),
    },
    {
      step: "03",
      title: t("Nhúng 1 dòng mã vào web"),
      desc: t("Dán đoạn script nhỏ gọn vào WordPress, Haravan, Shopify, Sapo hoặc bất kỳ website HTML nào. Sẵn sàng đón khách 24/7."),
    },
  ];

  return (
    <div className="bg-white text-zinc-900 transition-colors dark:bg-[#07080b] dark:text-[#f4f5f7]">
      {/* Hero section */}
      <section className="relative overflow-hidden border-b border-zinc-200/80 bg-gradient-to-b from-brand-50/50 via-white to-white py-16 transition-colors dark:border-white/10 dark:from-[#0d101a] dark:via-[#07080b] dark:to-[#07080b] sm:py-24">
        {/* Glow hiệu ứng nền */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[120px] dark:bg-brand-500/20"
        />

        <Container>
          <nav
            className="mb-8 text-xs font-medium text-zinc-500 dark:text-zinc-400"
            aria-label={t("Đường dẫn")}
          >
            <Link
              href="/bots"
              className="hover:text-brand-600 dark:hover:text-brand-400"
            >
              Chatbot
            </Link>{" "}
            / <span className="text-zinc-900 dark:text-white">{t("AVI Bán hàng")}</span>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50/80 px-3.5 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-950/60 dark:text-brand-300">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span>{t("Trợ lý AI bán hàng & chăm sóc khách 24/7")}</span>
              </div>

              <div className="mt-6 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold tracking-tight text-brand-600 sm:text-6xl dark:text-brand-400">
                  avi<span className="text-emerald-500">.</span>
                </span>
                <span className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Shop Assistant
                </span>
              </div>

              <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl dark:text-white [text-wrap:balance]">
                {t("Nhỏ gọn trong web.")}
                <br />
                <span className="bg-gradient-to-r from-brand-600 via-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-brand-400 dark:via-violet-400 dark:to-indigo-300">
                  {t("Tháo vát như người nhà.")}
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-400">
                {t("Gặp AVI — trợ lý AI toàn năng cho mọi cửa hàng. Tư vấn đúng món, nhớ toàn bộ chính sách, chốt lịch hẹn thông minh và gọi nhân viên ngay khi khách cần chốt đơn.")}
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {industries.map((ind) => (
                  <span
                    key={ind}
                    className="rounded-full border border-zinc-200 bg-zinc-50/80 px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:border-brand-300 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300"
                  >
                    {ind}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link href={signup} className="btn-primary text-base">
                  {t("Đón AVI về cửa hàng")} <ArrowRight className="size-4" />
                </Link>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t("Từ")}{" "}
                  <strong className="font-semibold text-zinc-900 dark:text-white">
                    {price.monthly.toLocaleString("vi-VN")} ₫
                  </strong>
                  {t("/tháng · 14 ngày dùng thử miễn phí")}
                </div>
              </div>

              <div className="mt-8 flex items-center gap-6 border-t border-zinc-200/80 pt-6 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  {t("Không cần thẻ thanh toán")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4 text-brand-600 dark:text-brand-400" />
                  {t("Cài đặt trong 3 phút")}
                </span>
              </div>
            </div>

            {/* Stage minh hoạ giao diện chat & orbit tags */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="relative rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0d1017]/80 sm:p-6">
                {/* Orbit badge 1 */}
                <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white px-3.5 py-2 text-xs font-semibold text-brand-800 shadow-sm dark:border-brand-500/30 dark:bg-[#161a29] dark:text-brand-300">
                  <ShoppingBag className="size-4 text-brand-600 dark:text-brand-400" />
                  <span>{t("Hiểu danh mục & tra cứu kho theo thời gian thực")}</span>
                </div>

                <ChatMock kind="store" />

                {/* Orbit badge 2 */}
                <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-3.5 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                    {t("Đã xác nhận lịch hẹn tư vấn: Thứ Bảy, 10:00")}
                  </span>
                  <span className="rounded-md bg-emerald-200/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200">
                    {t("Tự động")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Feature Bento Section */}
      <section className="section-space border-b border-zinc-200/80 transition-colors dark:border-white/10">
        <Container>
          <div className="section-heading mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              {t("Một trợ lý, đủ việc của shop")}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
              {t("Mỗi cuộc trò chuyện đều được chăm chút.")}
            </h2>
            <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
              {t("Bạn cung cấp sản phẩm và kiến thức cửa hàng. AVI kết nối thông tin, khách hàng và nhân viên thành một trải nghiệm bán hàng liền mạch.")}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const IconComp = f.icon;
              return (
                <article
                  key={f.title}
                  className="group relative flex flex-col rounded-3xl border border-zinc-200/80 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand-500/30 hover:shadow-xl dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-transform duration-300 group-hover:scale-110 dark:bg-brand-950/50 dark:text-brand-400 dark:ring-brand-800/50">
                      <IconComp className="size-6" />
                    </span>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-600 dark:bg-white/5 dark:text-zinc-400">
                      {f.tag}
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-bold text-zinc-950 dark:text-white">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {f.text}
                  </p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* 3 Steps onboarding */}
      <section className="section-space border-b border-zinc-200/80 bg-zinc-50/70 transition-colors dark:border-white/10 dark:bg-[#07080b]">
        <Container>
          <div className="section-heading mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              {t("Quy trình triển khai")}
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
              {t("Lên sóng website trong 3 bước gọn nhẹ")}
            </h2>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.step}
                className="relative rounded-3xl border border-zinc-200/80 bg-white p-8 transition-colors dark:border-white/10 dark:bg-[#0d1017]"
              >
                <span className="font-mono text-3xl font-black text-brand-500/40 dark:text-brand-400/40">
                  {s.step}
                </span>
                <h3 className="mt-4 text-xl font-bold text-zinc-950 dark:text-white">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link href={signup} className="btn-primary text-base">
              {t("Bắt đầu 14 ngày dùng thử")} <ArrowRight className="size-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="section-space">
        <Container>
          <div className="section-heading text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
              {t("Câu hỏi thường gặp về AVI")}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              {t("Mọi thắc mắc của chủ shop về dữ liệu và vận hành.")}
            </p>
          </div>
          <Faq
            items={[
              {
                q: t("AVI có tự bịa thông tin khi khách hỏi không?"),
                a: t("Không. AVI được neo chặt (grounded) trên cơ sở dữ liệu catalogue và tài liệu chính sách của bạn. Khi câu hỏi nằm ngoài phạm vi, bot lịch sự ghi nhận nhu cầu hoặc chuyển máy cho nhân viên."),
              },
              {
                q: t("Shop có nhiều chi nhánh và giờ mở cửa khác nhau thì sao?"),
                a: t("Bạn có thể cấu hình danh sách chi nhánh, giờ phục vụ và nhân viên phụ trách. Bot tự động định vị chi nhánh gần nhất và xếp lịch phù hợp."),
              },
              {
                q: t("Có hỗ trợ tích hợp Fanpage / Zalo không?"),
                a: t("AVI cung cấp Web Widget nhúng trực tiếp vào website và API Webhook mở để kết nối đồng bộ lead về CRM hoặc cổng tin nhắn của bạn."),
              },
            ]}
          />
        </Container>
      </section>

      <FinalCta
        title={t("Sẵn sàng nâng tầm trải nghiệm khách hàng?")}
        subtitle={t("Khởi tạo AVI chỉ mất vài phút. Trải nghiệm đầy đủ tính năng trong 14 ngày không rủi ro.")}
        primary={{ href: signup, label: t("Đón AVI về cửa hàng ngay") }}
      />
    </div>
  );
}
