---
name: hub-architecture
description: Kiến trúc hub đa chatbot của Widget Norm — DB multi-schema (public dùng chung + schema riêng mỗi loại bot), module bot cắm vào chat engine chung, quy tắc không join chéo schema. Đọc trước khi thêm loại bot mới, thêm bảng, hoặc sửa chat engine.
---

# Hub đa chatbot — quy tắc kiến trúc

Rút gọn từ `references/15-microservice-modular-architecture.md` (chuẩn modular monolith của skill-pages), áp dụng cho Widget Norm.

## 1. Database (một PostgreSQL, nhiều schema)

| Schema | Chứa | Ai được đọc/ghi |
|---|---|---|
| `public` | `accounts`, `admin_users`, `tenants` (= 1 bot của khách, có `kind`, `plan`), `conversations`, `leads`, `events`, `message_insights`, `llm_calls`, `services`, `bookings` | chat engine + use case dùng chung |
| `store` | `products` | chỉ module `src/bots/store` |
| `tile` | `tiles`, `quotes`, `settings` | chỉ module `src/bots/tile` |

- Bảng dữ liệu bot có `tenant_id`; bảng tài khoản/domain/license dùng `account_id` hoặc subject trung tâm. Mọi truy vấn lọc chủ sở hữu lấy từ server (session hoặc slug), không tin client.
- **Không join chéo schema** trong application/domain. Module bot đọc bảng `public` qua port/repository dùng chung; engine dùng chung lấy dữ liệu của bot qua interface `BotModule` (`src/bots/types.ts`).
- Thêm bảng: khai báo Drizzle trong `src/infrastructure/db/schema.ts` (dùng `pgSchema("<kind>")`), thêm DDL `CREATE ... IF NOT EXISTS` vào mảng `DDL` (idempotent, chạy lúc khởi động), bật RLS.
- Id hội thoại/lead lưu dạng text; khoá ngoại logic (không FK chéo schema) để mỗi module tách thành service riêng được.

## 2. Module bot

Mỗi loại bot là một thư mục `src/bots/<kind>/` gồm:
- `meta.ts` — nội dung giới thiệu (client-safe): tên, slug, tagline, tính năng, use case, FAQ, gói giá.
- `module.ts` — server: `tools(ctx)`, `promptLines(tenant)`, `groundingFacts(tenant)`, `cards(ids)`, `extras(turn)`, `fallbackLlm`, `defaults`, `seedDemo`.
- `widget.tsx` — `WidgetExtension` (thẻ, nút nhanh, panel riêng) cắm vào `ChatWidget` chung.
- `admin/*` — trang quản trị riêng, khai báo trong `adminNav`.

Đăng ký module trong `src/infrastructure/container.ts` (server) và `src/bots/catalog.ts` (meta, dùng được ở client).

AVI là capability nền tảng (`kind=store` để tương thích dữ liệu). Bot ngành phải dùng `composeWithAvi` từ `src/bots/avi/compose.ts` để kế thừa catalogue, prompt, grounding và cards; không sao chép logic AVI. Booking, knowledge, CRM, live chat và analytics do engine chung cung cấp. Fixtures demo thuộc module ngành, không kế thừa hàng mẫu đa ngành.

`public.website_domains` khóa domain chuẩn hóa duy nhất, `hub_identities` lưu subject + token mã hóa, `bot_licenses` gắn một subscription app của hub với một bot được chọn. Account/domain/license lấy từ session hoặc tenant đã resolve ở server. Module dùng chung account/payment/gateway thực sự nằm ở `skill-pages`; widget chỉ có adapter HTTP và trạng thái riêng của sản phẩm.

Chat engine (`src/application/use-cases/chat.ts`) giữ phần chung: tầng quyết định jev, chuyển nhân viên, live chat, guard chống bịa, ghi phân tích. **Không** viết logic riêng của một ngành trong engine.

## 3. Kiểm tra trước khi xong

```bash
npm run typecheck && npm test
```
Test tích hợp chạy trên PGlite với đủ các schema — thêm test cho module mới vào `src/integration.test.ts` hoặc file test của module.

## 4. Cổng chất lượng bot ngách (bắt buộc trước khi `status: "live"`)

Chi tiết và lý do ở `docs/PLAN.md` mục "Cổng chất lượng bot ngách". Tóm tắt — một bot mới phải có:
1. Ngách hẹp, khách và câu hỏi tiền bạc cụ thể (không "đào tạo nói chung").
2. Công cụ chữ ký tương tác trong widget (`widget/extension.tsx`: `renderPanel` + `quickActions`).
3. ≥ 2 phép tính tất định ở domain, có test; tool trả `notes` khi có giả định.
4. Thẻ/kết quả riêng trong khung chat (`renderCards`/`renderExtras`).
5. Trang giới thiệu phong cách riêng (`src/components/site/landings/<Kind>Landing.tsx`, CSS `.<kind>-site`).
6. Lead mang dữ liệu ngành trong `leads.meta`.
7. Demo dùng được công cụ chữ ký ngay trên trang giới thiệu.
8. Model trình duyệt: giấy phép thương mại, khai báo trong `scripts/models.json`.

Mã xử lý ảnh dùng chung giữa các bot (SlimSAM, homography, tách vùng sàn) nằm ở `src/bots/tile/vision/` — bot khác import trực tiếp, không sao chép.

## 5. Hai ngôn ngữ (vi/en)

- Giao diện (website, admin): `import { getT } from "@/lib/i18n/server"` (server) hoặc `useT()` từ `@/lib/i18n/client` (client); viết `t("Câu tiếng Việt")` và thêm bản Anh vào `src/lib/i18n/messages/*.ts`. Component dùng chung cả server lẫn client thì phải là client component (không import `server.ts`). Hằng số cấp module không được gọi `t()` — giữ chuỗi gốc rồi dịch ở chỗ hiển thị.
- **Thêm ngôn ngữ mới**: khai báo ở `src/lib/i18n/languages.ts` (đăng ký duy nhất) rồi làm theo 4 bước trong chú thích đầu file đó: từ điển giao diện `messages/<mã>/`, widget `widget/<mã>.ts`, gói chatbot `domain/chat-packs/<mã>.ts`. Trang `/admin/languages` cho tải file JSON các câu chưa dịch. Nội dung giới thiệu bot (`BotMeta`) dịch qua `localizeMeta(meta, t)` — thêm chuỗi mới vào `messages/en/bot-pages.ts`.
- Widget (kể cả panel của bot như studio nội thất): dùng `useTr()` hoặc `h.tr` (ExtHelpers); khung widget có nút phóng to — panel toàn khung nên chèn `<ExpandButton />` ở header và dùng container query (`@3xl:`) cho bố cục rộng.
- Ngôn ngữ chatbot là cài đặt riêng của bot (`settings.language`), khác ngôn ngữ giao diện. Chữ do engine sinh ra nằm ở `src/domain/chat-text.ts`; chữ trong widget ở `src/components/widget/i18n.tsx`; prompt riêng của module bot hiện viết bằng tiếng Việt và được bọc bởi chỉ thị ngôn ngữ ở đầu/cuối prompt — module mới nên giữ câu trả lời cố định (tool trả số liệu/nhãn trung tính) để LLM dịch được.
