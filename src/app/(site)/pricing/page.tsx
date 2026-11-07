import { localizeMeta } from "@/bots/localize";
import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { BOT_METAS } from "@/bots/catalog";
import { BOT_PRICING } from "@/domain/bot-pricing";
import { Container } from "@/components/site/Container";
import { Faq, FinalCta } from "@/components/site/Sections";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
  title: t("Bảng giá AVI"),
  description:
    t("AVI từ 199.000 ₫/tháng. AVI Gạch từ 499.000 ₫/tháng. Dùng thử 14 ngày, không cần thẻ."),
};
}

export default async function PricingPage() {
  const { t } = await getT();
  return (
    <>
      <section className="section-space border-b border-zinc-200/80 bg-zinc-50/70 transition-colors dark:border-white/10 dark:bg-[#07080b]">
        <Container>
          <div className="section-heading mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-600 dark:text-brand-400">
              {t("Giá theo nhu cầu cửa hàng")}
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-white sm:text-5xl">
              {t("Bắt đầu gọn nhẹ.")}
              <br />
              {t("Mở rộng đúng lúc.")}
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400">
              {t("Mọi chatbot đều đủ tiện ích AVI. Phần chuyên ngành có mức giá riêng. Dùng thử 14 ngày trước khi quyết định.")}
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-7xl gap-7 md:grid-cols-2 xl:grid-cols-4">
            {BOT_METAS.map((raw) => localizeMeta(raw, t)).map((m) => {
              const price = BOT_PRICING[m.kind];
              const isStore = m.kind === "store";
              return (
                <article
                  key={m.kind}
                  className={`relative flex flex-col rounded-3xl border p-7 sm:p-8 transition-all duration-300 hover:shadow-xl ${
                    isStore
                      ? "border-brand-500/40 bg-white shadow-lift ring-1 ring-brand-500/20 dark:bg-[#0e121d] dark:border-brand-500/50 dark:ring-brand-500/30"
                      : "border-zinc-200/80 bg-white dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-white/20"
                  }`}
                >
                  {isStore && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-md">
                        <Sparkles className="size-3" /> {t("Phổ biến nhất")}
                      </span>
                    </div>
                  )}

                  <span
                    className={`inline-flex self-start rounded-full px-3 py-1.5 text-xs font-medium ${
                      isStore
                        ? "bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-300 dark:ring-1 dark:ring-brand-700/50"
                        : "bg-zinc-100 text-zinc-700 dark:bg-white/5 dark:text-zinc-300 dark:ring-1 dark:ring-white/10"
                    }`}
                  >
                    {isStore
                      ? t("Tiết kiệm nhất · Cho mọi shop")
                      : m.kind === "education"
                        ? t("AVI + tuyển sinh & học phí")
                        : m.kind === "furniture"
                          ? t("AVI + kích thước & tạm tính")
                          : t("AVI + công cụ chuyên ngành")}
                  </span>

                  <h2 className="mt-5 text-2xl font-bold text-zinc-950 dark:text-white">
                    {m.shortName}
                  </h2>
                  <p className="mt-2 min-h-12 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                    {m.tagline}
                  </p>

                  <div className="mt-7 border-y border-zinc-200/80 py-5 dark:border-white/10">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {t("Cơ bản")}
                      </span>
                      <p className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                        {price.monthly.toLocaleString("vi-VN")} ₫
                        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          {" "}
                          {t("/tháng/bot")}
                        </span>
                      </p>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                      {t("Đầy đủ tiện ích của phiên bản bạn chọn. Xem kỳ thanh toán và tổng tiền tại trung tâm trước khi xác nhận mua.")}
                    </p>
                  </div>

                  <ul className="my-6 space-y-3">
                    {price.includes.map((f) => (
                      <li
                        key={f}
                        className="flex gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        <Check className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        {t(f)}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/signup?bot=${m.slug}`}
                    className={`mt-auto w-full ${
                      isStore
                        ? "btn-primary"
                        : "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-semibold text-zinc-800 transition-colors hover:border-zinc-300 hover:bg-zinc-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                    }`}
                  >
                    {t("Dùng thử {name}", { name: t(m.shortName) })}
                    <ArrowRight className="size-4" />
                  </Link>
                </article>
              );
            })}
          </div>
        </Container>
      </section>

      <section className="section-space">
        <Container>
          <div className="section-heading text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white sm:text-4xl">
              {t("Rõ ràng trước khi bắt đầu")}
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              {t("Những điều cần biết về chi phí, kỳ thanh toán và tích hợp.")}
            </p>
          </div>
          <Faq
            items={[
              {
                q: t("Có tự động thu tiền khi hết 14 ngày không?"),
                a: t("Không. Hết dùng thử, chatbot ngừng phục vụ trên website nếu chưa có gói trả phí. Dữ liệu vẫn được giữ lại."),
              },
              {
                q: t("Vì sao AVI Gạch đắt hơn AVI?"),
                a: t("AVI Gạch có tất cả tính năng AVI, thêm catalogue vật liệu, báo giá m² với hao hụt và vật tư, phối cảnh trên ảnh phòng và A/B test."),
              },
              {
                q: t("Thanh toán ở đâu?"),
                a: t("Đăng nhập bằng tài khoản trung tâm, mở Domain & thanh toán trong workspace và chọn gói. Trung tâm xử lý VietQR, xác nhận thanh toán và cung cấp quyền sử dụng cho chatbot."),
              },
              {
                q: t("Một domain dùng được nhiều email không?"),
                a: t("Một domain chỉ thuộc một tài khoản. Website được chuẩn hóa và kiểm tra trùng tại DB. Sau khi xác minh DNS, quyền sở hữu được giữ lại để không cấp lại dùng thử bằng email khác."),
              },
            ]}
          />
        </Container>
      </section>

      <FinalCta
        title={t("Thử trước. Chọn gói sau.")}
        subtitle={t("14 ngày trải nghiệm với dữ liệu cửa hàng của bạn. Không cần thẻ thanh toán.")}
      />
    </>
  );
}
