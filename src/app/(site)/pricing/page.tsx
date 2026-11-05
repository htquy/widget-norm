import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { BOT_METAS } from "@/bots/catalog";
import { BOT_PRICING } from "@/domain/bot-pricing";
import { Container } from "@/components/site/Container";
import { Faq, FinalCta } from "@/components/site/Sections";

export const metadata: Metadata = {
  title: "Bảng giá AVI",
  description:
    "AVI từ 199.000 ₫/tháng. AVI Gạch từ 499.000 ₫/tháng. Dùng thử 14 ngày, không cần thẻ.",
};
export default function PricingPage() {
  return (
    <>
      <section className="section-space bg-[#f7f6fd]">
        <Container>
          <div className="section-heading mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold text-brand-700">
              Giá theo nhu cầu cửa hàng
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Bắt đầu gọn nhẹ.
              <br />
              Mở rộng đúng lúc.
            </h1>
            <p>
              Mọi chatbot đều đủ tiện ích AVI. Phần chuyên ngành có mức giá
              riêng. Dùng thử 14 ngày trước khi quyết định.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-7 md:grid-cols-2">
            {BOT_METAS.map((m) => {
              const price = BOT_PRICING[m.kind];
              return (
                <article
                  key={m.kind}
                  className={`rounded-3xl border bg-white p-7 sm:p-9 ${m.kind === "store" ? "border-brand-300 shadow-lift" : "border-zinc-200"}`}
                >
                  <span
                    className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ${m.kind === "store" ? "bg-brand-50 text-brand-800" : "bg-slate-100 text-[#15476d]"}`}
                  >
                    {m.kind === "store"
                      ? "Tiết kiệm nhất · Cho mọi shop"
                      : "AVI + công cụ chuyên ngành"}
                  </span>
                  <h2 className="mt-5 text-2xl font-semibold">{m.shortName}</h2>
                  <p className="mt-2 min-h-12 text-sm leading-relaxed text-zinc-600">
                    {m.tagline}
                  </p>
                  <div className="mt-7 border-y border-zinc-200 py-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-zinc-600">Cơ bản</span>
                      <p className="text-3xl font-semibold tracking-tight">
                        {price.monthly.toLocaleString("vi-VN")} ₫
                        <span className="text-xs font-normal text-zinc-500">
                          {" "}
                          /tháng/bot
                        </span>
                      </p>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-zinc-500">
                      Đầy đủ tiện ích của phiên bản bạn chọn. Xem kỳ thanh toán
                      và tổng tiền tại trung tâm trước khi xác nhận mua.
                    </p>
                  </div>
                  <ul className="my-6 space-y-3">
                    {price.includes.map((f) => (
                      <li key={f} className="flex gap-2 text-sm text-zinc-700">
                        <Check className="size-4 shrink-0 text-emerald-700" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/signup?bot=${m.slug}`}
                    className={`w-full ${m.kind === "store" ? "btn-primary" : "btn-secondary"}`}
                  >
                    Dùng thử {m.shortName}
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
            <h2>Rõ ràng trước khi bắt đầu</h2>
          </div>
          <Faq
            items={[
              {
                q: "Có tự động thu tiền khi hết 14 ngày không?",
                a: "Không. Hết dùng thử, chatbot ngừng phục vụ trên website nếu chưa có gói trả phí. Dữ liệu vẫn được giữ lại.",
              },
              {
                q: "Vì sao AVI Gạch đắt hơn AVI?",
                a: "AVI Gạch có tất cả tính năng AVI, thêm catalogue vật liệu, báo giá m² với hao hụt và vật tư, phối cảnh trên ảnh phòng và A/B test.",
              },
              {
                q: "Thanh toán ở đâu?",
                a: "Đăng nhập bằng tài khoản trung tâm, mở Domain & thanh toán trong workspace và chọn gói. Trung tâm xử lý VietQR, xác nhận thanh toán và cung cấp quyền sử dụng cho chatbot.",
              },
              {
                q: "Một domain dùng được nhiều email không?",
                a: "Một domain chỉ thuộc một tài khoản. Website được chuẩn hóa và kiểm tra trùng tại DB. Sau khi xác minh DNS, quyền sở hữu được giữ lại để không cấp lại dùng thử bằng email khác.",
              },
            ]}
          />
        </Container>
      </section>
      <FinalCta
        title="Thử trước. Chọn gói sau."
        subtitle="14 ngày trải nghiệm với dữ liệu cửa hàng của bạn. Không cần thẻ thanh toán."
      />
    </>
  );
}
