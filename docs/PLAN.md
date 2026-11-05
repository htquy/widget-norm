# Kế hoạch Widget Norm

Cập nhật: 2026-11-05

## 1. Bối cảnh

`widget-tile-visual` là chatbot cho cửa hàng gạch (xem thử gạch trên ảnh phòng, báo giá m²). Widget Norm tổng quát hoá thành **bot chung cho mọi cửa hàng** và bổ sung: đặt lịch, chuyển nhân viên + live chat, tuỳ biến giao diện, phân tích nhu cầu; đồng thời triển khai **Phase 2C** (tầng quyết định jev) của `widget-tile-visual/docs/PLAN-LLM.md`.

## 2. Tầng quyết định (Phase 2C) — đã làm

| Quyết định | Nhãn | Hành động | Gọi LLM? |
|---|---|---|---|
| Vi phạm / ngoài phạm vi | `abuse`, `injection`, `off_topic` | Câu từ chối mẫu | Không |
| Trả lời ngay | `greeting`, `thanks_bye`, `ask_contact`, `booking` | Mẫu (giờ mở cửa, địa chỉ…), mở form đặt lịch | Không |
| Cần người | `human_request`, `complaint`, `not_in_data` | Thẻ liên hệ nhân viên, hộp *Cần hỗ trợ*, webhook | Không |
| Cần LLM | `product_query`, `knowledge_query`, `needs_consult` | `simple` → model rẻ, `complex` → model mạnh | Có |
| Leo thang | bot N lượt chưa giải quyết, 2 lượt tiêu cực liền | Chuyển nhân viên | Không |

- Ngưỡng tin cậy 0.6: thấp hơn → bỏ qua jev, gọi LLM mạnh (an toàn hơn từ chối nhầm).
- jev lỗi/timeout 6 s → phân loại theo luật (`ruleDecisionGateway`), hội thoại không vỡ.
- Đo: bảng `llm_calls` có `decision_label/confidence/model/latency/tokens` + `route`; dashboard hiện % lượt không cần LLM, tuyến xử lý.
- Kết quả `npm run eval:decision` (2026-11-05, 24 câu): jev-router **24/24**, p50 2,8 s, p90 3,9 s; bộ luật 23/24.

## 3. Gói việc

- [x] Domain: booking (khung giờ, sức chứa, giờ VN), decision (`planRoute`), theme (tương phản WCAG), tenant chuẩn hoá cài đặt cũ
- [x] Chat: jev → mẫu / handoff / LLM theo tầng, guard số tiền & SKU, recap khi đổi ngữ cảnh, tool `search_products`, `get_product_details`, `list_services`, `check_availability`, `open_booking_form`, `request_human`
- [x] Đặt lịch: API công khai (dịch vụ / ngày còn chỗ / khung giờ / đặt), khoá chống trùng, lead + ghi chú nội bộ + webhook
- [x] Handoff + live chat: hộp *Cần hỗ trợ*, nhận chat, trả lời, trả lại bot, poll tin mới, kiểm tra quyền sở hữu hội thoại
- [x] Widget: theme động, sáng/tối, thẻ sản phẩm, thẻ đặt lịch, thẻ nhân viên, 👍/👎, đánh giá sao, nhớ tên/SĐT, widget.js đọc cấu hình từ server, lời mời, tự mở
- [x] Admin: tổng quan, hội thoại, phân tích nhu cầu (+ báo cáo AI), lịch hẹn, lead, sản phẩm & dịch vụ (+CSV), giao diện widget (xem trước), cài đặt & mã nhúng, xuất CSV
- [x] Test: 40 test (domain, jev fetch giả, tích hợp PGlite); script đánh giá jev
- [ ] 2A: gọi qua AI Gateway `skill-pages` (route, chính sách PII, ngắt mạch, hạn mức theo shop) — hiện gọi thẳng OpenRouter
- [ ] 2B.3: khoá hội thoại/đặt lịch + rate limit sang Postgres/Redis để chạy nhiều instance
- [ ] Streaming câu trả lời (SSE) — giảm cảm giác chờ khi có jev (+2–4 s)
- [ ] Kênh Zalo OA / Messenger (domain đã có `channel`)
- [ ] Nhắc lịch hẹn (SMS/Zalo ZNS) trước giờ hẹn; khách tự huỷ/đổi lịch qua link
- [ ] Nhiều nhân viên: phân công hội thoại, thông báo trình duyệt khi có khách cần hỗ trợ
- [ ] Bộ đánh giá 50–100 hội thoại đầy đủ (so sánh Haiku / GLM / DeepSeek cho câu trả lời, không chỉ phân loại)

## 4. Nhật ký (mới nhất ở trên)

- 2026-11-05 — Khởi tạo dự án từ kiến trúc widget-tile-visual; làm toàn bộ mục đã tick ở trên; chạy thật với OpenRouter (jev-router + deepseek-v4.1-flash / claude-haiku-5.5).

## 5. Bàn giao

- Dữ liệu demo nằm ở `./data/pglite` (xoá thư mục để seed lại).
- `.env.local` khi dev đang dùng `OPENROUTER_DATA_COLLECTION=allow` — đổi sang `deny` trước khi có dữ liệu khách thật.
