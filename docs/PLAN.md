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
| `public` | `accounts`, `tenants` (1 bot, có `kind`), `admin_users`, `conversations`, `leads` (cột `meta` jsonb cho dữ liệu riêng), `events`, `message_insights`, `llm_calls`, `services`, `bookings`, `hub_identities`, `website_domains`, `bot_licenses` | engine + use case dùng chung |
| `store` | `products` | module store |
| `tile` | `tiles`, `quotes`, `settings` (hao hụt, keo, ron, % A/B) | module tile |

Quy tắc: mọi bảng có `tenant_id`; **không FK chéo schema**; module chỉ đọc/ghi schema của mình, dữ liệu chung đi qua port; thêm bot = thêm schema + DDL idempotent. DB của bản trước tự nâng cấp (bảng `products` được `SET SCHEMA store`, tenant cũ được gán account).

### Thêm một loại bot mới (checklist)

1. `src/domain/tenant.ts`: thêm `kind` vào `BOT_KINDS`.
2. `src/bots/<kind>/`: `meta.ts` (nội dung giới thiệu), `repository.ts` + bảng trong `schema.ts` (`pgSchema("<kind>")`, DDL, RLS), `module.ts` (`BotModule`: tool, `promptLines`, `groundingFacts`, `shopSummary`, `cards`, `fallbackLlm`, `seedDemo`…).
3. Đăng ký ở `src/bots/catalog.ts` (meta) và `src/infrastructure/container.ts` (module). Widget riêng (nếu cần): `widget/extension.tsx` + `src/components/widget/extensions.ts`. Admin riêng: trang + `meta.adminNav` + route wrapper trong `src/app/admin/(panel)`.
4. Demo: `seedDemo` + seed trong `infrastructure/db/seed.ts`; test tích hợp ở `src/integration.test.ts`; thêm câu vào `scripts/eval-decision.ts`; xoá bot khỏi `src/bots/roadmap.ts`.
5. Qua đủ **cổng chất lượng bot ngách** ngay dưới đây. Thiếu mục nào thì bot chưa được lên `status: "live"` trong `meta.ts`.

### Cổng chất lượng bot ngách (bắt buộc — rút ra từ đợt 2026-11-07)

Bot nội thất và đào tạo ra đời chỉ là "AVI + vài tool tìm kiếm": trang giới thiệu dùng lại giao diện AVI, widget toàn chữ, giá trị không khác gì chatbot chung. Không được lặp lại. Mỗi bot mới phải trả lời được **"khách của shop này nhận được gì mà chatbot chung không làm được?"** bằng các mục sau:

| # | Yêu cầu | Bot gạch (chuẩn tham chiếu) | Kiểm tra |
|---|---|---|---|
| 1 | **Ngách hẹp, khách cụ thể**: tên ngành + người mua + câu hỏi tiền bạc họ hay hỏi. Không làm bot "đào tạo nói chung", "bán hàng nói chung" | showroom gạch ốp lát; "phòng 4×5 hết bao nhiêu thùng, bao nhiêu tiền?" | `meta.industries` ≤ 3 nhóm gần nhau; tagline nêu kết quả cụ thể |
| 2 | **Ít nhất một công cụ chữ ký (signature tool)** tương tác, chỉ ngành đó có, hiện trong widget chứ không chỉ là chữ | trình xem thử gạch trên ảnh phòng | `widget/extension.tsx` có `renderPanel` + `quickActions` riêng |
| 3 | **Ít nhất hai phép tính/luật nghiệp vụ tất định** ở domain (không để LLM nhẩm), có test | số thùng + hao hụt theo kiểu lát, keo, ron, ngói theo viên | `domain.ts` + `*.test.ts`; tool trả `notes` khi giả định |
| 4 | **Thẻ/kết quả riêng trong khung chat** (không chỉ thẻ sản phẩm chung) | thẻ gạch, bảng báo giá có lưu ý | `renderCards` / `renderExtras` |
| 5 | **Trang giới thiệu có phong cách riêng**: bảng màu, kiểu chữ, hero minh hoạ đúng công cụ chữ ký; không dùng lại hero/lưới thẻ của AVI | studio vật liệu xanh blueprint, serif, phối cảnh | component landing riêng trong `src/components/site/landings/`, lớp CSS gốc riêng (`.<kind>-site`) |
| 6 | **Lead mang dữ liệu ngành** để nhân viên gọi đúng việc | báo giá + ảnh phối cảnh trong lead | `leads.meta` có trường riêng của ngành |
| 7 | **Demo thật dùng được ngay** trên trang giới thiệu, dữ liệu mẫu đủ để thử công cụ chữ ký | 15 mẫu gạch + 5 phòng mẫu | thử bằng trình duyệt trước khi đánh dấu xong |
| 8 | **AI chạy trên trình duyệt nếu cần ảnh**: model giấy phép thương mại, khai báo trong `scripts/models.json` (`commercial: true`), ảnh khách không rời máy | SlimSAM, Depth-Anything | `npm run models` tải đủ; có phương án khi model chưa tải xong |

| 9 | **Hai ngôn ngữ**: mọi chuỗi giao diện đi qua `t()`; nội dung giới thiệu bot có bản en trong `messages/bots.ts`; câu mẫu/chữ widget của bot có bản en | trang giới thiệu + widget + chat thử bằng cả vi và en |

Khi không tìm được mục 1–3 cho một ngành thì **không làm bot đó** (hoặc thu hẹp ngách cho tới khi có), thay vì làm bản chung chung.

## 3. Gói việc

### API trung tâm, SSO và demo công khai — 2026-11-05

