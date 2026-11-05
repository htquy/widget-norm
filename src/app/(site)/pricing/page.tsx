import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PLANS } from "@/domain/account";
import { Container } from "@/components/site/Container";
import { Faq, FinalCta, PlanGrid, SectionHead } from "@/components/site/Sections";

export const metadata: Metadata = { title: "Bảng giá", description: "Dùng thử 14 ngày miễn phí, sau đó từ 299.000 ₫/tháng cho mỗi chatbot." };

const COMPARE: { label: string; get: (i: number) => string }[] = [
  { label: "Số chatbot trong tài khoản", get: (i) => String(PLANS[i].maxBots) },
  { label: "Tin nhắn bot trả lời / tháng / bot", get: (i) => (PLANS[i].messagesPerMonth ? PLANS[i].messagesPerMonth!.toLocaleString("vi-VN") : "Theo thoả thuận") },
];

const FAQ = [
  { q: "Tin nhắn được tính thế nào?", a: "Mỗi lượt khách nhắn mà bot trả lời được tính một tin nhắn. Câu trả lời mẫu do tầng quyết định xử lý (chào hỏi, giờ mở cửa…) cũng tính, nhưng chi phí AI thấp hơn nhiều nên giá gói đã cân đối sẵn." },
  { q: "Dùng thử có bị tự trừ tiền không?", a: "Không. Dùng thử 14 ngày không cần thẻ; hết hạn, chatbot trên website tạm ngưng trả lời cho đến khi bạn chọn gói; dữ liệu của bạn vẫn được giữ nguyên." },
  { q: "Có thể đổi gói hoặc thêm chatbot sau không?", a: "Có. Bạn thêm chatbot ở trang quản trị trong giới hạn của gói; cần nhiều hơn thì nâng gói." },
  { q: "Thanh toán thực hiện thế nào?", a: "Tính năng thanh toán trực tuyến đang được tích hợp. Trong lúc đó, bạn dùng thử đầy đủ tính năng và liên hệ để kích hoạt gói trả phí." },
];

export default function PricingPage() {
  return (
    <>
      <section className="aurora border-b border-zinc-200 bg-white py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Bảng giá" title="Giá đơn giản, mọi chatbot đều đủ tính năng lõi" subtitle="Giá theo tháng cho mỗi chatbot. Chọn một hoặc nhiều chatbot trong cùng tài khoản." />
          <PlanGrid />
          <div className="mt-12 overflow-x-auto rounded-3xl border border-zinc-200 bg-white">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">So sánh giới hạn các gói</caption>
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Giới hạn
                  </th>
                  {PLANS.map((p) => (
                    <th key={p.id} scope="col" className="px-5 py-3 font-semibold text-zinc-900">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {COMPARE.map((r) => (
                  <tr key={r.label}>
                    <th scope="row" className="px-5 py-3 font-medium text-zinc-700">
                      {r.label}
                    </th>
                    {PLANS.map((p, i) => (
                      <td key={p.id} className="px-5 py-3 tabular-nums text-zinc-800">
                        {r.get(i)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mx-auto mt-10 grid max-w-3xl gap-2 text-sm text-zinc-700 sm:grid-cols-2">
            {["Tầng quyết định jev + LLM theo độ khó", "Đặt lịch, chuyển nhân viên, live chat", "Phân tích nhu cầu và xuất CSV", "Tuỳ biến giao diện widget"].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                {t} — có ở mọi gói
              </li>
            ))}
          </ul>
        </Container>
      </section>
      <section className="border-b border-zinc-200 bg-white py-16 sm:py-24">
        <Container>
          <SectionHead eyebrow="Câu hỏi về giá" title="Giải đáp nhanh" />
          <Faq items={FAQ} />
        </Container>
      </section>
      <FinalCta title="Bắt đầu miễn phí hôm nay" subtitle="14 ngày dùng thử đầy đủ tính năng gói Chuyên nghiệp." />
    </>
  );
}
