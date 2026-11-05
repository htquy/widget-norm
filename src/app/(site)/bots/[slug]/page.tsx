import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  ArrowRight,
  Check,
  Grid3x3,
  Ruler,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { BOT_METAS, metaBySlug } from "@/bots/catalog";
import { BOT_PRICING } from "@/domain/bot-pricing";
import { Container } from "@/components/site/Container";
import { ChatMock } from "@/components/site/ChatMock";
import { MaterialRoom } from "@/components/site/ProductPreview";
import { Faq, FinalCta } from "@/components/site/Sections";
import { Icon } from "@/components/site/Icon";
import { DemoWidget } from "@/components/site/DemoWidget";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() {
  return BOT_METAS.map((m) => ({ slug: m.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = metaBySlug((await params).slug);
  return m ? { title: m.name, description: m.tagline } : {};
}

export default async function BotPage({ params }: Props) {
  const slug = (await params).slug;
  if (slug === "tro-ly-ban-hang") permanentRedirect("/bots/avi");
  const meta = metaBySlug(slug);
  if (!meta) notFound();
  const tile = meta.kind === "tile",
    price = BOT_PRICING[meta.kind],
    signup = `/signup?bot=${meta.slug}`;
  return (
    <div className={tile ? "tile-site" : "avi-site"}>
      <DemoWidget
        key={meta.demoSlug}
        tenant={meta.demoSlug}
        name={meta.shortName}
        accent={meta.accentHex}
      />
      {tile ? (
        <section className="tile-hero">
          <Container>
            <nav
              className="mb-10 text-xs text-[#526674]"
              aria-label="Đường dẫn"
            >
              <Link href="/bots">Chatbot</Link> / AVI Gạch
            </nav>
            <div className="grid items-center gap-10 lg:grid-cols-[.85fr_1.15fr]">
              <div>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-[#15476d]">
                  <Grid3x3 className="size-4" /> Studio tư vấn vật liệu
                </span>
                <h1 className="tile-title mt-6">
                  Đừng chỉ
                  <br />
                  chọn gạch.
                  <br />
                  Hãy thấy
                  <br />
                  cả không gian.
                </h1>
                <p className="mt-6 max-w-sm text-base leading-relaxed text-[#526674]">
                  Từ một bức ảnh phòng đến mẫu gạch phù hợp, dự toán vật tư và
                  lịch hẹn showroom. AVI Gạch giúp khách hình dung trước khi
                  quyết định.
                </p>
                <Link href={signup} className="tile-button mt-8">
                  Mở studio của bạn <ArrowRight className="size-4" />
                </Link>
                <p className="mt-4 text-xs text-[#526674]">
                  Toàn bộ AVI + công cụ chuyên ngành · 14 ngày dùng thử
                </p>
              </div>
              <MaterialRoom />
            </div>
            <div className="mt-10 grid gap-5 border-t border-[#ccd7da] pt-7 sm:grid-cols-3">
              {[
                ["Tư vấn có cơ sở", "Catalogue và thông số của showroom"],
                ["Dự toán rõ ràng", "Số thùng, hao hụt, keo và ron"],
                ["Tiếp nối đúng lúc", "Lead, phối cảnh và lịch khảo sát"],
              ].map(([t, d]) => (
                <div key={t}>
                  <p className="text-sm font-semibold text-[#15476d]">{t}</p>
                  <p className="mt-1 text-xs text-[#526674]">{d}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : (
        <section className="avi-hero">
          <Container className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="avi-wordmark" aria-label="AVI">
                avi
                <span className="avi-dot" />
              </div>
              <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Nhỏ gọn trong web.
                <br />
                Tháo vát như người nhà.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-600">
                Gặp AVI, trợ lý AI cho mọi cửa hàng. Tư vấn đúng món, nhớ chính
                sách, nhận lịch hẹn và gọi nhân viên khi bạn cần.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {[
                  "Thời trang",
                  "Gia dụng",
                  "Công nghệ",
                  "Quà tặng",
                  "Dịch vụ",
                ].map((i) => (
                  <span
                    key={i}
                    className="rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs text-brand-800"
                  >
                    {i}
                  </span>
                ))}
              </div>
              <Link href={signup} className="btn-primary mt-8">
                Đón AVI về cửa hàng <ArrowRight className="size-4" />
              </Link>
              <p className="mt-4 text-sm text-zinc-500">
                Từ {price.monthly.toLocaleString("vi-VN")} ₫/tháng · Dùng thử 14
                ngày
              </p>
            </div>
            <div className="avi-chat-stage">
              <div className="avi-orbit-tag">
                <ShoppingBag className="size-4" /> Hiểu danh mục của bạn
              </div>
              <ChatMock kind="store" />
              <div className="avi-orbit-note">
                <Check className="size-4 text-emerald-700" /> Mọi tính năng lõi,
                ngay từ đầu
              </div>
            </div>
          </Container>
        </section>
      )}
      {tile && (
        <section className="section-space">
          <Container>
            <div className="grid gap-10 lg:grid-cols-2">
              <div className="section-heading">
                <p className="text-sm font-semibold text-[#15476d]">
                  Từ lựa chọn đến dự toán
                </p>
                <h2 className="font-serif">
                  Một cuộc trò chuyện.
                  <br />
                  Cả quy trình tư vấn.
                </h2>
                <p>
                  Khách mô tả không gian, chọn mẫu và thử trên ảnh phòng. Công
                  cụ báo giá tính từ thông số bạn thiết lập; nhân viên nhận đủ
                  ngữ cảnh để tiếp tục tư vấn.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    "Lát sàn & ốp tường, nhiều kiểu lát",
                    "Số thùng và hao hụt theo quy cách",
                    "Ảnh phối cảnh kèm thông tin liên hệ",
                  ].map((i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <Ruler className="size-4 shrink-0 text-[#15476d]" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
              <ChatMock kind="tile" />
            </div>
          </Container>
        </section>
      )}
      <section
        className={`section-space ${tile ? "bg-[#edf2f3]" : "bg-white"}`}
      >
        <Container>
          <div className="section-heading">
            <p
              className={`text-sm font-semibold ${tile ? "text-[#15476d]" : "text-brand-700"}`}
            >
              {tile
                ? "AVI đầy đủ, thêm chiều sâu chuyên ngành"
                : "Một trợ lý, đủ việc của shop"}
            </p>
            <h2 className={tile ? "font-serif" : ""}>
              {tile
                ? "Hơn một công cụ phối cảnh."
                : "Mỗi cuộc trò chuyện đều được chăm chút."}
            </h2>
            <p>
              {tile
                ? "Không đánh đổi tính năng chăm sóc khách hàng. AVI Gạch có trọn bộ AVI và các công cụ riêng cho vật liệu ốp lát."
                : "Bạn cung cấp dữ liệu cửa hàng. AVI kết nối sản phẩm, kiến thức và con người thành một trải nghiệm liền mạch."}
            </p>
          </div>
          <div
            className={`mt-10 grid gap-6 sm:grid-cols-2 ${tile ? "lg:grid-cols-3" : "lg:grid-cols-3"}`}
          >
            {meta.features.map((f) => (
              <article
                key={f.title}
                className={tile ? "material-feature" : "avi-feature"}
              >
                <Icon
                  name={f.icon}
                  className={`size-6 ${tile ? "text-[#15476d]" : "text-brand-700"}`}
                />
                <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {f.text}
                </p>
              </article>
            ))}
          </div>
        </Container>
      </section>
      <section className="section-space">
        <Container>
          <div
            className={`grid items-start gap-10 ${tile ? "lg:grid-cols-[1fr_1.1fr]" : "lg:grid-cols-2"}`}
          >
            <div className="section-heading">
              <p className="text-sm font-semibold text-brand-700">
                Chi phí rõ ràng
              </p>
              <h2 className={tile ? "font-serif" : ""}>
                {tile
                  ? "Một showroom thông minh hơn."
                  : "Đầy đủ tiện ích. Vừa túi tiền shop."}
              </h2>
              <p>
                {tile
                  ? "Phần chuyên ngành có thêm catalogue vật liệu, công cụ dự toán và studio phối cảnh. Mọi tiện ích AVI đã bao gồm trong giá."
                  : "AVI là điểm khởi đầu tiết kiệm nhất trong hệ chatbot. Các bot chuyên ngành bổ sung nghiệp vụ và có mức giá riêng."}
              </p>
              <p className="mt-5 text-sm text-zinc-500">
                Không tự động thu phí khi hết dùng thử. Thanh toán và quản lý
                gói tại tài khoản trung tâm.
              </p>
            </div>
            <div
              className={`rounded-3xl p-7 sm:p-9 ${tile ? "bg-[#15476d] text-white" : "border border-brand-200 bg-brand-50"}`}
            >
              <p className="text-sm font-medium">{meta.shortName} Cơ bản</p>
              <p className="mt-3 text-4xl font-bold tracking-tight">
                {price.monthly.toLocaleString("vi-VN")} ₫
                <span className="ml-1 text-sm font-normal opacity-75">
                  /tháng/bot
                </span>
              </p>
              <ul className="my-7 space-y-3">
                {price.includes.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="size-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={signup}
                className={
                  tile
                    ? "flex min-h-12 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-[#15476d]"
                    : "btn-primary w-full"
                }
              >
                Bắt đầu 14 ngày miễn phí
              </Link>
            </div>
          </div>
        </Container>
      </section>
      <section className="section-space border-y border-zinc-200 bg-zinc-50">
        <Container>
          <div className="section-heading text-center">
            <h2 className={tile ? "font-serif" : ""}>Trước khi bạn bắt đầu</h2>
          </div>
          <Faq items={meta.faq} />
        </Container>
      </section>
      <FinalCta
        title={
          tile
            ? "Đưa showroom đến ngay ngôi nhà của khách."
            : "Để AVI đón vị khách tiếp theo."
        }
        subtitle="Đăng nhập email, tạo chatbot và trải nghiệm với dữ liệu cửa hàng của bạn."
        primary={{
          href: signup,
          label: tile ? "Trải nghiệm AVI Gạch" : "Trải nghiệm AVI",
        }}
      />
    </div>
  );
}