- [x] Cấu hình `.env.local`: hub `http://localhost:3000`, widget `http://localhost:3001`, client `widget-norm`.
- [x] Đăng nhập dùng chung user/session/OAuth của skill-pages; không tạo mật khẩu riêng. Phiên local cũ phải liên kết qua SSO; giữ workspace metadata để bảo toàn dữ liệu.
- [x] Thanh toán trực tiếp qua API hub: danh mục gói → tạo đơn → QR → polling; PAID còn phải kiểm tra entitlement server mới kích hoạt. Scope orders:read/orders:write, ticket gắn account + bot.
- [x] Đăng ký idempotent OAuth client và hai app/gói tháng AVI/AVI Gạch trên hub hiện tại bằng `scripts/setup-widget-norm.ts` của skill-pages.
- [x] Khôi phục widget mẫu ở từng trang, không yêu cầu đăng nhập với fixture chính chủ; đổi trang đổi bot, hỗ trợ mobile và nút đóng.
- [x] 75 test widget, 6 test hub; typecheck hai repo, lint phần hub, build production. API demo anonymous 200, token thanh toán sai 401; kiểm tra trình duyệt đặt lịch, báo giá và responsive.
- [ ] Xác minh giao dịch chuyển tiền thật sau đăng nhập SSO bằng tài khoản người dùng.


### Đợt tái thiết kế AVI — 2026-11-05

- [x] Thiết kế lại landing theo phong cách product studio, admin workspace và khu dùng thử đăng nhập email.
- [x] Đổi bot bán hàng thành **AVI**, demo đa ngành; giữ `kind=store` tương thích dữ liệu cũ.
- [x] AVI Core: danh mục sản phẩm, kiến thức, đặt lịch, CRM, handoff/live chat, phân tích, widget; bot ngành kế thừa qua composition, chỉ bổ sung nghiệp vụ riêng.
- [x] Bot gạch có toàn bộ AVI Core + catalogue gạch, báo giá m², phối cảnh, A/B; landing phong cách kiến trúc, giá cao hơn AVI.
- [x] Giá theo loại bot từ một catalogue UI; checkout lấy giá đã cấu hình và xác nhận ở hub.
- [x] Nối tài khoản email qua OAuth2 PKCE của `skill-pages`; lưu danh tính trung tâm, không tự gộp tài khoản theo email chưa xác minh.
- [x] Domain chuẩn hoá, unique tại DB, không cấp lại trial cho domain bằng email khác; xác thực sở hữu trước khi kích hoạt nhúng.
- [x] Thanh toán qua hub `skill-pages`, xác nhận entitlement từ máy chủ; không tin trạng thái trả về từ trình duyệt.
- [x] Rà soát gateway trung tâm và bổ sung hợp đồng tool calling nếu thiếu; giữ fallback khi gateway lỗi.
- [x] Kiểm thử typecheck, test, build và kiểm tra giao diện desktop/mobile; ghi cách cấu hình, migration và những phụ thuộc triển khai.

- [ ] Vận hành production: cấu hình domain/client/callback, SePay và gateway key theo môi trường triển khai; kiểm tra SSO + giao dịch thật xuyên suốt. Local đã đăng ký client/gói giá.

- [x] Lõi chat: jev → mẫu / handoff / LLM theo độ khó, guard, recap, tool đặt lịch & gọi nhân viên
- [x] Đặt lịch, handoff + live chat, phân tích nhu cầu (+ báo cáo AI), giao diện widget có xem trước, lead, CSV
- [x] **Hub đa bot**: `BotModule`, tài khoản → nhiều bot, chọn/tạo bot, giới hạn theo gói, schema DB theo bot, nâng cấp DB cũ
- [x] **Bot store** (bán hàng & đặt lịch) và **bot tile** (tư vấn & xem thử gạch: báo giá m², trình xem thử SlimSAM, A/B test) — gộp từ widget-tile-visual
- [x] **Website thương mại**: landing, danh mục chatbot, trang giới thiệu từng bot, bảng giá, đăng ký dùng thử, hết hạn dùng thử chặn widget
- [x] Skill dự án: `.claude/skills/hub-architecture`, `hub-landing-design`
- [x] 75 test (domain, jev, tích hợp PGlite, kế thừa AVI, domain/DNS, tài khoản, license, gateway)
- [x] **Adapter thanh toán & kích hoạt gói**: checkout skill-pages, kiểm tra `check-access` phía server, gắn một license theo loại với bot đang chọn. Cấu hình và giao dịch thật còn bước vận hành phía trên.
- [x] **Adapter SSO** skill-pages (OAuth2 PKCE S256), lưu subject/token mã hóa, liên kết tài khoản local có sẵn. Luồng thật cần cấu hình client/callback.
- [ ] Hạn mức tin nhắn theo gói (`messagesPerMonth`) — hiện mới là giới hạn số bot
- [x] Adapter LLM + jev gọi AI Gateway `skill-pages`, JSON tool calling và SSE tool deltas ở hub, giữ fallback khi lỗi.
- [ ] Gateway: route/model chains, usage/hạn mức tenant, 2B.3 khoá/rate limit sang Postgres/Redis (xem PLAN-LLM)
- [ ] Streaming câu trả lời (SSE); kênh Zalo OA / Messenger
- [ ] Nhắc lịch hẹn (SMS/Zalo ZNS); khách tự huỷ/đổi lịch
- [ ] Nhiều nhân viên: phân công hội thoại, thông báo trình duyệt
- [ ] Ảnh phòng gửi kèm câu hỏi cho LLM (bản cũ của bot gạch có, chưa chuyển sang engine chung)

### Đợt nội thất 3D thật · hai ngôn ngữ · khung chat phóng to — 2026-11-07

