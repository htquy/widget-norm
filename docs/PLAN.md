# Kế hoạch Widget Norm

Cập nhật: 2026-11-05 · Kế hoạch LLM/jev: [PLAN-LLM.md](PLAN-LLM.md)

## 1. Định hướng

Widget Norm là **web tập trung các loại chatbot để thương mại hoá**: khách hàng chọn chatbot đúng ngành, đăng ký dùng thử, dán một dòng mã vào website. Hiện có **2 chatbot** (store, tile); lộ trình thêm bot khác ở mục 5.

- Phần lõi dùng chung mọi bot: tầng quyết định jev + LLM, chống bịa, đặt lịch, chuyển nhân viên + live chat, phân tích nhu cầu, tuỳ biến giao diện widget, lead/CRM, tài khoản + gói cước.
- Phần riêng từng bot (nghiệp vụ + dữ liệu): nằm trong một **module** `src/bots/<kind>/` và một **schema DB riêng**.

## 2. Kiến trúc hub

```
src/domain            luật thuần dùng chung (booking, decision, theme, tenant, account, lead…) — không biết bot cụ thể
src/application       use case dùng chung: chat (engine), bookings, support, insights, analytics, tenants/auth
src/bots/types.ts     BotModule — điểm cắm giữa engine và nghiệp vụ ngành
src/bots/<kind>/      meta.ts (giới thiệu) · module.ts (tool, prompt, grounding, API riêng) · repository.ts (schema riêng)
                      widget/ (extension của khung chat) · admin/ (trang quản trị riêng) · demo.ts
src/app/(site)        landing, /bots, /bots/[slug], /pricing, /signup  (thiết kế theo skill-pages)
src/app/admin         quản trị: dùng chung + mục riêng theo loại bot (meta.adminNav)
```

### CSDL (một PostgreSQL, nhiều schema — xem `.claude/skills/hub-architecture`)

| Schema | Bảng | Ai dùng |
|---|---|---|
| `public` | `accounts`, `tenants` (1 bot, có `kind`), `admin_users`, `conversations`, `leads` (cột `meta` jsonb cho dữ liệu riêng), `events`, `message_insights`, `llm_calls`, `services`, `bookings` | engine + use case dùng chung |
| `store` | `products` | module store |
| `tile` | `tiles`, `quotes`, `settings` (hao hụt, keo, ron, % A/B) | module tile |

Quy tắc: mọi bảng có `tenant_id`; **không FK chéo schema**; module chỉ đọc/ghi schema của mình, dữ liệu chung đi qua port; thêm bot = thêm schema + DDL idempotent. DB của bản trước tự nâng cấp (bảng `products` được `SET SCHEMA store`, tenant cũ được gán account).

### Thêm một loại bot mới (checklist)

1. `src/domain/tenant.ts`: thêm `kind` vào `BOT_KINDS`.
2. `src/bots/<kind>/`: `meta.ts` (nội dung giới thiệu), `repository.ts` + bảng trong `schema.ts` (`pgSchema("<kind>")`, DDL, RLS), `module.ts` (`BotModule`: tool, `promptLines`, `groundingFacts`, `shopSummary`, `cards`, `fallbackLlm`, `seedDemo`…).
3. Đăng ký ở `src/bots/catalog.ts` (meta) và `src/infrastructure/container.ts` (module). Widget riêng (nếu cần): `widget/extension.tsx` + `src/components/widget/extensions.ts`. Admin riêng: trang + `meta.adminNav` + route wrapper trong `src/app/admin/(panel)`.
4. Demo: `seedDemo` + seed trong `infrastructure/db/seed.ts`; test tích hợp ở `src/integration.test.ts`; thêm câu vào `scripts/eval-decision.ts`; xoá bot khỏi `src/bots/roadmap.ts`.

## 3. Gói việc

