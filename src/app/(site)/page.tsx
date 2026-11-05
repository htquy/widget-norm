import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck,
  ChartNoAxesCombined,
  Check,
  Headset,
  Layers3,
  MessageSquare,
  Palette,
  ShoppingBag,
} from "lucide-react";
import { BOT_METAS } from "@/bots/catalog";
import { BOT_PRICING } from "@/domain/bot-pricing";
import { Container } from "@/components/site/Container";
import { Faq, FinalCta } from "@/components/site/Sections";
import { ProductPreview, MaterialRoom } from "@/components/site/ProductPreview";

const features = [
  {
    Icon: ShoppingBag,
    title: "Hiểu từng món hàng",
    text: "Tìm đúng sản phẩm theo nhu cầu và ngân sách. Giá, thông số và tình trạng hàng từ danh mục của bạn.",
  },
  {
    Icon: BookOpenCheck,
    title: "Nhớ chính sách của shop",
    text: "Phí ship, đổi trả, bảo hành. Câu trả lời dựa trên kiến thức bạn cung cấp, có kiểm tra giá và mã sản phẩm.",
  },
  {
    Icon: CalendarCheck,
    title: "Biến quan tâm thành lịch hẹn",
    text: "Khách chọn dịch vụ và giờ còn trống ngay trong cuộc trò chuyện. Bạn quản lý tất cả ở một nơi.",
  },
  {
    Icon: Headset,
    title: "Luôn có người tiếp nối",
    text: "Khi cần tư vấn sâu, nhân viên tiếp nhận cùng ngữ cảnh. Bot tự dừng để cuộc trò chuyện liền mạch.",
  },
  {
    Icon: ChartNoAxesCombined,
    title: "Biết khách đang cần gì",
    text: "Xem nhu cầu nổi bật, câu hỏi còn bỏ ngỏ và khách tiềm năng để quyết định việc tiếp theo.",
  },
  {
    Icon: Palette,
    title: "Mang màu sắc cửa hàng",
    text: "Đổi màu, tên trợ lý và lời chào. Xem trước widget, dán mã nhúng một lần và cập nhật từ trang quản trị.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hub-hero">
        <Container className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-800">
              <span className="size-1.5 rounded-full bg-brand-600" /> Một người
              đồng hành mới cho cửa hàng
            </span>
            <h1 className="hero-title mt-7">
              Khách cần là có.
              <br />
              Shop bận vẫn bán.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-600">
              Để AVI đón khách, tư vấn sản phẩm và nhận lịch hẹn. Bạn dành thời
              gian cho điều mình làm tốt nhất: phát triển cửa hàng.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary">
                Tạo trợ lý cho shop <ArrowRight className="size-4" />
              </Link>
              <Link href="/bots" className="btn-secondary">
                Khám phá các chatbot
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-zinc-600">
              {[
                "14 ngày miễn phí",
                "Không cần thẻ",
                "Dùng tài khoản email",
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-700" />
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-10 flex items-center gap-4 border-t border-zinc-200/80 pt-6">
              <div className="flex -space-x-2" aria-hidden="true">
                {[ShoppingBag, CalendarCheck, MessageSquare].map((Icon, i) => (
                  <span
                    key={i}
                    className="grid size-10 place-items-center rounded-full border-4 border-white bg-brand-100 text-brand-700"
                  >
                    <Icon className="size-4" />
                  </span>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-zinc-600">
                Từ câu hỏi đầu tiên
                <br />
                <strong className="font-semibold text-zinc-900">
                  đến lần khách quay lại.
                </strong>
              </p>
            </div>
          </div>
          <ProductPreview />
        </Container>
      </section>
      <div className="border-y border-zinc-200 bg-white py-6">
        <Container className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-semibold text-zinc-600">
          <span className="text-xs font-normal text-zinc-500">
            Một dòng mã cho website của bạn
          </span>
          {["WordPress", "Haravan", "Sapo", "LadiPage", "Website riêng"].map(
            (name) => (
              <span key={name}>{name}</span>
            ),
          )}
        </Container>
      </div>
      <section id="chatbot" className="section-space">
        <Container>
          <div className="section-heading">
            <p className="text-sm font-semibold text-brand-700">
              Chọn người đồng hành
            </p>
            <h2>
              Shop của bạn không giống ai.
              <br />
              Chatbot cũng nên như vậy.
            </h2>
            <p>
              Bắt đầu với AVI đầy đủ tiện ích. Chọn phiên bản chuyên ngành khi
              bạn cần nhiều hơn.
            </p>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {BOT_METAS.map((m) => (
              <article
                key={m.kind}
                className={`bot-showcase ${m.kind === "tile" ? "bot-showcase-tile" : "bot-showcase-avi"}`}
              >
                <div className="p-7 sm:p-9">
                  <span className="text-xs font-semibold text-zinc-600">
                    {m.kind === "store"
                      ? "Cho mọi cửa hàng"
                      : "Cho showroom & đại lý vật liệu"}
                  </span>
                  <h3 className="mt-3 text-3xl font-bold tracking-tight">
                    {m.shortName}
                  </h3>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-600">
                    {m.tagline}
                  </p>
                  <p className="mt-5 text-lg font-semibold">
                    Từ {BOT_PRICING[m.kind].monthly.toLocaleString("vi-VN")} ₫
                    <span className="text-xs font-normal text-zinc-500">
                      {" "}
                      /tháng
                    </span>
                  </p>
                  <Link
                    href={`/bots/${m.slug}`}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-800"
                  >
                    Khám phá {m.shortName}
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
                {m.kind === "tile" ? (
                  <div className="showcase-room">
                    <MaterialRoom />
                  </div>
                ) : (
                  <div className="showcase-chat">
                    <div className="rounded-t-2xl border border-b-0 border-brand-200 bg-white p-4">
                      <p className="text-xs text-zinc-500">Khách hàng</p>
                      <p className="mt-1 text-sm">
                        Mình cần một món quà dưới 300k
                      </p>
                      <div className="mt-3 rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-brand-900">
                        AVI tìm thấy Bình giữ nhiệt Everyday, 249.000 ₫.
                        <span className="mt-3 flex items-center gap-2 text-xs font-medium">
                          <ShoppingBag className="size-4" />
                          Còn hàng · Có hộp quà
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </Container>
      </section>
      <section id="nen-tang" className="section-space bg-[#f7f8fc]">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
            <div className="section-heading lg:sticky lg:top-28 lg:self-start">
              <span className="mb-5 inline-grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">
                <Layers3 className="size-6" />
              </span>
              <h2>
                Đủ việc của shop.
                <br />
                Gọn trong một trợ lý.
              </h2>
              <p>
                Mọi chatbot đều có trọn bộ tiện ích AVI. Các phiên bản chuyên
                ngành bổ sung công cụ cho công việc của bạn.
              </p>
              <Link href="/signup" className="btn-primary mt-7">
                Bắt đầu với AVI <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid gap-x-8 gap-y-9 sm:grid-cols-2">
              {features.map(({ Icon, title, text }) => (
                <article key={title} className="border-t border-zinc-200 pt-5">
                  <Icon className="size-6 text-brand-700" />
                  <h3 className="mt-4 text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>
      <section className="section-space">
        <Container>
          <div className="section-heading">
            <p className="text-sm font-semibold text-brand-700">
              Bắt đầu thật đơn giản
            </p>
            <h2>
              Bạn hiểu cửa hàng.
              <br />
              AVI học từ bạn.
            </h2>
          </div>
          <ol className="mt-10 grid gap-7 md:grid-cols-3">
            {[
              [
                "01",
                "Tạo tài khoản & kết nối domain",
                "Đăng nhập bằng email, chọn chatbot và xác minh website của bạn.",
              ],
              [
                "02",
                "Cho AVI biết về shop",
                "Nhập sản phẩm, dịch vụ, chính sách và chọn phong cách widget.",
              ],
              [
                "03",
                "Đón cuộc trò chuyện đầu tiên",
                "Thử ngay trong workspace, dán mã nhúng và theo dõi khách tiềm năng.",
              ],
            ].map(([n, title, text]) => (
              <li key={n} className="relative border-l-2 border-brand-100 pl-6">
                <span className="text-sm font-semibold text-brand-600">
                  {n}
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-600">
                  {text}
                </p>
              </li>
            ))}
          </ol>
        </Container>
      </section>
      <section className="section-space border-t border-zinc-200 bg-zinc-50">
        <Container>
          <div className="section-heading text-center">
            <h2>Bạn có thể đang băn khoăn</h2>
          </div>
          <Faq
            items={[
              {
                q: "AVI dùng được cho shop nào?",
                a: "AVI dùng cho cửa hàng bán sản phẩm hoặc dịch vụ: thời trang, gia dụng, phụ kiện, quà tặng và nhiều ngành khác. Bạn cung cấp danh mục và kiến thức; bot tư vấn trong phạm vi đó.",
              },
              {
                q: "Bot gạch có đủ các tính năng của AVI không?",
                a: "Có. Bot gạch kế thừa toàn bộ AVI, thêm catalogue gạch, báo giá theo diện tích, ướm gạch lên ảnh phòng và A/B test. Vì vậy mức giá cao hơn AVI.",
              },
              {
                q: "Dùng thử và thanh toán thế nào?",
                a: "Đăng nhập tài khoản email để dùng thử 14 ngày. Domain cần xác minh để nhúng lên website. Thanh toán và quản lý quyền sử dụng qua tài khoản trung tâm; không tự động thu tiền sau dùng thử.",
              },
              {
                q: "Tôi có thể dùng nhiều email cho một website không?",
                a: "Mỗi domain thuộc một tài khoản sở hữu. Hệ thống chuẩn hóa domain và kiểm tra trùng tại cơ sở dữ liệu; đổi email không cấp lại dùng thử cho website đã đăng ký.",
              },
            ]}
          />
        </Container>
      </section>
      <FinalCta
        title="Một cửa hàng bận rộn. Một trợ lý luôn sẵn sàng."
        subtitle="Bắt đầu từ dữ liệu của bạn. Trải nghiệm AVI miễn phí trong 14 ngày."
      />
    </>
  );
}