Trạng thái: **mã đã xong và qua typecheck + 180 test + `next build --webpack`; CHƯA commit** (cả widget-norm lẫn skill-pages còn nhiều thay đổi chưa commit).

Đã làm
- [x] **Nội thất — đồ thật**: 18 mô hình quét CC0 (Poly Haven) → `assets/demo-furniture/<sku>.glb` (`node scripts/fetch-demo-furniture.mjs`); seed demo nạp `<sku>-v2.glb`, thay khối hộp cũ. `next.config.ts` có `outputFileTracingIncludes` cho thư mục này.
- [x] **Xoay tự do**: tem 3D ở góc bất kỳ, camera trực giao cùng độ chúi với ảnh (`vision/modelSprite.ts`); vòng xoay + nút tròn kéo trên ảnh (hít 0/90/180/270°), thanh trượt, +90°; footprint/bóng/chồng lấn theo hình chữ nhật xoay (`placement.ts`: `yawDeg`, `footCorners`, `angleToward`, `Placed.angle`). Phòng 3D (R3F) dùng cùng góc xoay.
- [x] **Ảnh thẻ chat/danh mục** dựng từ chính GLB (`widget/ItemImage.tsx`).
- [x] **Đồng bộ màu 3D theo catalogue** (`vision/tint.ts`, `design.ts: colorTint`): chỉ nhuộm vật liệu chiếm diện tích lớn nhất, giữ chi tiết vân/nếp của texture; món nhiều màu ("trắng - đen") hoặc màu lạ giữ màu gốc. Đã kiểm tra trên trình duyệt (sofa "xám ghi" ra màu xám, còn đường chỉ).
- [x] **Khung chat phóng to**: nút ⤢ (header + header studio/thử gạch) → `widget.js` đổi cỡ iframe qua `postMessage wn:expand` (≤ 1180 px), nhớ trong phiên, tự phóng to khi mở panel toàn khung rồi trả lại; studio ≥ 768 px chia 2 cột (container query `@3xl`). Ẩn trên điện thoại (đã full màn hình).
- [x] **Ngôn ngữ tập trung**: `lib/i18n/languages.ts` (đăng ký duy nhất) + `messages/<mã>/`, `widget/<mã>.ts`, `domain/chat-packs/<mã>.ts`; fallback ngôn ngữ → en → câu gốc; trang `/admin/languages` (mức dịch, tải JSON câu thiếu, đổi ngôn ngữ từng chatbot); test `lib/i18n/i18n.test.ts`.
- [x] **Dịch**: website, admin (phần lớn), trang giới thiệu 4 bot (`localizeMeta`), landing, widget chat + studio nội thất + thử gạch + IELTS, form admin Nội thất/Gạch/Khoá học, nhãn trạng thái.
- [x] **Admin đồng bộ website** (tối, tím thương hiệu, chung ThemeProvider) — xem nhật ký.

Việc tiếp theo (theo thứ tự nên làm)
- [ ] **Commit** (chia 3–4 commit: i18n · admin/theme · nội thất 3D · khung chat) và quyết định cách giữ `assets/demo-furniture` (~26 MB: commit thẳng, Git LFS hay chỉ để script tải lúc cài).
- [ ] **Kiểm thử dev server**: sau khi chạy `next build`, `next dev` mới khởi động lại từng bị vòng lặp gọi `/config` liên tục (widget kẹt "Đang kết nối trợ lý"); production (`next start`) chạy đúng. Chưa rõ nguyên nhân (nghi HMR/websocket) — đừng chạy build khi dev đang mở, xoá `.next` nếu gặp lại; cần điều tra nếu còn.
- [ ] **R2**: token hiện chỉ đọc (ghi trả Access Denied) → cấp Object Read & Write rồi chạy lại `npm run db:seed` để đẩy ảnh/mô hình demo lên R2; xác minh CORS cho `.glb` khi nhúng trên web khác.
- [ ] **Studio**: thay 3 phòng mẫu vẽ tay bằng ảnh phòng thật (kèm 4 góc sàn); khớp ánh sáng tem 3D với ảnh phòng; món nhiều vật liệu (mây + nệm) cho chọn vật liệu nhuộm; bố cục 2 cột cho Visualizer thử gạch khi phóng to.
- [ ] **3D từ ảnh thật (TRELLIS)**: dựng worker GPU thật theo `scripts/trellis-worker/README.md` (hiện mới có mock); chốt chi phí/giới hạn theo gói.
- [ ] **Dịch còn thiếu**: ngày giờ admin (`fmtDateTime/fmtDay` đang cố định vi-VN); câu lý do/lưu ý do server sinh ở `furniture/design.ts` (gợi ý trọn bộ); tên 3 phòng mẫu; chuỗi động của Visualizer ("AI đang tìm {noun}…") và IELTS widget; trang admin chi tiết hội thoại/phân tích còn vài nhãn; prompt riêng của module bot vẫn viết tiếng Việt (đã bọc chỉ thị ngôn ngữ — cần thử thật bằng bot en cho từng ngành).
- [ ] **Ngôn ngữ thứ ba**: thử thêm một ngôn ngữ (vd `ja`) theo hướng dẫn trong `languages.ts` để kiểm chứng quy trình và test `i18n.test.ts`.
- [ ] **Hạn mức/vận hành** còn mở từ trước: hạn mức tin nhắn theo gói, SSO + giao dịch thật trên production, streaming, Zalo/Messenger (xem các mục ở trên).
- [ ] Hỏi lại: yêu cầu ban đầu nhắc "2 repo" nhưng chỉ ghi `lumen-saas-landing-page-template` — nếu còn repo tham khảo thứ hai thì bổ sung.

