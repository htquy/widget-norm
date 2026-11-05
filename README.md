# Widget Norm

Web tập trung các **chatbot AI cho cửa hàng** để thương mại hoá: khách hàng chọn đúng chatbot cho ngành của mình, đăng ký dùng thử 14 ngày, dán một dòng mã vào website. Một tài khoản tạo được nhiều chatbot.

| Chatbot | Dành cho | Nghiệp vụ riêng |
|---|---|---|
| **Trợ lý bán hàng & đặt lịch** (`store`) | Mỹ phẩm & spa, thời trang, phòng khám, salon, điện máy… | Danh mục sản phẩm, tư vấn theo dữ liệu thật |
| **Tư vấn & xem thử gạch ốp lát** (`tile`) | Cửa hàng gạch, vật liệu xây dựng | Báo giá theo m² (hao hụt, keo, ron), xem thử gạch trên ảnh phòng (AI chạy ngay trên trình duyệt), A/B test |

Cả hai dùng chung: tầng quyết định **jev** + LLM theo độ khó, chống trả lời bịa, **đặt lịch**, **chuyển nhân viên + live chat**, **phân tích nhu cầu** khách, tuỳ biến giao diện widget, lead/CRM, tài khoản + gói cước. Sắp có thêm bot khác — xem [docs/PLAN.md](docs/PLAN.md) mục 5.

## Chạy thử

```bash
npm install
npm run models                # tải model ONNX cho trình xem thử gạch (~120 MB, bỏ qua nếu không dùng bot gạch)
cp .env.example .env.local    # điền AUTH_SECRET và OPENROUTER_API_KEY (tuỳ chọn)
npm run dev                   # http://localhost:3000
```

- Website: `/` (landing) · `/bots` · `/bots/tro-ly-ban-hang` · `/bots/tu-van-gach-op-lat` · `/pricing` · `/signup`
- Quản trị: `/admin` — `admin@demo.vn` / `demo1234` (tài khoản demo có **2 bot**: `lumi-demo`, `gach-dep-demo`, kèm 30 ngày dữ liệu mẫu)
- Chat toàn màn hình: `/embed/lumi-demo`, `/embed/gach-dep-demo`
- Không có `OPENROUTER_API_KEY` → bot và phân loại chạy theo luật, mọi chức năng vẫn dùng được.

```bash
npm run typecheck && npm test   # 54 test: domain, jev (fetch giả), tích hợp PGlite nhiều bot, tài khoản/gói
npm run eval:decision           # chấm tầng quyết định trên 24 câu tiếng Việt (gọi OpenRouter thật)
npm run build && npm start
```

## Kiến trúc

Một PostgreSQL, **nhiều schema**: `public` (tài khoản, bot, hội thoại, lead, sự kiện, phân tích, lịch hẹn — dùng chung) + `store` + `tile` (dữ liệu riêng từng loại bot, không FK chéo schema). Mỗi bot là một module cắm vào chat engine chung qua `BotModule`.

```
src/domain         luật thuần dùng chung
src/application    use case dùng chung (chat engine, đặt lịch, handoff, phân tích, tài khoản)
src/bots           types.ts (BotModule) · catalog.ts · roadmap.ts · store/ · tile/
src/app/(site)     landing, trang từng bot, bảng giá, đăng ký (thiết kế theo skill-pages)
src/app/admin      quản trị: mục chung + mục riêng theo loại bot
public/widget.js   script nhúng (đọc giao diện từ server)
```

Thêm một loại bot mới: checklist ở [docs/PLAN.md](docs/PLAN.md) mục 2. Quy tắc kiến trúc và thiết kế nằm trong `.claude/skills/hub-architecture` và `hub-landing-design`.

## Nhúng vào website

```html
<script src="https://<domain>/widget.js" data-tenant="<slug-bot>" async></script>
```

Màu, vị trí, kiểu nút, lời mời, tự mở… chỉnh ở *Giao diện widget* — áp dụng ngay, không cần dán lại. `WidgetNorm.open()` mở chat từ nút của bạn.

## Lưu ý vận hành

- `OPENROUTER_DATA_COLLECTION=deny` khi có dữ liệu khách thật (mặc định). `allow` chỉ để test với model `:free` và khi muốn jev-router chọn mọi nhà cung cấp.
- jev thêm ~2–4 giây/tin nhắn, bù lại ~35% tin nhắn không gọi LLM. Nhanh hơn: `DECISION_MODEL=deepseek/deepseek-v4.1-flash` hoặc `DECISION_PROVIDER=rules`.
- Hết hạn dùng thử mà chưa chọn gói → widget tạm ngưng (dữ liệu giữ nguyên). **Thanh toán chưa tích hợp** — kích hoạt gói thủ công.
- Khoá hội thoại/đặt lịch và rate limit đang trong bộ nhớ 1 tiến trình; PGlite chỉ chạy 1 tiến trình — deploy thật dùng `DATABASE_URL` và (nhiều instance) chuyển khoá sang Postgres/Redis.
- Ảnh vân gạch/phối cảnh: đĩa `./storage` hoặc Cloudflare R2 (`R2_*`).
