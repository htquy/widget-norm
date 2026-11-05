import Link from "next/link";
import Script from "next/script";
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_SLUG } from "@/infrastructure/db/seed";

const FEATURES = [
  { title: "Tư vấn đúng dữ liệu shop", text: "Bot chỉ giới thiệu sản phẩm, giá và chính sách có trong danh mục & kiến thức của shop. Bộ kiểm tra chặn số tiền / mã sản phẩm bịa." },
  { title: "Tầng quyết định jev", text: "Mỗi tin nhắn được phân loại trước: chào hỏi, hỏi giờ mở cửa, đặt lịch… trả lời ngay không tốn LLM; câu khó mới gọi model mạnh." },
  { title: "Đặt lịch trong khung chat", text: "Khách chọn dịch vụ, ngày, giờ còn trống ngay trong widget. Shop xác nhận, đánh dấu đã phục vụ, xuất CSV." },
  { title: "Chuyển nhân viên đúng lúc", text: "Câu ngoài dữ liệu, khách phàn nàn hoặc bot nhiều lần chưa giải quyết → gợi ý gọi lại, Zalo, hoặc nhân viên vào chat trực tiếp." },
  { title: "Phân tích nhu cầu", text: "Chủ đề được hỏi nhiều, câu bot chưa trả lời được, cảm xúc khách và báo cáo AI đề xuất việc nên làm." },
  { title: "Tuỳ biến giao diện", text: "Màu, vị trí, kiểu nút, bo góc, chế độ tối, tên & ảnh trợ lý, lời mời — xem trước trực tiếp, không cần đổi mã nhúng." },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <span className="text-[17px] font-bold tracking-tight">Widget Norm</span>
          <Link href="/admin" className="inline-flex min-h-10 items-center rounded-lg bg-[var(--fg)] px-4 text-[14px] font-medium text-white">
            Trang quản trị
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 sm:py-14">
        <section className="max-w-3xl">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[var(--accent)]">Trợ lý chat cho mọi cửa hàng</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">Tư vấn, đặt lịch và chăm sóc khách 24/7 — chuyển sang nhân viên khi cần</h1>
          <p className="mt-4 text-[16px] leading-relaxed text-[var(--fg-muted)]">
            Đây là trang demo của shop <b>Lumi Beauty</b> (mỹ phẩm & spa). Bấm nút chat ở góc phải để thử: hỏi sản phẩm cho da dầu, phí giao hàng, đặt lịch soi da, hoặc hỏi “đơn hàng của tôi đâu” để xem bot chuyển nhân viên.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" id="open-chat" className="inline-flex min-h-11 items-center rounded-lg bg-[var(--accent)] px-5 text-[15px] font-semibold text-white">
              Mở khung chat
            </button>
            <Link href={`/embed/${DEMO_SLUG}`} target="_blank" className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] bg-white px-5 text-[15px] font-medium">
              Chat toàn màn hình
            </Link>
          </div>
        </section>

        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Tính năng">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-[var(--border)] bg-white p-5">
              <h2 className="text-[16px] font-semibold">{f.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--fg-muted)]">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-xl border border-[var(--border)] bg-white p-6">
          <h2 className="text-[18px] font-semibold">Thử trang quản trị</h2>
          <p className="mt-2 text-[14px] text-[var(--fg-muted)]">
            Tài khoản demo: <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5">{DEMO_EMAIL}</code> / <code className="rounded bg-[var(--surface-2)] px-1.5 py-0.5">{DEMO_PASSWORD}</code> — có sẵn 30 ngày dữ liệu mẫu.
          </p>
        </section>
      </main>
      <Script src="/widget.js" data-tenant={DEMO_SLUG} strategy="afterInteractive" />
      <Script id="open-chat-btn" strategy="afterInteractive">{`document.getElementById("open-chat")?.addEventListener("click",function(){window.WidgetNorm&&window.WidgetNorm.open()})`}</Script>
    </div>
  );
}