Quy ước kiểm thử/làm việc rút ra
- Dev server giữ module cũ sau khi sửa nhiều file → SSR lệch client ("Hydration failed"): khởi động lại trước khi kết luận lỗi.
- Heredoc bash làm mất dấu `\` trong regex → viết script bằng công cụ Write; không nhét `t()` vào hằng số cấp module (dịch ở chỗ hiển thị).

## 4. Quyết định cần lưu ý

- Tên thương hiệu nền tảng đặt ở `src/lib/site.ts` (hiện "Widget Norm") — đổi một chỗ.
- Giá công bố theo bot nằm ở `src/domain/bot-pricing.ts`: AVI 199.000đ/tháng, AVI Gạch 499.000đ/tháng. Checkout và quyền trả phí do skill-pages xác nhận; cần đồng bộ gói giá hub trước khi mở bán.
- Số "cửa hàng đang dùng" trên landing chỉ đếm bot thật (loại trừ bot demo).
- `OPENROUTER_DATA_COLLECTION=deny` là mặc định; `.env.local` dev đang `allow` để jev-router chọn được mọi nhà cung cấp — đổi trước khi có dữ liệu khách thật.

## 5. Lộ trình chatbot tương lai

Phân tích thị trường/giá và thứ tự ưu tiên bot ngách (gồm AVI Thời trang): **[PLAN-NICHE-BOTS.md](PLAN-NICHE-BOTS.md)**. Chi tiết (schema dự kiến, phần dùng lại) ở `src/bots/roadmap.ts` — landing hiển thị mục "Sắp ra mắt" từ đó.

| Bot | Nghiệp vụ riêng → schema | Dùng lại từ lõi |
|---|---|---|
| Đặt bàn & thực đơn nhà hàng | `menu_items`, `tables`, `reservations` | jev, live chat, đặt lịch (khung giờ), phân tích |
| Tư vấn bất động sản | `listings`, `viewings`, `loan_scenarios` | jev, đặt lịch xem nhà, chuyển nhân viên |
| Đặt khám phòng khám | `doctors`, `specialties`, `visits` | jev, đặt lịch theo tài nguyên (bác sĩ) |
| Chăm sóc sau bán & bảo hành | `warranties`, `tickets`, `kb_articles` | jev, live chat, chuyển nhân viên |

Việc nền tảng cần làm trước khi nhân rộng bot: đặt lịch **theo tài nguyên** (bác sĩ/bàn/phòng, hiện chỉ có sức chứa chung), hạn mức tin nhắn theo gói, và nhập/đồng bộ danh mục từ Haravan/Sapo/Shopify.

## 6. Nhật ký (mới nhất ở trên)

- 2026-11-07 — **Nội thất: đồ thật xoay tự do · khung chat phóng to · quản lý ngôn ngữ tập trung.** (1) *Đồ thật thay khối hộp*: demo nội thất dùng mô hình quét 3D thật (CC0, Poly Haven) tải bằng `node scripts/fetch-demo-furniture.mjs` vào `assets/demo-furniture/<sku>.glb` (seed tự nạp, thay bản khối hộp cũ bằng `<sku>-v2.glb`). Studio dựng GLB thành "tem" PNG ở **góc xoay bất kỳ** bằng camera trực giao với độ chúi suy từ sàn trên ảnh (`vision/modelSprite.ts`) rồi dán lên ảnh phòng; chọn món hiện **vòng xoay + nút tròn kéo trực tiếp** (hít 0/90/180/270°), kèm thanh trượt; footprint/bóng/phát hiện chồng lấn theo hình chữ nhật xoay thật (`placement.ts: yawDeg, footCorners, angleToward`). Thẻ chat và danh mục hiện ảnh dựng từ chính GLB. Món chỉ có ảnh phẳng không xoay thật được → studio nói rõ và gợi ý thêm .glb / dựng 3D từ ảnh (TRELLIS). (2) *Phóng to khung chat*: nút ⤢ ở header → widget.js đổi cỡ iframe qua postMessage `wn:expand` (tối đa 1180 px, nhớ trong phiên); tự phóng to khi mở studio nội thất / thử gạch rồi trả lại; studio ≥ 768 px chia hai cột (ảnh | điều khiển). (2b) *Đồng bộ màu 3D*: nhuộm vật liệu chính của GLB theo màu catalogue (`vision/tint.ts`) mà giữ vân/nếp. (3) *Ngôn ngữ tập trung*: `lib/i18n/languages.ts` là đăng ký duy nhất (mã, tên, ui/chat); từ điển giao diện `messages/<mã>/`, widget `widget/<mã>.ts`, câu chữ chatbot `domain/chat-packs/<mã>.ts` (TypeScript báo thiếu trường); fallback ngôn ngữ → tiếng Anh → câu gốc; trang **/admin/languages** hiển thị mức dịch, tải JSON câu chưa dịch, đổi ngôn ngữ từng chatbot. Dịch thêm: trang giới thiệu 4 bot (`localizeMeta`), widget gạch/nội thất/IELTS, form admin Khoá học/Nội thất/Gạch, nhãn trạng thái. **Chưa**: ngày giờ admin vẫn định dạng vi-VN; câu lý do/lưu ý do server sinh trong gợi ý trọn bộ nội thất (design.ts) còn tiếng Việt.

- 2026-11-07 (bổ sung) — Hoàn thiện hai ngôn ngữ: `<title>`/mô tả trang theo ngôn ngữ (`generateMetadata` ở root layout), nhãn nguồn lead dịch ở chỗ hiển thị, sửa tương phản trang đăng ký ở chế độ tối. Lưu ý khi kiểm thử: dev server giữ module cũ sau khi sửa nhiều file → SSR lệch client ("Hydration failed"); khởi động lại dev server trước khi kết luận là lỗi mã. Đã chạy `typecheck`, 170 test và `next build --webpack` đều qua.

- 2026-11-07 — **Hai ngôn ngữ (vi/en) + đồng bộ giao diện admin.** (1) *Giao diện website + admin*: `src/lib/i18n` — cookie `locale` (cùng tên với hub), `t("câu tiếng Việt gốc")` tra `messages/*.ts` (khoá = câu tiếng Việt, thiếu bản Anh thì hiện câu gốc), `getT()` cho server component, `useT()` cho client, nút VI | EN ở header website, topbar admin, đăng nhập, danh sách chatbot. Đã dịch: header/footer/trang chủ/bảng giá/đăng ký/danh mục chatbot, khung admin + điều hướng, tổng quan, cài đặt, khách tiềm năng, lịch hẹn, hội thoại, phân tích, sản phẩm, thanh toán, thử chatbot, chỉnh giao diện widget, biểu mẫu sản phẩm/dịch vụ/gạch. (2) *Ngôn ngữ chatbot*: `TenantSettings.language` ('vi'|'en', mặc định vi, bot cũ không vỡ) chọn ở Cài đặt (và khi tạo bot); quyết định prompt hệ thống (bản tiếng Anh đầy đủ + chỉ thị ở đầu/cuối), câu mẫu, câu chuyển nhân viên, tóm tắt, giờ mở cửa, nhận diện "chưa giải quyết", chữ trong widget (`components/widget/i18n.tsx`), lời chào + nút gợi ý + tên/phụ đề/nhãn nút khi tick "đặt lại theo ngôn ngữ". Đã thử thật: bot tiếng Anh trả lời tiếng Anh cả khi khách hỏi tiếng Việt. (3) *Admin đồng bộ với website*: website đã là tối kiểu Lumen còn admin sáng → admin dùng chung `ThemeProvider` (khoá `wn_theme`, mặc định tối) với token màu tối `[data-admin]` trong globals.css, màu nhấn = tím thương hiệu (`--accent` = brand-600) cho nút chính/tab/mục đang chọn, bỏ các nút đen cứng, sửa biến CSS không tồn tại (`--primary`). **Chưa dịch**: trang giới thiệu từng bot (`/bots/<slug>`: landing + FAQ), phần mở rộng widget của bot gạch/nội thất/IELTS (trình xem thử, studio, test), trang admin Khoá học/Nội thất/Hội thoại chi tiết một phần, nhãn trạng thái domain (`LEAD_LABELS`…), định dạng ngày vẫn kiểu Việt ở một số bảng. Thêm bản dịch: thêm cặp vi→en vào `src/lib/i18n/messages/*.ts`, bọc chuỗi bằng `t()`.

- 2026-11-07 — **Nội thất 3D (P1–P4 trong [PLAN-FURNITURE-3D.md](PLAN-FURNITURE-3D.md))** và **sửa SSO**. Nội thất: tách nền ảnh sản phẩm bằng SlimSAM trong admin, tải .glb có kiểm tra, phòng 3D (three/react-three-fiber) + model-viewer/AR, tìm món giống ảnh (CLIP), món đi kèm/bộ sưu tập, tạo 3D nháp qua máy chủ TRELLIS riêng có bước duyệt; 18 món demo có 3D mẫu. **SSO:** (1) trang xin quyền của hub (`skill-pages`) đặt CSP `form-action 'self'` nên Chrome chặn bước chuyển về widget sau khi bấm "Đồng ý" → thêm origin của `redirect_uri` vào CSP; (2) widget cố định `redirect_uri` theo `PUBLIC_BASE_URL` (3001), chạy cổng khác thì lệch → dev lấy theo địa chỉ đang mở (hub đã chấp nhận mọi cổng loopback). Đã kiểm token + userinfo + callback bằng mã thật; chưa đăng nhập Google được trong trình duyệt tự động. **R2:** khoá hiện tại bị `Access Denied` khi ghi (file tự rơi về đĩa) — cần cấp quyền Object Read & Write cho token. 162 test + typecheck + build đạt.

- 2026-11-07 — **Đồng bộ hóa giao diện toàn site, hệ thống Sáng / Tối (Dark & Light Mode) và hoàn thiện 4 landing bot chuyên ngành có "chất riêng"**:
  - **Khắc phục triệt để lỗi mất tương phản (chữ trắng trên nền trắng)**: do layout cũ áp cứng `text-[#f4f5f7]` toàn cục khiến các trang con (`/bots/avi`, `/pricing`) bị kế thừa chữ trắng trên card trắng.
  - **Hệ thống Theme Sáng / Tối toàn diện**:
    - Thiết lập `@custom-variant dark (&:where(.dark, .dark *));` chuẩn Tailwind CSS v4.
    - Xây dựng `ThemeProvider` + `ThemeToggle` (nút bấm Sun/Moon mượt mà trên header desktop & mobile menu), lưu trạng thái vào `localStorage`.
    - Thêm inline script anti-FOUC trong `<head>` tại `RootLayout` loại bỏ hiện tượng nhấp nháy giao diện khi tải lại trang.
    - Cập nhật `SiteHeader`, `SiteFooter`, `Logo`, `Sections` tự động chuyển đổi màu sắc hài hòa theo chế độ.
  - **Cải thiện và tách bạch 4 Landing Page chuyên ngành (`src/components/site/landings/`) mang đậm bản sắc riêng**:
    - **AVI Bán hàng (`AviLanding.tsx`)**: Phong cách Retail Boutique hiện đại (Lavender/Violet), wordmark `avi.`, thẻ orbit tra cứu giỏ hàng và đặt lịch hẹn 1 chạm, 6 thẻ bento bán lẻ, quy trình nhúng 3 bước.
    - **AVI Gạch (`TileLanding.tsx`)**: Phong cách Architectural & Material Studio (Slate-blue `#15476d`, Noto Serif), trình phối cảnh `MaterialRoom` chọn vân đá/gỗ/xi măng, bảng tính dự toán vật tư tức thì (m², bù hao hụt thi công, số thùng gạch, keo dán & keo chà ron).
    - **AVI IELTS (`IeltsLanding.tsx`)**: Phong cách Sổ luyện thi học thuật (Teal & Emerald `#0f766e`, Crimson), phiếu trắc nghiệm 15 câu xếp lớp ngay trong chat, trục thời gian lộ trình band điểm, hỗ trợ tương phản cao cả Sáng và Tối.
    - **AVI Nội thất (`FurnitureLanding.tsx`)**: Phong cách Studio gỗ ấm (Timber & Warm Amber `#9a5b2e`), mô phỏng căn phòng kê đồ vector theo tỷ lệ thực, kiểm tra khoảng thông thủy 80cm, AI nhận diện phong cách Japandi và tỷ lệ chiếm sàn 19%.
  - **Nâng cấp Bảng giá (`/pricing`) và Trang chủ (`/`)**: card và thông số hiển thị sắc nét, tương phản đạt chuẩn WCAG (≥ 4.5:1) ở cả chế độ Sáng và Tối.
  - Kiểm thử 151 test vitest + typecheck đạt 100%.

- 2026-11-07 — **Nâng cấp toàn diện Landing Page theo chuẩn Dark Obsidian Cinematic AI (tham khảo `Lumen` & `SaaS-AI`)**:
  - Chuyển đổi toàn bộ trải nghiệm trang chủ sang phong cách **Dark Obsidian AI** (`#07080b` / `#0d1017`) sang trọng, loại bỏ hoàn toàn cảm giác nhạt nhòa, đơn điệu của giao diện cũ.
  - Tích hợp các tinh hoa thiết kế từ **Lumen** (`E:\Sources\Webs\lumen-saas-landing-page-template`) và **SaaS-AI** (`E:\Sources\Webs\SaaS-AI`):
    - **Hero Display & Live Telemetry Strip**: Tiêu đề gradient ấn tượng (`#c490ff` → `#ff6a2b`), dải thông số kỹ thuật live glass 4 cột (`Latency p50 < 0.78s`, `0% Bịa đặt Jev`, `99.99% Uptime`, `1 Dòng mã nhúng`).
    - **Console Mockup Stage (`ConsoleMockup.tsx`)**: Mô phỏng trung tâm điều khiển AI trực tiếp với 4 KPI, dòng tin nhắn hội thoại thật từ khách hàng và 2 thẻ thông báo nổi (floating notification pills).
    - **Bento Grid of Live Mini UIs (`LumenBento.tsx`)**: 6 khối bento công nghệ với biểu đồ p50 latency sparkline động, vòng đo độ chính xác Jev 99.9%, sơ đồ router phân luồng gói tin có animation, terminal nhúng code, thanh cân bằng tải autoscale và thước đo tỷ lệ chuyển đổi lead.
    - **Platform Logo Marquee (`LogoMarquee.tsx`)**: Dải logo đối tác (WordPress, Haravan, Sapo, Shopify, LadiPage, React/Next.js) chuyển động vô tận với viền mờ mask-gradient.
    - **Stats Watermark & Stacking Steps**: Khối số đo lớn với watermark nền `99.9%` và 3 thẻ quy trình triển khai chuẩn mực.
    - **Dark Glass Pricing & Testimonials**: Bộ chuyển đổi Tháng / Năm và đánh giá khách hàng thực tế trong giao diện kính tối viền hairline sáng.
    - **Header & Footer thích ứng**: Tự động chuyển đổi dark glass khi ở trang chủ, đồng bộ nhận diện thương hiệu.
  - 151 test + typecheck đều đạt 100%.

- 2026-11-07 — **Tái thiết kế UI Landing Page (học hỏi từ template Desgy)**:
  - Khắc phục UI cũ đơn điệu, gượng gạo: gỡ bỏ góc xoay 3D `rotateY(-4deg)` làm méo chữ trong Hero Preview, thay bằng giao diện Workspace kính mờ sang trọng kèm tab chuyển nhanh 4 bot (AVI Bán lẻ, AVI Gạch, Luyện thi IELTS, Nội thất) và chỉ số phản hồi < 0.8s.
  - Học hỏi các thế mạnh từ template Desgy (`E:\Sources\Webs\desgy-nextjs-tailwind-landing-page-template-free`):
    - **Platform Integration Strip**: nâng cấp dải tích hợp nền tảng (WordPress, Haravan, Sapo, Shopify, LadiPage, Website riêng) dạng thẻ pill công nghệ, cam kết 1 dòng mã nhúng < 2 phút.
    - **Showcase 4 Chatbot Chuyên ngành**: hiển thị trọn vẹn cả 4 bot với thẻ minh họa công cụ chữ ký (tính m² gạch, test xếp lớp IELTS, đo kích thước sofa vừa phòng, tra cứu kho hàng AVI).
    - **Two-Tone Value Section**: cặp khối đối xứng tương phản cao (khối Iris Jev Engine chống ảo giác đối xứng với khối Emerald công cụ tính toán chữ ký theo ngành).
    - **Interactive Pricing Switcher (`HomePricing.tsx`)**: bộ chuyển đổi Tháng / Năm (tiết kiệm 20% + tặng 2 tháng) tích hợp ngay tại trang chủ với đầy đủ bảng giá và danh sách tính năng.
    - **Quy trình 3 bước Onboarding**: thẻ số lớn watermark `01, 02, 03` mạch lạc, dễ hiểu.
    - **Customer Testimonials (`Testimonials.tsx`)**: trích dẫn thực tế từ 3 khách hàng thật ở 3 ngành (Showroom gạch, Shop thời trang, Trung tâm ngoại ngữ).
  - 151 test + typecheck đều đạt 100%.

- 2026-11-07 — **Bot nội thất và bot đào tạo qua "cổng chất lượng bot ngách"** (quy tắc mới ở mục 2; ghi cả vào skill `hub-architecture` và `hub-landing-design`).
  - **AVI Nội thất → "Thiết kế từ ảnh phòng"**: studio trong widget (`src/bots/furniture/widget/Studio.tsx`). Khách chụp ảnh hoặc chọn 3 phòng mẫu; trên trình duyệt chạy CLIP ViT-B/32 (loại phòng + 7 phong cách, vector nhãn tính sẵn bằng `scripts/build-clip-labels.ts`), DETR ResNet-50 (đồ đã có), SlimSAM (vùng sàn, dùng lại của bot gạch), k-means bảng màu. Kê đồ đúng tỉ lệ qua homography 4 góc sàn, kéo thả, xoay 90°, viền đỏ khi ra ngoài/chồng nhau; gửi lead kèm ảnh phương án. Domain `design.ts`: bộ món theo phòng, chia ngân sách (món bắt buộc trước, giữ chỗ tiền cho món bắt buộc sau), phong cách ×3 > màu ảnh ×1, ≤ 40% sàn, khoảng thông thuỷ; tool `design_room`; 8 mẫu demo mới; hình minh hoạ SVG đúng tỉ lệ cho món chưa có ảnh. Model mới khai báo trong `scripts/models.json` (MIT, Apache-2.0).
  - **AVI Đào tạo → AVI IELTS** (slug `luyen-thi-ielts`, slug cũ tự chuyển): test xếp lớp 15 câu A1–C1 chấm ở server (đáp án không xuống trình duyệt, chống đoán cùng một chữ cái), lộ trình `planPathway` ghép khoá thật theo band từ lớp đang tuyển, ngày xong, kịp ngày thi không; tool `plan_pathway`, `offer_placement_test`; lead kèm band/CEFR/mục tiêu/lộ trình. Demo thêm IELTS 4.5→5.5 và 6.5→7.5, ngừng bán khoá tiếng Nhật/tin học.
  - **Trang giới thiệu riêng**: `src/components/site/landings/FurnitureLanding.tsx` (studio gỗ ấm, hero kê đồ có số đo) và `IeltsLanding.tsx` (sổ luyện thi, phiếu test + lộ trình). Sửa font serif: Georgia thiếu dấu tiếng Việt chồng ("mấy" vỡ) → Noto Serif/Cambria/Times, áp cả `font-serif` toàn site.
  - Sửa lỗi phát sinh: `events.value` là số nguyên (lưu band × 10); ảnh đồ tải xong vẽ lại bằng closure cũ. 151 test + typecheck đạt; đã chạy thật: chat LLM cho `design_room`/`plan_pathway`, studio với phòng mẫu và ảnh tải lên (CLIP + SAM), test 15 câu → band + lộ trình, hai trang giới thiệu ở 1400px và 375px.
  - **Còn thiếu**: đồ kê chưa bị che bởi đồ có sẵn trong ảnh (chưa dùng depth/occlusion); DETR chỉ nhận đồ trong nhãn COCO; chưa đo thời gian tải model trên điện thoại thật (~130 MB lần đầu); admin chưa có ô nhập band riêng (đang đọc từ chuỗi "4.5 → 5.5").

- 2026-11-07 — **Bot gạch: thêm sân vườn, ngói lợp mái, lát chéo** (port commit `7ef5e73` của widget-tile-visual: Visualizer nhiều lớp + 5 phòng mẫu + `vision/scenes.ts`, autoRegion theo bề mặt, renderer ngói/men bóng) và **tính chính xác hơn**: ngói báo theo viên (không keo/ron, ghi chú ngói nóc/rìa); `calculate_quote` nhận kích thước (dài × rộng, ốp tường × cao trừ cửa, mái mặt bằng + độ dốc) và tự tính, LLM không phải nhân; hao hụt cộng thêm cho viên khổ lớn trên diện tích nhỏ (+3%) và phòng < 5 m² (+2%); cảnh báo xương cá với viên vuông, gạch bóng ngoài trời, mẫu sai công dụng; bot luật đọc "4m x 5m", "dài 4 rộng 5", "2x1,5x2,7", "dốc 30 độ", "trừ cửa 2m2". 5 mẫu demo mới tự bổ sung vào `gach-dep-demo`. **Sửa lỗi chat:** tài khoản demo gói Pro (3 bot) vượt giới hạn khi seed bot đào tạo/nội thất → `PLAN_LIMIT` ở mọi request; demo chuyển gói `business`, lỗi seed bổ sung không còn làm hỏng container. 121 test + typecheck đạt; đã thử chat thật (ngói, ốp tường phòng tắm, sân vườn) và báo giá mái trong widget.

- 2026-11-06 — **Bot thứ 4: AVI Nội thất** (`kind=furniture`, schema `furniture.items`): tìm theo phòng/phong cách/ngân sách/khoảng trống, `check_fit` (vừa phòng, xoay 90°, lối đi, chiều cao), `calculate_order` (tạm tính combo + cảnh báo tồn), đặt lịch khảo sát; admin Nội thất; demo `noi-that-demo`; giá 449k/849k, app hub `HUB_APP_FURNITURE`. Model ONNX (SlimSAM, Depth-Anything-V2, SegFormer) đã đủ trong `public/models`. **Đã làm 2026-11-07:** kê thử nội thất vào ảnh phòng (xem dòng trên). 102 test + typecheck đạt.

- 2026-11-06 — **Bot thứ 3: AVI Đào tạo** (`kind=education`, schema `education.courses`): tìm khoá, lịch khai giảng/chỗ còn, tính học phí (ưu đãi sớm/nhóm không cộng dồn, trả góp), học thử qua đặt lịch chung; admin Khoá học; demo `trung-tam-demo`; giá 399k/799k, app hub `HUB_APP_EDU` (slug `avi-edu`, cần đăng ký trên hub). 92 test, typecheck đạt; chưa chạy UI/chat thật (dev server cần khởi động lại để nạp module + seed demo).

- 2026-11-06 — Sửa DDL `llm_calls` (thiếu 6 cột `decision_*`/`route` trên DB cũ → ghi chi phí AI lỗi âm thầm), đã migrate DB dev; 83 test đạt.

- 2026-11-06 — **AVI Báo giá theo công thức** (làm trước thay vì bot mới, vì dùng chung cho mọi ngách): cột `store.products.pricing` + 4 mô hình (m², độ phủ, mét dài, số lượng bậc giá) + phụ phí; tool `calculate_estimate` (số tiền do code tính, qua guard); form admin "Công thức báo giá"; 4 sản phẩm demo (sơn, sàn gỗ, rèm, đồng phục). Bot gạch kế thừa qua composeWithAvi. 83 test, typecheck đạt; chưa kiểm tra giao diện admin trên trình duyệt. Ngách vật liệu/đồng phục sau này chỉ còn là preset + landing.

- 2026-11-06 — Phân tích & kế hoạch AVI Thời trang và lộ trình bot ngách ([PLAN-NICHE-BOTS.md](PLAN-NICHE-BOTS.md)): thị trường, đối thủ, giá theo chi phí AI/hội thoại, schema `fashion`, chấm điểm 11 ngách. Phát hiện `llm_calls` trên DB Postgres thiếu 6 cột `decision_*`/`route` (DDL thiếu ADD COLUMN) — chưa sửa.

- 2026-11-06 — Nâng cấp DDL tương thích Postgres Supabase (gỡ NOT NULL các cột variant/source/meta/won_value/history_provider), hoàn tất nạp dữ liệu mẫu ban đầu (2 bot demo avi-demo & gach-dep-demo, 6 sản phẩm, 10 mẫu gạch, 231 leads, 134 bookings, >13.000 events) và đồng bộ ảnh mẫu lên hệ thống lưu trữ R2/storage.
- 2026-11-06 — Hỗ trợ môi trường Serverless (Vercel): PGlite tự động dùng /tmp/pglite hoặc in-memory khi không có DATABASE_URL (tránh lỗi mkdir ./data), LocalFileStorage dùng /tmp/storage, thêm fallback bí mật cho AUTH_SECRET.

- 2026-11-05 — Nối API hub local cổng 3000, dùng user/session SSO chung, bỏ form mật khẩu khi bật hub và chặn local login/create-bot bypass; đăng ký OAuth client/callback/scopes và hai app/gói giá trên hub. Thay checkout chuyển trang bằng API tạo đơn/QR/polling, scope Bearer, entitlement và ticket account/bot. Khôi phục demo widget công khai theo trang; xác nhận đặt lịch AVI và báo giá gạch 20m² hoạt động. 75 test widget + 6 test hub, typecheck, lint hub, build đạt; chưa thực hiện chuyển tiền thật.

- 2026-11-05 — Tái thiết kế landing, hai phong cách riêng AVI/AVI Gạch, đăng nhập và workspace/admin playground; tải skill frontend-design. Tách composition AVI để bot gạch dùng lại catalogue/grounding/cards và toàn bộ tiện ích engine. Nâng fixture Lumi thành AVI đa ngành (không đổi tenant khách). Thêm SSO PKCE, token mã hóa, domain unique + DNS TXT, license theo bot và thanh toán qua hub. Sửa skill-pages hỗ trợ tool calling JSON/SSE, OpenRouter; LLM + jev qua gateway. Qua 68 test widget + 2 test hub, typecheck hai repo, lint phần hub, build Webpack và kiểm tra desktop/mobile. Cấu hình hub thực tế và kiểm thử giao dịch/SSO thật còn chờ thông tin triển khai; xem AVI-REDESIGN.md.

- 2026-11-05 — Chuyển thành web tập trung nhiều chatbot: DB multi-schema (public/store/tile), `BotModule`, gộp widget-tile-visual thành bot `tile`, tài khoản + gói + đăng ký, landing/trang bot/bảng giá theo skill-pages, đưa PLAN-LLM vào docs. Chạy thật: cả 2 bot qua jev + LLM, upgrade DB cũ, đăng ký, chuyển bot, A/B.
- 2026-11-05 — Khởi tạo Widget Norm từ kiến trúc widget-tile-visual: lõi chat + jev, đặt lịch, handoff/live chat, giao diện widget, phân tích nhu cầu.

## 7. Bàn giao

- Dữ liệu demo ở `./data/pglite` (xoá để seed lại: tài khoản `admin@demo.vn`/`demo1234` có 2 bot `avi-demo`, `gach-dep-demo`).
- Model ONNX của trình xem thử gạch (~120 MB) không nằm trong git: `npm run models`.
- Ảnh vân gạch/ảnh phối cảnh lưu `./storage` hoặc Cloudflare R2 (biến `R2_*`, xem `.env.example`).
