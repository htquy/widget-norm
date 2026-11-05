# Widget Norm

Widget chatbot AI dùng chung cho **mọi cửa hàng** (bán lẻ, mỹ phẩm, spa, phòng khám, nội thất…): tư vấn theo đúng danh mục và chính sách của shop, **đặt lịch** ngay trong khung chat, **chuyển nhân viên** khi gặp câu khó (gọi lại, Zalo, hoặc nhân viên vào chat trực tiếp), **tuỳ biến giao diện** widget, và **phân tích nhu cầu** khách từ từng câu hỏi.

Kiến trúc kế thừa từ `widget-tile-visual` (Clean Architecture, Next.js 16, Drizzle, PGlite/Postgres), bỏ phần chuyên ngành gạch (trình xem thử, báo giá m²) và làm luôn **Phase 2C** của `widget-tile-visual/docs/PLAN-LLM.md`: tầng quyết định **jev** chạy trước LLM chính.

## Chạy thử

```bash
npm install
cp .env.example .env.local   # điền AUTH_SECRET, OPENROUTER_API_KEY (tuỳ chọn)
npm run dev                  # http://localhost:3000
```

- Trang demo (shop **Lumi Beauty** — mỹ phẩm & spa, widget ở góc phải): http://localhost:3000
- Quản trị: http://localhost:3000/admin — `admin@demo.vn` / `demo1234` (có 30 ngày dữ liệu mẫu)
- Không có `OPENROUTER_API_KEY` → bot và phân loại chạy theo luật, mọi chức năng vẫn dùng được.

```bash
npm run typecheck && npm test        # 40 test: domain, jev (fetch giả), tích hợp PGlite
npm run eval:decision                # chấm tầng quyết định trên 24 câu tiếng Việt có nhãn (gọi OpenRouter thật)
npm run build && npm start
```

## Chức năng

| Nhóm | Chức năng |
|---|---|
| **Tư vấn** | Tìm sản phẩm theo nhu cầu (bỏ dấu, chấm điểm tên/danh mục/tag/mô tả), thẻ sản phẩm trong chat, trả lời chính sách từ *Kiến thức cửa hàng*, **guard** chặn số tiền/SKU không có trong dữ liệu (hỏi lại 1 lần → câu an toàn + gợi ý nhân viên) |
| **Tầng quyết định jev** | Mỗi tin nhắn → nhãn (13 loại), độ tin cậy, độ khó, chủ đề, cảm xúc, nhu cầu. Chào hỏi / hỏi giờ mở cửa / đặt lịch / vi phạm → trả lời mẫu **không gọi LLM**; ngoài dữ liệu / phàn nàn / muốn gặp người → chuyển nhân viên; câu dễ → LLM rẻ, câu khó hoặc tin cậy < 0.6 → LLM mạnh. jev lỗi → phân loại theo luật |
| **Đặt lịch** | Dịch vụ (thời lượng, giá), giờ mở cửa theo thứ, bước khung giờ, sức chứa song song, đặt trước tối thiểu, ngày nghỉ, xác nhận thủ công/tự động; khoá chống 2 khách giữ cùng chỗ; bot có tool `check_availability` / `open_booking_form`; admin xem theo ngày, đổi trạng thái, xuất CSV |
| **Chuyển nhân viên** | Tự đề nghị khi: khách đòi gặp người, phàn nàn, câu ngoài dữ liệu, bot N lượt liên tiếp chưa giải quyết được, khách bực 2 lượt liền, guard chặn. Thẻ trong widget: để lại SĐT gọi lại / gọi ngay / Zalo / Messenger. Ngoài giờ làm việc bot nói rõ sẽ liên hệ khi mở cửa |
| **Live chat** | Hộp *Cần hỗ trợ* (đếm trên menu), nhân viên **nhận chat** → bot dừng, tin nhân viên đến widget qua poll 4 giây; *Đã xử lý* → bot trả lời tiếp |
| **Giao diện widget** | Màu (tự chọn chữ trắng/đen đạt tương phản AA), vị trí trái/phải, nút có chữ/nút tròn, bo góc, sáng/tối/theo máy, phông chữ, tên + ảnh trợ lý, lời chào, câu gợi ý nhanh, lời mời cạnh nút, tự mở sau N giây, khoảng cách lề — **xem trước trực tiếp**, lưu là áp dụng (widget.js đọc cấu hình từ server, không cần đổi mã nhúng) |
| **Phân tích nhu cầu** | Chủ đề hỏi nhiều (kèm số chưa trả lời/tiêu cực), ý định, cảm xúc, cách xử lý (% không cần LLM), câu bot chưa trả lời được (gợi ý bổ sung kiến thức), từ khoá nhu cầu, **báo cáo AI** (nhu cầu nổi bật, sản phẩm nên bổ sung, FAQ nên thêm, việc nên làm), xuất CSV câu hỏi |
| **Khác** | 👍/👎 từng câu trả lời + đánh giá 1–5 sao cuộc chat, lead CRM (nguồn: form / gọi lại / đặt lịch, trạng thái, giá trị chốt), dashboard (phễu, sản phẩm được quan tâm, mức hài lòng, chi phí & tuyến xử lý AI), webhook `{kind: lead|booking|handoff}`, giới hạn website nhúng, rate limit, nhập sản phẩm CSV, API `WidgetNorm.open()` |

## Cấu trúc

```
src/domain          luật thuần: booking (khung giờ UTC+7), decision (planRoute), theme (tương phản), tenant, lead, product
src/application     use case: chat (điều phối jev → mẫu/handoff/LLM + guard), bookings, support (handoff/live chat), insights, analytics
src/adapters        Drizzle repositories, OpenRouter LLM theo tầng, JevDecisionGateway, bộ luật dự phòng, webhook
src/app             /api/public/[tenant]/* (widget), /embed/[tenant], /admin/*
public/widget.js    script nhúng (đọc cấu hình nút từ /api/public/[tenant]/loader)
scripts/            migrate, eval-decision
```

## Lưu ý vận hành

- `OPENROUTER_DATA_COLLECTION=deny` khi có dữ liệu khách thật. Với `deny`, jev-router chỉ được chọn nhà cung cấp không lưu dữ liệu.
- jev thêm ~2–4 giây/tin nhắn (đo bằng `npm run eval:decision`), bù lại bỏ qua LLM cho ~35% tin nhắn. Muốn nhanh hơn: `DECISION_MODEL=deepseek/deepseek-v4.1-flash` hoặc `DECISION_PROVIDER=rules`.
- Khoá hội thoại, khoá đặt lịch, rate limit đang ở bộ nhớ 1 tiến trình — chạy nhiều instance cần chuyển sang advisory lock Postgres / Redis (cùng chữ ký `withLock`).
- PGlite chỉ chạy 1 tiến trình; deploy thật dùng `DATABASE_URL`.

Kế hoạch & tiến độ: [docs/PLAN.md](docs/PLAN.md).
