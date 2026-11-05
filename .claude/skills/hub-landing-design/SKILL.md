---
name: hub-landing-design
description: Ngôn ngữ thiết kế cho landing page, trang giới thiệu từng chatbot, bảng giá và đăng ký của Widget Norm — kế thừa token và utility của skill-pages (iris + hổ phách, aurora, eyebrow, btn-primary, card-lift, reveal). Dùng khi tạo/sửa bất kỳ trang marketing nào.
---

# Thiết kế trang marketing (theo skill-pages)

Nguồn: landing của `skill-pages` (`app/page.tsx`, `src/presentation/components/landing/*`, `app/globals.css`). Bản sao utility ở `references/skill-pages-utilities.css`, yêu cầu UI gốc ở `references/03-ui-product-requirements.md`.

## Token

- `brand-*` (tím iris, 50–950): màu chủ đạo — link, focus, nút chính. `spark-*` (hổ phách): **chỉ** điểm xuyết (gói nổi bật, badge "mới", chữ nhấn).
- Nền trung tính `zinc`; `emerald` = thành công/miễn phí; `rose` = lỗi.
- Font Geist (có subset `vietnamese`). Tiêu đề `tracking-tight`, `[text-wrap:balance]`; đoạn văn `[text-wrap:pretty]`, `leading-relaxed`.
- Easing `ease-fluid` cho chuyển động, `ease-spring` cho icon nảy.

## Utility (đã có trong `src/app/globals.css`)

`aurora` / `aurora-dark` (nền quầng màu), `bg-grid` / `bg-grid-dark`, `text-gradient`, `border-gradient`, `eyebrow` (nhãn đầu section), `btn-primary`, `btn-secondary`, `card-lift`, `card-topline`, `reveal` (hiện khi cuộn), `stagger` + `animate-fade-up` (style `--d`).

## Bố cục trang

- Section: `border-b border-zinc-200 py-16 sm:py-24`, nội dung trong `Container` (`max-w-7xl px-4 sm:px-6 lg:px-8`).
- Đầu section: `eyebrow` → `h2 text-3xl sm:text-4xl font-bold` → mô tả `text-zinc-600`, căn giữa `max-w-[680px]`.
- Thẻ: `rounded-3xl border border-zinc-200 bg-white p-6 sm:p-8 card-lift reveal`, icon trong ô `size-12 rounded-xl` màu theo bot.
- Hero: 2 cột (7/5) — trái thông điệp + 2 CTA, phải là "bản xem thử" sản phẩm (khung chat demo thật, không ảnh giả).
- CTA cuối: khối `aurora-dark rounded-3xl bg-zinc-950`.
- Mỗi bot có màu nhận diện riêng (`accent`) dùng cho icon/ô màu — không thay màu thương hiệu chung.

## Bắt buộc (ui-ux-pro-max)

Tương phản ≥ 4.5:1, vùng bấm ≥ 44px, focus ring rõ, không dùng emoji làm icon (dùng lucide-react), không cuộn ngang ở 375px, `prefers-reduced-motion` tắt animation, tắt animation lặp trên mobile.
Số liệu trên trang phải là thật (đếm từ DB) hoặc ghi rõ là ví dụ — không bịa "10.000+ khách hàng".