- [x] Lõi chat: jev → mẫu / handoff / LLM theo độ khó, guard, recap, tool đặt lịch & gọi nhân viên
- [x] Đặt lịch, handoff + live chat, phân tích nhu cầu (+ báo cáo AI), giao diện widget có xem trước, lead, CSV
- [x] **Hub đa bot**: `BotModule`, tài khoản → nhiều bot, chọn/tạo bot, giới hạn theo gói, schema DB theo bot, nâng cấp DB cũ
- [x] **Bot store** (bán hàng & đặt lịch) và **bot tile** (tư vấn & xem thử gạch: báo giá m², trình xem thử SlimSAM, A/B test) — gộp từ widget-tile-visual
- [x] **Website thương mại**: landing, danh mục chatbot, trang giới thiệu từng bot, bảng giá, đăng ký dùng thử, hết hạn dùng thử chặn widget
- [x] Skill dự án: `.claude/skills/hub-architecture`, `hub-landing-design`
- [x] 54 test (domain, jev, tích hợp PGlite nhiều bot, tài khoản/gói)
- [ ] **Thanh toán & kích hoạt gói** (nối hub thanh toán của skill-pages: SePay/VietQR, `check-access`) — hiện nâng cấp qua liên hệ
- [ ] **SSO** dùng chung tài khoản skill-pages (OAuth2 PKCE) thay đăng nhập riêng
- [ ] Hạn mức tin nhắn theo gói (`messagesPerMonth`) — hiện mới là giới hạn số bot
- [ ] 2A: gọi qua AI Gateway `skill-pages`; 2B.3: khoá/rate limit sang Postgres/Redis (xem PLAN-LLM)
- [ ] Streaming câu trả lời (SSE); kênh Zalo OA / Messenger
- [ ] Nhắc lịch hẹn (SMS/Zalo ZNS); khách tự huỷ/đổi lịch
- [ ] Nhiều nhân viên: phân công hội thoại, thông báo trình duyệt
- [ ] Ảnh phòng gửi kèm câu hỏi cho LLM (bản cũ của bot gạch có, chưa chuyển sang engine chung)

## 4. Quyết định cần lưu ý

- Tên thương hiệu nền tảng đặt ở `src/lib/site.ts` (hiện "Widget Norm") — đổi một chỗ.
- Bảng giá là tham khảo (`src/domain/account.ts`, `PLANS`); chưa tích hợp thanh toán.
- Số "cửa hàng đang dùng" trên landing chỉ đếm bot thật (loại trừ bot demo).
- `OPENROUTER_DATA_COLLECTION=deny` là mặc định; `.env.local` dev đang `allow` để jev-router chọn được mọi nhà cung cấp — đổi trước khi có dữ liệu khách thật.

## 5. Lộ trình chatbot tương lai

Chi tiết (schema dự kiến, phần dùng lại) ở `src/bots/roadmap.ts` — landing hiển thị mục "Sắp ra mắt" từ đó.

| Bot | Nghiệp vụ riêng → schema | Dùng lại từ lõi |
|---|---|---|
| Đặt bàn & thực đơn nhà hàng | `menu_items`, `tables`, `reservations` | jev, live chat, đặt lịch (khung giờ), phân tích |
| Tư vấn tuyển sinh & khoá học | `courses`, `classes`, `placements` | jev, đặt lịch học thử, lead |
| Tư vấn bất động sản | `listings`, `viewings`, `loan_scenarios` | jev, đặt lịch xem nhà, chuyển nhân viên |
| Đặt khám phòng khám | `doctors`, `specialties`, `visits` | jev, đặt lịch theo tài nguyên (bác sĩ) |
| Chăm sóc sau bán & bảo hành | `warranties`, `tickets`, `kb_articles` | jev, live chat, chuyển nhân viên |

Việc nền tảng cần làm trước khi nhân rộng bot: đặt lịch **theo tài nguyên** (bác sĩ/bàn/phòng, hiện chỉ có sức chứa chung), hạn mức tin nhắn theo gói, và nhập/đồng bộ danh mục từ Haravan/Sapo/Shopify.

## 6. Nhật ký (mới nhất ở trên)

- 2026-11-05 — Chuyển thành web tập trung nhiều chatbot: DB multi-schema (public/store/tile), `BotModule`, gộp widget-tile-visual thành bot `tile`, tài khoản + gói + đăng ký, landing/trang bot/bảng giá theo skill-pages, đưa PLAN-LLM vào docs. Chạy thật: cả 2 bot qua jev + LLM, upgrade DB cũ, đăng ký, chuyển bot, A/B.
- 2026-11-05 — Khởi tạo Widget Norm từ kiến trúc widget-tile-visual: lõi chat + jev, đặt lịch, handoff/live chat, giao diện widget, phân tích nhu cầu.

## 7. Bàn giao

- Dữ liệu demo ở `./data/pglite` (xoá để seed lại: tài khoản `admin@demo.vn`/`demo1234` có 2 bot `lumi-demo`, `gach-dep-demo`).
- Model ONNX của trình xem thử gạch (~120 MB) không nằm trong git: `npm run models`.
- Ảnh vân gạch/ảnh phối cảnh lưu `./storage` hoặc Cloudflare R2 (biến `R2_*`, xem `.env.example`).
