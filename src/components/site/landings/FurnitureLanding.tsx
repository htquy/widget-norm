import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { BotMeta } from "@/bots/meta-types";
import { furnitureSvg, svgDataUrl } from "@/bots/furniture/art";
import { STYLE_INFO } from "@/bots/furniture/design";
import { BOT_PRICING } from "@/domain/bot-pricing";
import { Container } from "@/components/site/Container";
import { Faq, FinalCta } from "@/components/site/Sections";
import { Icon } from "@/components/site/Icon";

const art = (category: string, color: string, w: number, d: number, h: number) => svgDataUrl(furnitureSvg({ category, color, widthCm: w, depthCm: d, heightCm: h }));

/** Hero: căn phòng minh hoạ với đồ đã kê đúng tỉ lệ, số đo và kết quả nhận diện — đúng công cụ chữ ký của bot */
async function StudioMock() {
  const { t } = await getT();
  const jp = STYLE_INFO.japandi;
  return (
    <figure className="furn-stage" aria-label={t("Minh hoạ studio kê thử nội thất")}>
      <div className="furn-room">
        <div className="furn-wall" />
        <div className="furn-window" />
        <div className="furn-floor" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={art("Sofa", "be", 170, 82, 72)} alt="" className="furn-piece" style={{ left: "24%", bottom: "30%", width: "42%" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={art("Bàn trà", t("nâu óc chó"), 100, 50, 35)} alt="" className="furn-piece" style={{ left: "33%", bottom: "12%", width: "29%" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={art("Kệ sách", t("gỗ sáng"), 80, 30, 180)} alt="" className="furn-piece" style={{ left: "75%", bottom: "26%", width: "15%" }} />
        <span className="furn-dim" style={{ left: "24%", width: "42%", bottom: "26%" }}>
          170 cm
        </span>
        <span className="furn-pin" style={{ left: "6%", top: "8%" }}>
          {t("AI nhận diện · Phòng khách · {style} 62%", { style: t(jp.label) })}
        </span>
        <span className="furn-pin furn-pin-ok" style={{ right: "5%", bottom: "5%" }}>
          <Check className="size-3.5" /> {t("Đồ chiếm 19% sàn · lối đi 80 cm")}
        </span>
      </div>
      <figcaption className="furn-caption">
        <span className="flex gap-1">
          {jp.palette.map((c) => (
            <span key={c} className="size-5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
          ))}
        </span>
        <span>
          <strong>{t("Phương án Japandi · 4 × 5 m")}</strong>
          {t("Sofa Kyoto, bàn trà Zen, kệ sách — 16.000.000 ₫")} <em>{t("(minh hoạ)")}</em>
        </span>
      </figcaption>
    </figure>
  );
}

export async function FurnitureLanding({ meta }: { meta: BotMeta }) {
  const { t } = await getT();
  const price = BOT_PRICING[meta.kind];
  const signup = `/signup?bot=${meta.slug}`;
  const steps = [
    { n: "01", t: t("Khách chụp ảnh phòng"), d: t("Hoặc chọn phòng mẫu. AI chạy ngay trên trình duyệt: loại phòng, phong cách, màu chủ đạo, đồ đã có, vùng sàn.") },
    { n: "02", t: t("Bot gợi ý trọn bộ"), d: t("Mỗi danh mục thiết yếu một món của shop: hợp phong cách, vừa phòng, trong ngân sách, không gợi lại món khách đã có.") },
    { n: "03", t: t("Kê thử, gửi cho shop"), d: t("Đồ đứng đúng tỉ lệ trên sàn, kéo thả, xoay. Khách gửi ảnh phương án + tổng tiền, nhân viên gọi chốt.") },
  ];
  return (
    <div className="furn-site">
      <section className="furn-hero">
        <Container>
          <nav className="mb-10 text-xs text-[#7a6a5a]" aria-label={t("Đường dẫn")}>
            <Link href="/bots">Chatbot</Link> / {meta.shortName}
          </nav>
          <div className="grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <p className="furn-eyebrow">{t("Studio nội thất trong khung chat")}</p>
              <h1 className="furn-title mt-5">
                {t("Kê thử trước.")}
                <br />
                <em>Mua</em> sau.
              </h1>
              <p className="mt-6 max-w-md text-base leading-relaxed text-[#5c4d40]">{meta.tagline}.</p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href={signup} className="furn-button">
                  {t("Mở studio cho showroom")} <ArrowRight className="size-4" />
                </Link>
                <span className="text-sm text-[#7a6a5a]">{t("Từ {price} ₫/tháng · 14 ngày dùng thử", { price: price.monthly.toLocaleString("vi-VN") })}</span>
              </div>
              <ul className="mt-8 space-y-2.5">
                {meta.heroPoints.map((p) => (
                  <li key={p} className="flex gap-2.5 text-sm text-[#3d3027]">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#b4532a]" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <StudioMock />
          </div>
        </Container>
      </section>

      <section className="section-space">
        <Container>
          <div className="max-w-2xl">
            <p className="furn-eyebrow">{t("Ba bước, một cuộc trò chuyện")}</p>
            <h2 className="furn-h2 mt-3">{t("Từ bức ảnh căn phòng đến cuộc gọi chốt đơn.")}</h2>
          </div>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="border-t border-[#d9cbb8] pt-6">
                <span className="furn-num">{s.n}</span>
                <h3 className="mt-3 text-lg font-semibold text-[#2d2118]">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5c4d40]">{s.d}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="section-space bg-[#efe6d8]">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="furn-eyebrow">{t("AVI đầy đủ, thêm con mắt của nhà thiết kế")}</p>
              <h2 className="furn-h2 mt-3">{t("Luật thiết kế thật, không để AI đoán.")}</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#5c4d40]">
                {t("Bảng màu 60-30-10 theo phong cách, đồ chiếm không quá 40% sàn, bàn trà cách sofa 40–45 cm, bàn ăn chừa 75 cm kéo ghế, giường chừa 60 cm hai bên. Mọi con số đều do hệ thống tính và có lưu ý đi kèm.")}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {Object.values(STYLE_INFO).map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-2 rounded-full border border-[#d9cbb8] bg-[#fbf7f1] px-3 py-1.5 text-xs text-[#3d3027]">
                    <span className="flex">
                      {s.palette.map((c) => (
                        <span key={c} className="-ml-1 size-3.5 rounded-full ring-2 ring-[#fbf7f1] first:ml-0" style={{ background: c }} />
                      ))}
                    </span>
                    {t(s.label)}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-x-8 sm:grid-cols-2">
              {meta.features.map((f) => (
                <article key={f.title} className="furn-feature">
                  <Icon name={f.icon} className="size-5 text-[#b4532a]" />
                  <h3 className="mt-3 text-[15px] font-semibold text-[#2d2118]">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#5c4d40]">{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="section-space">
        <Container>
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="furn-eyebrow">{t("Chi phí rõ ràng")}</p>
              <h2 className="furn-h2 mt-3">{t("Một nhà thiết kế trực tuyến, giá một nhân viên part-time vài buổi.")}</h2>
              <p className="mt-4 text-sm leading-relaxed text-[#5c4d40]">{t("AI xử lý ảnh chạy trên máy khách nên không tốn phí ảnh theo lượt. Thanh toán và quản lý gói tại tài khoản trung tâm; không tự động thu phí khi hết dùng thử.")}</p>
            </div>
            <div className="rounded-[28px] bg-[#2d2118] p-8 text-[#f5efe6] sm:p-10">
              <p className="text-sm text-[#d9cbb8]">{t("{name} Cơ bản", { name: t(meta.shortName) })}</p>
              <p className="mt-3 font-serif text-5xl tracking-tight">
                {price.monthly.toLocaleString("vi-VN")} ₫<span className="ml-1 font-sans text-sm text-[#d9cbb8]">{t("/tháng/bot")}</span>
              </p>
              <ul className="my-7 space-y-3">
                {price.includes.map((f) => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check className="size-4 shrink-0 text-[#e3a37f]" />
                    {t(f)}
                  </li>
                ))}
              </ul>
              <Link href={signup} className="flex min-h-12 items-center justify-center rounded-full bg-[#f5efe6] px-5 text-sm font-semibold text-[#2d2118]">
                {t("Bắt đầu 14 ngày miễn phí")}
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="section-space border-y border-[#e4d8c7] bg-[#fbf7f1]">
        <Container>
          <h2 className="furn-h2 text-center">{t("Trước khi bạn bắt đầu")}</h2>
          <Faq items={meta.faq} />
        </Container>
      </section>
      <FinalCta title={t("Để khách thấy món đồ trong chính căn phòng của họ.")} subtitle={t("Tạo chatbot, nhập danh mục kèm kích thước, dán một dòng mã vào website.")} primary={{ href: signup, label: t("Trải nghiệm {name}", { name: meta.shortName }) }} />
    </div>
  );
}
