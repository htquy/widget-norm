import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { BotMeta } from "@/bots/meta-types";
import { BOT_PRICING } from "@/domain/bot-pricing";
import { Container } from "@/components/site/Container";
import { Faq, FinalCta } from "@/components/site/Sections";
import { Icon } from "@/components/site/Icon";

/** Hero: phiếu test + kết quả band + lộ trình trên trục thời gian — đúng hai công cụ chữ ký */
async function ExamMock() {
  const { t } = await getT();
  const steps = [
    { name: "Pre-Intermediate", band: "4.5 → 5.5", when: "12/11 – 18/02", weeks: t("14 tuần") },
    { name: "Intensive 6.5+", band: "5.0 → 6.5", when: "18/02 – 08/07", weeks: t("20 tuần") },
  ];
  return (
    <div className="ielts-stage" aria-label={t("Minh hoạ test xếp lớp và lộ trình")}>
      <div className="ielts-sheet">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-[#5b6b86]">
          <span>{t("Câu 9 / 15 · Đọc hiểu")}</span>
          <span className="ielts-progress">
            <span style={{ width: "60%" }} />
          </span>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed text-[#1d2a44]">
          “Books must be returned within three weeks; late returns are charged a small fee per day.” — Keep a book four weeks?
        </p>
        <div className="mt-4 grid gap-2">
          {["You cannot borrow again", "Nothing, four weeks is fine", "You pay for the extra days"].map((o, i) => (
            <span key={o} className={`ielts-option ${i === 2 ? "ielts-option-on" : ""}`}>
              <b>{"ABC"[i]}.</b> {o}
            </span>
          ))}
        </div>
      </div>
      <div className="ielts-result">
        <p className="text-[11px] uppercase tracking-[0.14em] text-[#5b6b86]">{t("Kết quả ước lượng")}</p>
        <p className="ielts-band">
          4.5<span>{t("B1 thấp")}</span>
        </p>
        <ol className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <li key={s.name} className="relative pl-6 text-[12.5px]">
              <span className="ielts-dot">{i + 1}</span>
              <b className="text-[#1d2a44]">{s.name}</b> <span className="text-[#5b6b86]">{s.band}</span>
              <span className="block text-[#5b6b86]">
                {s.when} · {s.weeks}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-md bg-[#fff1b8] px-2.5 py-1.5 text-[12px] text-[#5a4700]">{t("Kịp ngày thi 20/07 · 25.200.000 ₫ (ví dụ)")}</p>
      </div>
    </div>
  );
}

export async function IeltsLanding({ meta }: { meta: BotMeta }) {
  const { t } = await getT();
  const price = BOT_PRICING[meta.kind];
  const signup = `/signup?bot=${meta.slug}`;
  return (
    <div className="ielts-site">
      <section className="ielts-hero">
        <Container>
          <nav className="mb-10 text-xs text-[#5b6b86]" aria-label={t("Đường dẫn")}>
            <Link href="/bots">Chatbot</Link> / {meta.shortName}
          </nav>
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="ielts-eyebrow">{t("Cho trung tâm luyện thi IELTS")}</p>
              <h1 className="ielts-title mt-5">
                {t("“Em đang band mấy,")}
                <br />
                {t("học bao lâu thì")} <mark>{t("đủ 6.5")}</mark>?”
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-[#3b4a66]">
                {t("Câu hỏi đầu tiên của gần như mọi học viên. {name} trả lời bằng bài test ngay trong chat và lộ trình ghép từ đúng các lớp bạn đang tuyển.", { name: t(meta.shortName) })}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href={signup} className="ielts-button">
                  {t("Gắn vào website trung tâm")} <ArrowRight className="size-4" />
                </Link>
                <span className="text-sm text-[#5b6b86]">{t("Từ {price} ₫/tháng · 14 ngày dùng thử", { price: price.monthly.toLocaleString("vi-VN") })}</span>
              </div>
            </div>
            <ExamMock />
          </div>
        </Container>
      </section>

      <section className="section-space">
        <Container>
          <div className="grid gap-12 lg:grid-cols-3">
            {meta.heroPoints.map((p, i) => (
              <div key={p} className="ielts-point">
                <span className="ielts-num">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-3 text-[15px] leading-relaxed text-[#1d2a44]">{p}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-space ielts-ruled">
        <Container>
          <div className="max-w-2xl">
            <p className="ielts-eyebrow">{t("Công cụ của tư vấn viên giỏi nhất, chạy 24/7")}</p>
            <h2 className="ielts-h2 mt-3">{t("Không hứa điểm. Chỉ đưa số liệu thật.")}</h2>
            <p className="mt-4 text-sm leading-relaxed text-[#3b4a66]">{t("Đáp án test chỉ nằm ở máy chủ; band là ước lượng và bot luôn nói rõ Nói/Viết cần giáo viên kiểm tra. Lộ trình, ngày khai giảng, học phí, ưu đãi đều tính từ dữ liệu trung tâm nhập.")}</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {meta.features.map((f) => (
              <article key={f.title} className="ielts-card">
                <Icon name={f.icon} className="size-5 text-[#c2412d]" />
                <h3 className="mt-3 text-[15px] font-semibold text-[#1d2a44]">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#3b4a66]">{f.text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-space">
        <Container>
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="ielts-eyebrow">{t("Mỗi lead đã có hồ sơ")}</p>
              <h2 className="ielts-h2 mt-3">{t("Tư vấn viên gọi đúng người, đúng lớp.")}</h2>
              <ul className="mt-6 space-y-2.5 text-sm text-[#1d2a44]">
                {[t("Band ước lượng + CEFR từ test"), t("Band mục tiêu, ngày thi"), t("Lộ trình khoá + tổng học phí"), t("Hội thoại đầy đủ để đọc lại")].map((x) => (
                  <li key={x} className="flex gap-2">
                    <Check className="size-4 shrink-0 text-[#c2412d]" />
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-[#1d2a44] bg-white p-8 shadow-[6px_6px_0_#1d2a44] sm:p-10">
              <p className="text-sm text-[#5b6b86]">{t("{name} Cơ bản", { name: t(meta.shortName) })}</p>
              <p className="mt-3 font-mono text-5xl font-semibold tracking-tight text-[#1d2a44]">
                {price.monthly.toLocaleString("vi-VN")} ₫<span className="ml-1 font-sans text-sm font-normal text-[#5b6b86]">{t("/tháng/bot")}</span>
              </p>
              <ul className="my-7 space-y-3">
                {price.includes.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-[#1d2a44]">
                    <Check className="size-4 shrink-0 text-[#c2412d]" />
                    {t(f)}
                  </li>
                ))}
              </ul>
              <Link href={signup} className="ielts-button w-full justify-center">
                {t("Bắt đầu 14 ngày miễn phí")}
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="section-space border-y border-[#dfe3ea] bg-[#f6f7f9]">
        <Container>
          <h2 className="ielts-h2 text-center">{t("Trước khi bạn bắt đầu")}</h2>
          <Faq items={meta.faq} />
        </Container>
      </section>
      <FinalCta title={t("Biến mỗi câu “em đang band mấy” thành một lead có lộ trình.")} subtitle={t("Nhập khoá theo band, dán một dòng mã, để bot lo phần test và lộ trình.")} primary={{ href: signup, label: t("Trải nghiệm {name}", { name: meta.shortName }) }} />
    </div>
  );
}
