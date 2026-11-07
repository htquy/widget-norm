"use client";

import { useT } from "@/lib/i18n/client";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Grid3x3,
  Ruler,
  Layers,
  Calculator,
  Compass,
  Building2,
  Calendar,
  Sparkles,
  ShieldCheck,
  Package,
} from "lucide-react";
import type { BotMeta } from "@/bots/catalog";
import { BOT_PRICING } from "@/domain/bot-pricing";
import { Container } from "@/components/site/Container";
import { MaterialRoom } from "@/components/site/ProductPreview";
import { Faq, FinalCta } from "@/components/site/Sections";

export function TileLanding({ meta }: { meta: BotMeta }) {
  const t = useT();
  const price = BOT_PRICING[meta.kind];
  const signup = `/signup?bot=${meta.slug}`;

  const tileFeatures = [
    {
      icon: Layers,
      title: t("Ướm gạch trên ảnh phòng thật"),
      text: t("Khách tải ảnh phòng khách, phòng tắm hay ban công. AI nhận diện góc nhìn sàn/tường và phủ thử mẫu gạch với tỉ lệ chân thực."),
      badge: t("Thị giác trực quan"),
    },
    {
      icon: Calculator,
      title: t("Dự toán m², số thùng, keo và ron"),
      text: t("Nhập kích thước hoặc diện tích, bot tự động tính bù hao hụt cắt góc (5-10%), quy đổi ra số hộp/thùng và định lượng keo dán chính xác."),
      badge: t("Không lo thiếu thừa"),
    },
    {
      icon: Compass,
      title: t("Bộ lọc bề mặt men & chống trơn"),
      text: t("Tìm theo vân đá tự nhiên, xi măng, vân gỗ; bề mặt bóng kính (Polished), mờ (Matt) hoặc nhám chống trượt cho sàn ướt."),
      badge: t("Chuẩn thông số kỹ thuật"),
    },
    {
      icon: Building2,
      title: t("Báo giá theo phân cấp đại lý & showroom"),
      text: t("Cấu hình bảng giá bán lẻ, giá thợ thầu hoặc chiết khấu dự án. Bot phản hồi mức giá phù hợp kèm điều kiện vận chuyển."),
      badge: t("Bảo vệ biên lợi nhuận"),
    },
    {
      icon: Calendar,
      title: t("Đặt lịch hẹn xem mẫu tại showroom"),
      text: t("Sau khi chọn được 2-3 mẫu ưng ý, bot gợi ý khách đặt hẹn tại showroom gần nhất để sờ chất men và xem vân đá thực tế."),
      badge: t("Kéo khách tới cửa hàng"),
    },
    {
      icon: Package,
      title: t("Xuất phương án kèm Lead cho nhân viên"),
      text: t("Tự động đóng gói ảnh phối cảnh, mã gạch đã chọn, diện tích dự kiến và số điện thoại khách để nhân viên sale gọi chốt."),
      badge: t("Chuyển giao mượt mà"),
    },
  ];

  return (
    <div className="bg-white text-zinc-900 transition-colors dark:bg-[#07080b] dark:text-[#f4f5f7]">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-200/80 bg-gradient-to-b from-slate-100/70 via-slate-50/40 to-white py-16 transition-colors dark:border-white/10 dark:from-[#0a1926] dark:via-[#070f17] dark:to-[#07080b] sm:py-24">
        {/* Architectural Grid Background Overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(#15476d 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        <Container>
          <nav
            className="mb-8 text-xs font-medium text-slate-500 dark:text-slate-400"
            aria-label={t("Đường dẫn")}
          >
            <Link
              href="/bots"
              className="hover:text-[#15476d] dark:hover:text-sky-400"
            >
              Chatbot
            </Link>{" "}
            /{" "}
            <span className="text-zinc-900 dark:text-white">
              {meta.shortName}
            </span>
          </nav>

          <div className="grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50/80 px-3.5 py-1.5 text-xs font-semibold text-[#15476d] dark:border-sky-500/30 dark:bg-sky-950/60 dark:text-sky-300">
                <Grid3x3 className="size-4 text-[#15476d] dark:text-sky-400" />
                <span>{t("Studio tư vấn vật liệu & gạch ốp lát")}</span>
              </div>

              <h1 className="mt-6 font-serif text-4xl font-normal tracking-tight text-[#15476d] sm:text-5xl lg:text-6xl dark:text-sky-100 [text-wrap:balance]">
                {t("Đừng chỉ chọn gạch.")}
                <br />
                <em className="font-serif italic text-slate-900 dark:text-white">
                  {t("Hãy thấy cả không gian.")}
                </em>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-300">
                {t("Từ một bức ảnh phòng đến mẫu gạch phù hợp, dự toán vật tư và lịch hẹn showroom. AVI Gạch giúp khách hình dung trước khi quyết định.")}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href={signup}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#15476d] px-6 py-3.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:bg-[#0f3552] hover:shadow-xl dark:bg-sky-600 dark:hover:bg-sky-500"
                >
                  {t("Mở studio của bạn")} <ArrowRight className="size-4" />
                </Link>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {t("Từ")}{" "}
                  <strong className="font-semibold text-slate-900 dark:text-white">
                    {price.monthly.toLocaleString("vi-VN")} ₫
                  </strong>
                  {t("/tháng · 14 ngày dùng thử")}
                </div>
              </div>

              {/* 3 Value Pillars */}
              <div className="mt-10 grid gap-4 border-t border-slate-200/80 pt-6 text-xs text-slate-600 dark:border-white/10 dark:text-slate-400 sm:grid-cols-3">
                <div>
                  <p className="font-semibold text-[#15476d] dark:text-sky-300">
                    {t("Tư vấn có cơ sở")}
                  </p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {t("Catalogue & thông số của showroom")}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#15476d] dark:text-sky-300">
                    {t("Dự toán minh bạch")}
                  </p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {t("Số thùng, hao hụt, keo & ron")}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-[#15476d] dark:text-sky-300">
                    {t("Tiếp nối đúng lúc")}
                  </p>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">
                    {t("Lead, phối cảnh & lịch khảo sát")}
                  </p>
                </div>
              </div>
            </div>

            {/* Room Visualizer Preview */}
            <div className="relative">
              <MaterialRoom />
            </div>
          </div>
        </Container>
      </section>

      {/* Signature Estimator Showcase */}
      <section className="section-space border-b border-zinc-200/80 transition-colors dark:border-white/10">
        <Container>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-[#15476d] dark:text-sky-400">
                {t("Công cụ chữ ký độc quyền")}
              </span>
              <h2 className="mt-3 font-serif text-3xl font-normal text-slate-900 sm:text-4xl dark:text-white [text-wrap:balance]">
                {t("Một cuộc trò chuyện.")}
                <br />
                {t("Cả quy trình tư vấn vật liệu.")}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {t("Khách mô tả không gian, chọn mẫu và thử trên ảnh phòng. Công cụ báo giá tự động tính từ thông số showroom thiết lập — nhân viên nhận trọn ngữ cảnh để chốt đơn mà không phải tính lại từ đầu.")}
              </p>

              <ul className="mt-6 space-y-3">
                {[
                  t("Lát sàn & ốp tường, hỗ trợ đa kiểu lát (so le, xương cá, thẳng hàng)"),
                  t("Tự động tính số thùng và bù hao hụt theo quy cách gạch thực tế"),
                  t("Gói xuất phối cảnh gửi qua Zalo/Email kèm thông tin liên hệ showroom"),
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300"
                  >
                    <Ruler className="mt-0.5 size-4 shrink-0 text-[#15476d] dark:text-sky-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Live Calculation Mockup Card */}
            <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-6 shadow-xl dark:border-white/10 dark:bg-[#0c1824] sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Calculator className="size-5 text-[#15476d] dark:text-sky-400" />
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {t("Bảng tính dự toán tức thì")}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  {t("Tự động")}
                </span>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("Không gian khảo sát:")}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {t("Phòng khách căn hộ · 28 m²")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("Mẫu gạch đề xuất:")}
                  </span>
                  <span className="font-medium text-[#15476d] dark:text-sky-300">
                    Carrara Marble 60 × 60 cm (Matt)
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("Quy cách đóng gói:")}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {t("4 viên/thùng (1.44 m²/thùng)")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t("Hao hụt thi công cắt góc (+7%):")}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-white">
                    {t("+1.96 m² (tổng diện tích: 29.96 m²)")}
                  </span>
                </div>

                <div className="rounded-2xl border border-sky-200/60 bg-white p-4 dark:border-sky-900/40 dark:bg-[#07131e]">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">
                        {t("Số thùng gạch")}
                      </p>
                      <p className="mt-1 text-lg font-bold text-[#15476d] dark:text-sky-300">
                        {t("21 thùng")}
                      </p>
                    </div>
                    <div className="border-x border-slate-200 dark:border-white/10">
                      <p className="text-slate-500 dark:text-slate-400">
                        {t("Keo dán gạch")}
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        6 bao (25kg)
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400">
                        {t("Keo chà ron")}
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                        {t("3 gói (1kg)")}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {t("Tạm tính showroom:")}
                  </span>
                  <span className="text-xl font-bold text-[#15476d] dark:text-sky-300">
                    11.850.000 ₫
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Feature Bento Section */}
      <section className="section-space border-b border-zinc-200/80 bg-slate-50/50 transition-colors dark:border-white/10 dark:bg-[#070e17]">
        <Container>
          <div className="section-heading mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-[#15476d] dark:text-sky-400">
              {t("AVI đầy đủ, thêm chiều sâu chuyên ngành")}
            </p>
            <h2 className="mt-3 font-serif text-3xl font-normal text-slate-900 sm:text-4xl dark:text-white">
              {t("Hơn cả một công cụ phối cảnh.")}
            </h2>
            <p className="mt-4 text-base text-slate-600 dark:text-slate-300">
              {t("Không đánh đổi tính năng chăm sóc khách hàng. AVI Gạch có trọn bộ tiện ích AVI kết hợp các công cụ chuyên biệt cho vật liệu ốp lát.")}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tileFeatures.map((f) => {
              const IconComp = f.icon;
              return (
                <article
                  key={f.title}
                  className="group relative flex flex-col rounded-3xl border border-slate-200/80 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-sky-500/40 hover:shadow-xl dark:border-white/10 dark:bg-[#0c1824] dark:hover:border-white/20"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-grid size-12 place-items-center rounded-2xl bg-sky-50 text-[#15476d] ring-1 ring-sky-100 transition-transform duration-300 group-hover:scale-110 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800/50">
                      <IconComp className="size-6" />
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-white/5 dark:text-slate-400">
                      {f.badge}
                    </span>
                  </div>

                  <h3 className="mt-6 text-lg font-bold text-slate-900 dark:text-white">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {f.text}
                  </p>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="section-space">
        <Container>
          <div className="section-heading text-center">
            <h2 className="font-serif text-3xl font-normal text-slate-900 sm:text-4xl dark:text-white">
              {t("Câu hỏi thường gặp về AVI Gạch")}
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              {t("Giải đáp thắc mắc về tải catalogue, công thức tính và quy trình showroom.")}
            </p>
          </div>
          <Faq
            items={[
              {
                q: t("Showroom có hơn 500 mẫu gạch thì cập nhật thế nào?"),
                a: t("Bạn chỉ cần xuất file Excel/CSV từ phần mềm quản lý kho hoặc POS hiện có. File gồm: Tên mẫu, quy cách (cm), loại bề mặt, giá/m² và ảnh vân gạch. Nạp hoàn tất chỉ trong 5 phút."),
              },
              {
                q: t("Khách tải ảnh phòng chụp từ điện thoại có ướm được không?"),
                a: t("Có. Thuật toán homography phối cảnh tự động tính góc nhìn sàn nhà hoặc mảng tường, sau đó phủ gạch đúng tỷ lệ góc nghiêng để khách nhìn trực quan nhất."),
              },
              {
                q: t("Có tích hợp gửi ảnh dự toán qua Zalo cho khách không?"),
                a: t("Có. Ngay sau khi tính xong, khách có thể bấm nhận tóm tắt báo giá và ảnh phối cảnh gửi thẳng về Zalo hoặc Email để xem lại cùng gia đình."),
              },
            ]}
          />
        </Container>
      </section>

      <FinalCta
        title={t("Nâng tầm tư vấn showroom gạch ốp lát của bạn")}
        subtitle={t("14 ngày trải nghiệm đầy đủ tính năng dự toán & phối cảnh với catalogue của riêng bạn.")}
        primary={{ href: signup, label: t("Mở studio gạch ngay") }}
      />
    </div>
  );
}
