import { getT } from "@/lib/i18n/server";
import { Star, ShieldCheck, Quote } from "lucide-react";

export async function Testimonials() {
  const { t } = await getT();
  const reviews = [
    {
      name: t("Nguyễn Tuấn Anh"),
      role: t("Giám đốc vận hành"),
      business: t("Showroom Gạch & Thiết bị Hoàng Gia"),
      bot: t("AVI Gạch"),
      quote:
        t("Trước đây khách hỏi diện tích phòng 25m², 40m² hết bao nhiêu thùng, nhân viên phải ngồi bấm máy tính và tra bảng giá thủ công. Giờ khách gửi ảnh phòng, AVI Gạch tự tính số thùng, hao hụt, keo dán ron rồi gửi báo giá ngay lập tức."),
      metric: t("+42% tỷ lệ chốt đơn hẹn"),
      tag: t("Vật liệu xây dựng"),
    },
    {
      name: t("Trần Mai Phương"),
      role: t("Phụ trách Kinh doanh"),
      business: t("Thời trang & Phụ kiện L'Ami"),
      bot: t("AVI Bán lẻ"),
      quote:
        t("Lượng khách nhắn tin ban đêm từ 22h - 1h sáng rất đông. AVI trả lời chính xác 100% tình trạng còn hàng và chính sách đổi trả từ kho hàng của shop, không bao giờ bịa đặt giá cả. Sáng ra nhân viên chỉ việc gọi xác nhận đơn."),
      metric: t("0 khách hàng bị bỏ lỡ"),
      tag: t("Thời trang & Bán lẻ"),
    },
    {
      name: t("Thầy Lê Đức Huy"),
      role: t("Trưởng phòng Tuyển sinh"),
      business: t("Học viện Ngoại ngữ Pathways"),
      bot: t("Luyện thi IELTS"),
      quote:
        t("Tính năng làm test nhanh 15 câu và tự xếp lớp theo band mục tiêu ngay trong chat giúp phụ huynh và học viên tin tưởng hơn hẳn. Tư vấn viên không mất thời gian sàng lọc ban đầu mà có sẵn toàn bộ thông tin nhu cầu của học viên."),
      metric: t("2.5x lịch hẹn test trực tiếp"),
      tag: t("Đào tạo & Giáo dục"),
    },
  ];

  return (
    <div className="mt-12 grid gap-6 md:grid-cols-3">
      {reviews.map((r) => (
        <figure
          key={r.name}
          className="relative flex flex-col justify-between rounded-3xl border border-zinc-200/80 bg-white p-7 shadow-lg transition-all hover:border-brand-500/30 hover:shadow-xl dark:border-white/10 dark:bg-[#0d1017] dark:hover:border-white/20"
        >
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex text-amber-400 gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-white/5 dark:border-white/10 dark:text-white/60">
                {r.tag}
              </span>
            </div>

            <Quote className="size-6 text-brand-500/30 mb-3" />

            <blockquote className="text-sm leading-relaxed text-zinc-700 dark:text-white/80 [text-wrap:pretty]">
              &ldquo;{r.quote}&rdquo;
            </blockquote>
          </div>

          <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-white/5">
            <div className="flex items-baseline justify-between gap-2 mb-3">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20">
                {r.metric}
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-white/40">{t("Dùng {bot}", { bot: r.bot })}</span>
            </div>

            <div>
              <figcaption className="text-sm font-bold text-zinc-950 dark:text-white flex items-center gap-1.5">
                <span>{r.name}</span>
                <ShieldCheck className="size-3.5 text-brand-500" />
              </figcaption>
              <p className="text-xs text-zinc-500 dark:text-white/40">{r.role} · {r.business}</p>
            </div>
          </div>
        </figure>
      ))}
    </div>
  );
}
