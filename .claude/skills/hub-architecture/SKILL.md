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

- Mọi bảng có `tenant_id`; mọi truy vấn lọc `tenant_id` lấy từ server (session hoặc slug), không tin client.
- **Không join chéo schema** trong application/domain. Module bot đọc bảng `public` qua port/repository dùng chung; engine dùng chung lấy dữ liệu của bot qua interface `BotModule` (`src/bots/types.ts`).
- Thêm bảng: khai báo Drizzle trong `src/infrastructure/db/schema.ts` (dùng `pgSchema("<kind>")`), thêm DDL `CREATE ... IF NOT EXISTS` vào mảng `DDL` (idempotent, chạy lúc khởi động), bật RLS.
- Id hội thoại/lead lưu dạng text; khoá ngoại logic (không FK chéo schema) để mỗi module tách thành service riêng được.

## 2. Module bot

Mỗi loại bot là một thư mục `src/bots/<kind>/` gồm:
- `meta.ts` — nội dung giới thiệu (client-safe): tên, slug, tagline, tính năng, use case, FAQ, gói giá.
- `module.ts` — server: `tools(ctx)`, `promptLines(tenant)`, `groundingFacts(tenant)`, `cards(ids)`, `extras(turn)`, `fallbackLlm`, `defaults`, `seedDemo`.
- `widget.tsx` — `WidgetExtension` (thẻ, nút nhanh, panel riêng) cắm vào `ChatWidget` chung.
- `admin/*` — trang quản trị riêng, khai báo trong `adminNav`.

Đăng ký module trong `src/bots/registry.ts` (server) và `src/bots/catalog.ts` (meta, dùng được ở client).

Chat engine (`src/application/use-cases/chat.ts`) giữ phần chung: tầng quyết định jev, chuyển nhân viên, live chat, guard chống bịa, ghi phân tích. **Không** viết logic riêng của một ngành trong engine.

## 3. Kiểm tra trước khi xong

```bash
npm run typecheck && npm test
```
Test tích hợp chạy trên PGlite với đủ các schema — thêm test cho module mới vào `src/integration.test.ts` hoặc file test của module.
