# Widget Norm — Hướng dẫn phát triển (cho người và AI agent)

> Tài liệu này đủ để một người (hoặc một AI agent) mới vào dự án hiểu **mục tiêu, kiến trúc, mô hình AI/3D, cách cài đặt, cách kiểm thử và cách mở rộng** mà không cần hỏi lại.
> Cập nhật lần cuối: 2026-11-07. Khi đổi kiến trúc/quy trình, **sửa file này cùng lúc**.

## 0. Đọc theo thứ tự nào

| Bạn cần | Đọc |
|---|---|
| Hiểu nhanh dự án | Mục 1–2 của file này |
| Chạy được trên máy | Mục 3 |
| Biết model AI / 3D nào, tải ở đâu, dùng làm gì | Mục 4 |
| Hiểu cấu trúc mã | Mục 5, rồi `.claude/skills/hub-architecture/SKILL.md` |
| Làm việc với nội thất 3D | Mục 6, rồi `docs/PLAN-FURNITURE-3D.md` |
| Làm việc với ngôn ngữ vi/en | Mục 7 |
| Biết việc gì còn dở | `docs/PLAN.md` mục 3 ("Việc tiếp theo") và mục 6 (nhật ký) |
| Thêm bot ngách mới | Mục 10.1 + `docs/PLAN.md` mục 2 (cổng chất lượng) + `docs/PLAN-NICHE-BOTS.md` |
| Kế hoạch LLM/jev | `docs/PLAN-LLM.md` |
| Làm việc như một AI agent | **Mục 12** (bắt buộc) |

Các tài liệu khác: `README.md` (tổng quan, chạy thử), `AGENTS.md` (chỉ dẫn cho agent — có cảnh báo về Next.js phiên bản mới), `docs/AVI-REDESIGN.md` (SSO + thanh toán qua hub), `.claude/skills/*` (quy tắc kiến trúc và thiết kế marketing).

---

## 1. Dự án là gì, để làm gì

**Widget Norm** là web SaaS tập trung các **chatbot AI cho cửa hàng Việt**. Khách hàng (chủ shop) vào website, chọn đúng chatbot cho ngành của mình, đăng ký dùng thử 14 ngày, dán **một dòng mã** vào website của họ. Một tài khoản tạo được nhiều chatbot (giới hạn theo gói). Thương mại hoá bằng gói tháng theo loại bot (thanh toán qua hub `skill-pages`).

### Các chatbot hiện có (mỗi cái là một "ngách")

| Bot | `kind` | Ngách | Công cụ chữ ký (làm bot khác chatbot thường) |
|---|---|---|---|
| **AVI** | `store` | Bán lẻ đa ngành (thời trang, gia dụng, quà tặng, dịch vụ) | Tư vấn theo danh mục thật, đặt lịch, chuyển nhân viên — là **lõi** mọi bot khác kế thừa |
| **AVI Gạch** | `tile` | Showroom gạch ốp lát | Ướm gạch lên ảnh phòng (SlimSAM chạy trên trình duyệt), báo giá m² (hao hụt, keo, ron), A/B test |
| **AVI Nội thất** | `furniture` | Showroom nội thất | Studio kê thử đồ **thật (3D/ảnh tách nền) đúng kích thước** lên ảnh phòng khách, xoay tự do; gợi ý trọn bộ theo phong cách/ngân sách; kiểm tra đặt vừa; tìm theo ảnh; tạo 3D từ ảnh |
| **AVI IELTS** | `education` | Trung tâm luyện thi IELTS | Test xếp lớp 15 câu chấm ở máy chủ, lộ trình tới band mục tiêu từ các khoá thật, học phí/ưu đãi tính bằng hệ thống |

### Nguyên tắc sản phẩm (không được phá vỡ)

1. **Mỗi bot một ngách hẹp, có công cụ chữ ký và thiết kế riêng** — không làm bot "chung chung". Quy tắc chi tiết: "Cổng chất lượng bot ngách" trong `docs/PLAN.md` mục 2. (Lịch sử: bot "đào tạo" cũ bị loại vì quá chung chung → thay bằng IELTS.)
2. **Chống bịa**: số tiền, mã sản phẩm, ngày, giá… luôn do **hệ thống tính** (tool/domain thuần, có test); LLM chỉ diễn đạt. Bộ `guard` đối chiếu câu trả lời với dữ liệu thật, sai thì sửa một lần rồi trả lời an toàn.
3. **Không có dữ liệu thì nói không biết và chuyển nhân viên**, không đoán.
4. **Ảnh của khách xử lý trên máy khách** (WebGPU/WASM). Chỉ gửi lên server khi khách chủ động gửi cho shop.
5. **Không có API key vẫn chạy được**: bot chuyển sang chế độ luật (rules), mọi chức năng vẫn dùng.
6. **Hai ngôn ngữ vi/en** cho giao diện và cho chatbot, thiết kế để thêm ngôn ngữ khác (mục 7).
7. **Giấy phép model**: chỉ dùng model cho phép thương mại (`scripts/models.json` có cờ `commercial`). Không dùng YOLO (AGPL).

### Đối tượng người dùng
- **Chủ shop / nhân viên**: vào `/admin` quản lý danh mục, lead, lịch hẹn, hội thoại, giao diện widget.
- **Khách của shop**: chat trong widget trên website shop.
- **Nhà phát triển**: bạn.

---

## 2. Bức tranh tổng thể

```
Website của shop ──(1 dòng <script src=/widget.js data-tenant=slug>)──► widget.js (nút chat + iframe)
        │                                                                     │
        │                                         /embed/<slug>?vid=&origin=  ▼
        │                                          ChatWidget (React, client)
        │                                   ┌── khung chat chung (tin nhắn, đặt lịch, handoff, lead)
        │                                   └── WidgetExtension của từng bot (thẻ, nút nhanh, panel toàn khung: studio nội thất, thử gạch…)
        ▼
/api/public/<slug>/{config,chat,messages,booking,handoff,lead,events,feedback,x/*}
        │
        ▼
Chat engine chung (src/application/use-cases/chat.ts)
   jev (phân loại + chọn độ khó) → mẫu câu / chuyển nhân viên / LLM (OpenRouter qua gateway) → tool của BotModule → guard chống bịa
        │
        ▼
PostgreSQL: schema `public` (dùng chung) + `store` + `tile` + `education` + `furniture` (riêng từng bot)
Lưu file: Cloudflare R2 (hoặc đĩa ./storage khi dev) — ảnh, GLB, ảnh phối cảnh của khách
Tài khoản/thanh toán/AI gateway: hub `skill-pages` (SSO OAuth2 PKCE, đơn hàng, gateway LLM)
```

Stack: **Next.js 16 (App Router, React 19.3, Turbopack/Webpack) · TypeScript · Tailwind v4 · Drizzle ORM · PostgreSQL (PGlite khi dev) · Vitest · three.js + react-three-fiber + model-viewer · Transformers.js (ONNX) · gltf-transform · AWS SDK (R2)**.

> ⚠️ Next.js ở đây là phiên bản mới có thay đổi phá vỡ so với kiến thức cũ. Trước khi viết mã Next, đọc `node_modules/next/dist/docs/` (xem `AGENTS.md`).

---

## 3. Cài đặt và chạy

### 3.1 Yêu cầu
- **Node 24** (đã dùng 24.21), npm. Windows/macOS/Linux đều được (dự án phát triển trên Windows; lưu ý heredoc bash làm mất `\` trong regex — mục 12).
- Không cần Docker/Postgres khi dev: không đặt `DATABASE_URL` thì dùng **PGlite** (Postgres nhúng ở `./data/pglite`, tự nạp bot demo).
- (Tuỳ chọn) kết nối được `skill-pages` ở `http://localhost:3000` để đăng nhập SSO/thanh toán; không có thì dùng tài khoản demo.

### 3.2 Các bước (máy mới)

```bash
git clone <repo> widget-norm && cd widget-norm
npm install

# 1) Model AI chạy trên trình duyệt (ONNX, ~hàng trăm MB, KHÔNG nằm trong git) → public/models + public/ort
npm run models                      # tất cả; build production dùng --commercial-only

# 2) Mô hình nội thất 3D demo (CC0, ~26 MB, KHÔNG nằm trong git) → assets/demo-furniture/<sku>.glb
node scripts/fetch-demo-furniture.mjs

# 3) Biến môi trường
cp .env.example .env.local          # bắt buộc đặt AUTH_SECRET (≥ 32 ký tự ngẫu nhiên). Phần còn lại tuỳ chọn.

# 4) Chạy
npm run dev                         # dùng cổng trong .env/launch.json (README: 3000; launch.json: 3001)
```

Lần chạy đầu PGlite tự tạo schema (DDL idempotent trong `src/infrastructure/db/schema.ts`) và nạp 4 bot demo kèm 30 ngày dữ liệu phân tích giả. Seed demo **chạy lại mỗi lần khởi động** (`ensureDemoBots`): nó chỉ bổ sung cái còn thiếu, và nâng cấp mô hình nội thất demo từ khối hộp cũ lên bản thật nếu thấy file trong `assets/demo-furniture/`.

### 3.3 Biến môi trường quan trọng (đầy đủ ở `.env.example`)

| Nhóm | Biến | Ghi chú |
|---|---|---|
| Bắt buộc | `AUTH_SECRET` | Ký cookie phiên admin |
| URL | `PUBLIC_BASE_URL` | Sinh mã nhúng, link; mặc định `http://localhost:3001` |
| DB | `DATABASE_URL` | Trống = PGlite. Thật: Supabase Session Pooler / Neon. `DATABASE_SSL_CA` nếu cần |
| Seed | `SEED_DEMO=true`, `SEED_DEMO_ANALYTICS=false`, `BOOTSTRAP_*` | Nạp demo vào DB thật / tạo admin đầu tiên |
| Hub (SSO + thanh toán + AI) | `HUB_BASE_URL`, `HUB_CLIENT_ID`, `HUB_CLIENT_SECRET`, `HUB_APP_AVI/TILE/EDU/FURNITURE`, `HUB_GATEWAY_KEY` | Bật `HUB_CLIENT_ID` ⇒ bắt buộc SSO trước khi tạo bot. Callback phải khớp `<PUBLIC_BASE_URL>/api/auth/hub/callback` |
| AI | `OPENROUTER_API_KEY`, `LLM_PROVIDER` (`rules` = ép luật), `DECISION_PROVIDER` (`jev|rules|off`), `DECISION_MODEL`, `OPENROUTER_MODEL_SIMPLE/COMPLEX`, `OPENROUTER_DATA_COLLECTION` (`deny` mặc định) | Không key = chế độ luật |
| Lưu file | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL`, `STORAGE_DIR` | Đủ 4 biến R2 đầu = dùng R2, không thì đĩa `./storage`. Bucket cần CORS GET (WebGL + `.glb`) |
| 3D từ ảnh | `TRELLIS_API_URL`, `TRELLIS_API_KEY` | Trống = ẩn nút "Tạo 3D nháp bằng AI". Thử bằng `node scripts/trellis-worker/mock-server.mjs` |

### 3.4 Tài khoản và URL demo
- Website: `/`, `/bots`, `/bots/avi`, `/bots/tu-van-gach-op-lat`, `/bots/luyen-thi-ielts`, `/bots/tu-van-noi-that`, `/pricing`, `/signup`.
- Admin: `/admin` (SSO khi có `HUB_CLIENT_ID`; tắt hub ở dev thì `admin@demo.vn` / `demo1234`). Quản lý ngôn ngữ: `/admin/languages`.
- Chat toàn màn hình của bot demo: `/embed/avi-demo`, `/embed/gach-dep-demo`, `/embed/trung-tam-demo`, `/embed/noi-that-demo` (cần `?vid=<8–64 ký tự>&origin=<origin>`; thường mở qua `widget.js`).
- Muốn thử khung nhúng thật: tạo file HTML tạm trong `public/` có `<script src="/widget.js" data-tenant="noi-that-demo" async></script>` rồi gọi `WidgetNorm.open()` (nhớ xoá file sau khi thử).

### 3.5 Lệnh thường dùng

```bash
npm run typecheck && npm test       # bắt buộc trước khi báo xong (180 test, ~5 giây)
npm run build                       # tải model thương mại + next build --webpack (Webpack vì lỗi Turbopack/PostCSS trên Windows)
npm start                           # chạy bản build
npm run db:migrate | db:seed        # script DB (db:seed cần R2 ghi được)
npm run embed:catalog               # tính vector CLIP cho ảnh sản phẩm nội thất cũ
npm run eval:decision               # chấm tầng quyết định jev trên 24 câu (gọi OpenRouter thật)
```

---

## 4. Mô hình AI và 3D — tải về, dùng ở đâu, giấy phép

### 4.1 Model chạy trên trình duyệt (ONNX / Transformers.js)

Khai báo ở `scripts/models.json`; `npm run models` tải từ Hugging Face về `public/models/<repo>/…` (thư mục này **gitignore**) và chép ONNX Runtime WASM từ `node_modules/onnxruntime-web` sang `public/ort/` (tự host, không phụ thuộc CDN). Mã nạp ở `analyzer.ts` / `segmenter.ts` đặt `env.allowRemoteModels = false`, `env.localModelPath = "/models/"`, `wasmPaths` trỏ `/ort/`. **Muốn dùng model mới: thêm vào `models.json` rồi `npm run models`.**

| Model | Vai trò | Dùng ở | Giấy phép | Thương mại |
|---|---|---|---|---|
| `Xenova/slimsam-77-uniform` | Tách vùng theo điểm chạm (sàn/tường; **tách nền ảnh sản phẩm**) | `src/bots/tile/vision/segmenter*.ts` (dùng chung cho nội thất: `furniture/vision/cutout.ts`) | Apache-2.0 | ✅ |
| `Xenova/clip-vit-base-patch32` | Nhận diện loại phòng + phong cách (zero-shot); vector ảnh để "tìm món giống ảnh" | `furniture/vision/analyzer.ts` (nhãn chữ tính sẵn ở `labels.json`, tạo bằng `scripts/build-clip-labels.ts`) | MIT | ✅ |
| `Xenova/detr-resnet-50` | Nhận diện đồ đã có trong ảnh phòng (sofa, ghế, giường, bàn…) | `furniture/vision/analyzer.ts` | Apache-2.0 | ✅ |
| `onnx-community/depth-anything-v2-small` | Ước lượng độ sâu (dự phòng cho phối cảnh) | tải sẵn, chưa dùng chính | Apache-2.0 | ✅ |
| `Xenova/segformer-b0-finetuned-ade-512-512` | Tự nhận diện sàn/tường | **chỉ R&D** | NVIDIA SCL + ADE20K | ❌ (`--commercial-only` bỏ qua) |

Phân tích ảnh nặng chạy trong **Web Worker** (`analyzer.worker.ts`, `segmenter.worker.ts`) để không treo giao diện; lần đầu khách chờ tải model (hiện thanh tiến trình).

### 4.2 Mô hình 3D demo (đồ nội thất thật)

- Nguồn: **Poly Haven** (https://polyhaven.com/models, **CC0**), quét 3D thật. Script `scripts/fetch-demo-furniture.mjs` tải gói glTF 1k, đóng thành `.glb` bằng `@gltf-transform`, lưu `assets/demo-furniture/<sku>.glb` (**gitignore**, ~26 MB). Chạy lại được (`--force` để tải lại).
- Bảng ánh xạ SKU demo → model Poly Haven nằm ở đầu script (vd `SF-L3-XAM → sofa_02`, `BA-6-OC → painted_wooden_table`, `TQA-3C → vintage_cabinet_01`). Chọn theo **tỉ lệ gần nhất** với số đo demo; số đo trong catalogue vẫn là chuẩn (studio co giãn từng trục về đúng số đo, `fitModel` trong `placement.ts`).
- Seed demo (`src/bots/furniture/module.ts → seedDemo`) đọc file này (`readDemoGlb`, đường dẫn `process.cwd()/assets/demo-furniture`) và `files.put` thành `<tenant>/furniture-models/<sku>-v2.glb`. **Không có file ⇒ rơi về khối hộp ghép** (`demoModels.ts`, đủ để test). `next.config.ts` có `outputFileTracingIncludes` để thư mục này vào bản build serverless.
- Thêm/đổi model demo: sửa bảng trong script + có thể chỉnh số đo demo ở `src/bots/furniture/demo.ts`; tên model xem `https://api.polyhaven.com/assets?t=models&c=furniture`.

### 4.3 Mô hình 3D của shop thật (3 mức, món có gì dùng nấy)

| Món có | Hiển thị | Cách có được |
|---|---|---|
| `.glb` | 3D thật: xoay mọi hướng, AR (model-viewer), phòng 3D | Admin tải `.glb` (≤ 40 MB, kiểm bằng `inspectGlb`: định dạng, kích thước bao, số tam giác, cảnh báo lệch > 15% so với số đo) |
| Chỉ ảnh sản phẩm | Ảnh thật tách nền dựng đứng trên sàn có bóng | Admin tải ảnh → SlimSAM tách nền ngay trên máy → lưu PNG trong suốt (`cutout_url`) |
| Không có gì | Hình SVG vẽ theo số đo (`art.ts`) | Tự động |

**Tạo 3D từ ảnh bằng AI (TRELLIS.2)**: nút "Tạo 3D nháp bằng AI" ở admin → `/api/admin/furniture/model` → máy chủ GPU riêng theo hợp đồng ở `scripts/trellis-worker/README.md` (`POST /generate`, `GET /jobs/{id}`). Kết quả luôn ở trạng thái **review** — khách không thấy tới khi nhân viên tick "Duyệt". Chưa có worker thật (cần GPU ~24 GB); có `mock-server.mjs` để thử luồng. Model: `microsoft/TRELLIS.2-4B` (MIT).

### 4.4 LLM (không chạy cục bộ)
- **jev** (`typesafe/jev-router`): tầng quyết định chạy TRƯỚC LLM chính — phân loại ý định, độ khó, route (mẫu câu / handoff / LLM đơn giản / LLM phức tạp).
- LLM trả lời: OpenRouter, model đơn giản/phức tạp cấu hình ở env (`OPENROUTER_MODEL_SIMPLE/COMPLEX`, có model dự phòng). Gọi qua gateway `skill-pages` khi có `HUB_GATEWAY_KEY`. `OPENROUTER_DATA_COLLECTION=deny` khi có dữ liệu khách thật.
- Chi tiết: `docs/PLAN-LLM.md`.

---

## 5. Kiến trúc mã nguồn

### 5.1 Phân lớp (`src/`)

```
domain/         Luật thuần, không phụ thuộc framework: tenant, booking, lead, decision(jev), conversation, chat-text + chat-packs (câu chữ chatbot theo ngôn ngữ), bot-pricing…
application/    Use case + port: chat engine (use-cases/chat.ts), tenants, booking, handoff, phân tích; ports.ts (interface LLM/Storage…)
adapters/       Cài đặt cụ thể: db (Drizzle repo), llm (OpenRouter/gateway/rule-based), notify, storage (R2/local)
infrastructure/ container.ts (DI), db/ (schema.ts + DDL + seed.ts), auth, hub (SSO/billing/payments), domains (DNS)
bots/           types.ts (BotModule) · catalog.ts (meta, dùng được ở client) · localize.ts · avi/compose.ts · store/ tile/ education/ furniture/
components/     site/ (landing, header, footer, landings/), admin/ (form dùng chung, ui.tsx), widget/ (ChatWidget, Panels, i18n, frame, extension)
lib/i18n/       Hệ thống ngôn ngữ (mục 7)
app/            (site)/ trang thương mại · admin/ quản trị · embed/[tenant]/ · api/public/[tenant]/… · api/admin/… · api/auth/hub/…
```

Quy tắc: domain/application **không** import từ `app/` hay `components/`; engine chung **không** chứa logic riêng của ngành.

### 5.2 Cơ sở dữ liệu
Một PostgreSQL, nhiều schema:
- `public`: `accounts`, `admin_users`, `tenants` (= 1 bot của khách; `kind`, `settings` jsonb gồm `language`, `theme`, `hours`, `booking`, `handoff`…), `conversations`, `leads` (có `meta` jsonb — dữ liệu riêng ngành), `events`, `message_insights`, `llm_calls`, `services`, `bookings`, `website_domains`, `hub_identities`, `bot_licenses`.
- `store.products` · `tile.{tiles,quotes,settings}` · `education.courses` · `furniture.items` (có `cutout_url`, `model_url`, `model_status`, `model_job`, `collection`, `pairs`, `embedding`).
- **Không join/FK chéo schema.** Thêm bảng: khai Drizzle (`pgSchema("<kind>")`) + thêm `CREATE … IF NOT EXISTS` / `ALTER … ADD COLUMN IF NOT EXISTS` vào mảng `DDL` (chạy lúc khởi động, idempotent) + RLS. Chi tiết: `.claude/skills/hub-architecture/SKILL.md`.

### 5.3 `BotModule` — cách một bot cắm vào engine (`src/bots/types.ts`)
Mỗi bot có `src/bots/<kind>/`:
- `meta.ts` — nội dung giới thiệu client-safe (tên, slug, tagline, tính năng, FAQ…). Chữ gốc **tiếng Việt**; bản dịch ở `lib/i18n/messages/<mã>/bot-pages.ts`.
- `module.ts` — server: `tools(ctx)` (tool cho LLM, vd furniture: `find_furniture`, `get_furniture_details`, `check_fit`, `calculate_order`, `suggest_pairs`, `design_room`), `promptLines`, `groundingFacts` (số tiền/SKU thật cho guard), `cards`, `resolveExtras`, `fallbackLlm` (bot luật), `publicConfig`, `seedDemo`, và `handlePublicApi` cho `/api/public/<slug>/x/<action>` (nội thất: `catalog`, `similar`, `design`, `lead`).
- `widget/extension.tsx` — `WidgetExtension` (`renderCards`, `renderExtras`, `quickActions`, `renderPanel`, `fullScreenPanels`) cắm vào `ChatWidget`. Extension nhận `ExtHelpers` gồm `send`, `openPanel`, `closePanel`, `pushLocal`, **`tr`** (dịch theo ngôn ngữ chatbot) và `lang`.
- `admin/*` — trang quản trị riêng, khai báo `adminNav`.
- Đăng ký: `src/infrastructure/container.ts` (server) + `src/bots/catalog.ts` (meta).
- Bot ngành **phải** dùng `composeWithAvi` (`src/bots/avi/compose.ts`) để kế thừa catalogue, prompt, grounding, cards của AVI.

### 5.4 Chat engine (`application/use-cases/chat.ts`)
Một lượt chat: nhận tin → **jev** phân loại → (a) trả **mẫu câu** (lời chào, giờ mở cửa, từ chối ngoài chủ đề…, theo `chat-packs`), (b) **handoff** nhân viên (khiếu nại, yêu cầu gặp người…), hoặc (c) gọi **LLM** (độ khó → model) với tool của module + tool dùng chung (`list_services`, `check_availability`, `open_booking_form`, `request_human`) → **guard** đối chiếu số/mã với `groundingFacts` → ghi phân tích. Lịch sử dài được tóm tắt (`buildRecap`). System prompt phụ thuộc ngôn ngữ bot (mục 7.3) và ổn định giữa các lượt để tận dụng prompt cache. Khoá hội thoại/rate limit đang **trong bộ nhớ 1 tiến trình** (nhiều instance cần chuyển sang Postgres/Redis).

### 5.5 Widget và nhúng
- `public/widget.js`: đọc cấu hình giao diện từ `/api/public/<slug>/loader` (màu, vị trí, kiểu nút…), tạo nút + `<iframe src="/embed/<slug>?vid=…&origin=…">`. Giao tiếp iframe↔trang bằng `postMessage`: `wn:close`, **`wn:expand`** (phóng to/thu nhỏ khung, mục 6.7). Trên màn ≤ 540 px iframe full màn hình.
- `ChatWidget.tsx` bọc `TrProvider` (dịch) + `FrameCtx` (phóng to). Chữ widget dịch theo **ngôn ngữ chatbot** (`settings.language`), không theo ngôn ngữ trình duyệt.
- Kiểm soát nơi nhúng: `allowedOrigins` + domain đã xác minh DNS (`website_domains`).

### 5.6 Tài khoản, thanh toán, SSO
Hub `skill-pages` (`HUB_BASE_URL`) giữ người dùng/OAuth/đơn hàng/gateway LLM. Widget Norm chỉ có adapter HTTP: SSO OAuth2 PKCE (S256) tại `/api/auth/hub/{start,callback}`, thanh toán qua API hub (gói → đơn → QR → polling; chỉ kích hoạt khi server xác nhận PAID + entitlement), giá theo loại bot ở `domain/bot-pricing.ts`. Chi tiết: `docs/AVI-REDESIGN.md`. Hết dùng thử mà chưa chọn gói ⇒ widget tạm ngưng.

### 5.7 Giao diện và theme
- Website: phong cách tối kiểu Lumen, màu thương hiệu tím (`brand-*`), skill `hub-landing-design`. Mỗi bot có landing riêng (`components/site/landings/*`).
- Admin: bọc `[data-admin]` (`app/admin/layout.tsx`), dùng chung `ThemeProvider` với website (khoá `localStorage` `wn_theme`, mặc định **tối**); token màu tối + ánh xạ class Tailwind sáng→tối nằm cuối `globals.css`. Component admin dùng biến `--bg --fg --surface --border --accent`.

---

## 6. Nội thất 3D — chi tiết kỹ thuật

Mã: `src/bots/furniture/`. Kế hoạch & quyết định: `docs/PLAN-FURNITURE-3D.md`.

### 6.1 Mô hình dữ liệu (`domain.ts`)
`FurnitureItem`: SKU, tên, loại (`category`), `rooms[]`, `style`, `material`, `color` (chữ tiếng Việt, vd "xám ghi"), `widthCm/depthCm/heightCm` (**số đo shop nhập là chuẩn**), giá, tồn kho, `imageUrl`, `cutoutUrl`, `modelUrl`, `modelStatus`, `collection`, `pairs`, `embedding`. `visualOf(item)` ⇒ `model | cutout | drawn`.

### 6.2 Luồng admin (tải ảnh/3D) — `admin/ItemMedia.tsx`, `vision/cutout.ts`, `model3d.ts`, `trellis.ts`
Tải ảnh → SlimSAM tách nền trên trình duyệt (chạm điểm xanh/đỏ để sửa) → PNG trong suốt lưu qua `/api/admin/furniture/upload` → tính vector CLIP lưu `embedding`. Tải `.glb` cùng route (kiểm định bằng `inspectGlb`, tối đa 40 MB). "Tạo 3D nháp" gọi `/api/admin/furniture/model` (TRELLIS) → trạng thái `review` → nhân viên duyệt.

### 6.3 Luồng khách trong studio — `widget/Studio.tsx`
1. Khách chụp/chọn ảnh phòng (hoặc phòng mẫu vẽ sẵn `vision/rooms.ts`).
2. **Phân tích** (worker): CLIP ⇒ loại phòng + phong cách + màu chủ đạo; DETR ⇒ đồ đã có. SlimSAM tự tìm vùng sàn → 4 góc (khách chỉnh được) + nhập kích thước thật của vùng sàn (m).
3. **Gợi ý trọn bộ** (`/x/design` → `design.ts: designRoomSet`): mỗi danh mục thiết yếu một món (`ROOM_SETS`), hợp phong cách/màu, vừa phòng, trong ngân sách, đồ ≤ 40% sàn, kèm `notes` (khoảng cách bàn trà–sofa 40–45 cm, lối đi…).
4. **Kê lên ảnh**: `autoLayout` đặt mặc định; khách kéo thả, xoay; viền đỏ khi ra ngoài sàn/chồng nhau (`insideFloor`, `overlaps`).
5. Gửi `lead` kèm ảnh phương án (`previewBase64` → R2), tên món, tổng tiền.

### 6.4 Hình học và phối cảnh — `vision/placement.ts` (thuần, có test)
- Toạ độ sàn (cm) ↔ ảnh (0..1) qua **homography** 4 góc sàn (`floorToImage/imageToFloor`, `bots/tile/vision/homography.ts`).
- `Placed`: `x,y` (tâm trên sàn, y từ tường trong ra phía người chụp), `angle` (độ; 0 = mặt trước quay về người chụp, 90 = sang phải, 270 = sang trái; `rot` boolean cũ ≡ 90°), `yawDeg/frontVector/angleToward/footCorners/footprint`.
- `project()` trả đa giác chân đồ (hình chữ nhật đã xoay), `center`, `pxPerCmX`, và **`pitchDeg`** (độ chúi camera suy từ độ co dọc của sàn).
- `fitModel(size, target)` co giãn từng trục của GLB về đúng số đo, tự xoay 90° nếu khớp hơn.

### 6.5 Dựng GLB lên ảnh phòng ở góc xoay bất kỳ — `vision/modelSprite.ts`
Mỗi món có GLB được dựng thành **"tem" PNG trong suốt** bằng three.js offscreen: camera **trực giao**, độ chúi = `pitchDeg` của sàn, góc xoay = `angle`, môi trường sáng `RoomEnvironment`, ACES tone mapping. Tem lưu trong cache (khoá gồm url, màu, số đo, yaw làm tròn 2°, pitch làm tròn 3°; tối đa 80 tem), có hộp bao phần có hình (để chọn món). Studio vẽ tem tại điểm chạm sàn của tâm món, tỉ lệ `pxPerCmX`. Đang dựng góc mới thì giữ tem cũ; GLB lỗi ⇒ rơi về cutout/SVG. `spriteThumb()` tạo ảnh đại diện (thẻ chat, danh mục) — `widget/ItemImage.tsx`.

### 6.6 Xoay tự do và đồng bộ màu
- **Xoay**: món đang chọn có vòng xoay trên sàn + **nút tròn kéo trực tiếp** (hít 0/90/180/270° trong ±6°), thanh trượt 0–359°, nút +90°. Món chỉ có ảnh phẳng không xoay thật được (chỉ đổi footprint) — UI nói rõ và gợi ý thêm `.glb`.
- **Màu** (`vision/tint.ts`, `design.ts: colorTint`): nhuộm **vật liệu chiếm diện tích lớn nhất** của GLB theo `color` catalogue, giữ chi tiết texture (nhân màu mới với độ sáng điểm ảnh / độ sáng trung bình, shader `onBeforeCompile`). Vật liệu được **nhân bản** trước khi sửa (không đụng cache gốc). Bỏ qua khi màu nhiều ("trắng - đen") hoặc không nhận ra (`colorTint` trả `null`). Áp dụng cho tem 2D, phòng 3D (`Room3D.tsx`) và ảnh thẻ.
- **Phòng 3D** (`Room3D.tsx`, react-three-fiber): sàn dựng theo kích thước, kéo thả ghim lưới 5 cm, OrbitControls; chỉ nạp khi khách bấm "Xem phòng 3D" (`next/dynamic`). **AR**: nút trên thẻ sản phẩm dùng `@google/model-viewer` (`widget/ModelViewer.tsx`).

### 6.7 Phóng to khung chat
Nút ⤢ (`widget/frame.tsx: ExpandButton`) ở header chat và header studio/thử gạch ⇒ widget gửi `postMessage({type:"wn:expand", expanded})` ⇒ `widget.js` bật class `wn-big` trên iframe (≤ 1180 px, `calc(100dvh - …)`). Trạng thái nhớ trong `sessionStorage` (`wn_expanded`); tự phóng to khi mở panel toàn khung (`fullScreenPanels`) và trả lại khi đóng. Chỉ hiện khi chạy trong iframe và `screen.width > 540`. Studio dùng **container query** (`@container`, `@3xl:`) — ≥ 768 px chia hai cột (ảnh | điều khiển).

### 6.8 Giới hạn đã biết
Ánh sáng tem cố định (chưa khớp ánh sáng ảnh phòng); món nhiều vật liệu chỉ nhuộm phần lớn nhất; 3 phòng mẫu là hình vẽ; chưa có worker TRELLIS thật; câu lý do/lưu ý của gợi ý trọn bộ (server sinh) còn tiếng Việt. Danh sách việc: `docs/PLAN.md` mục 3.

---

## 7. Hai ngôn ngữ (vi/en) — hệ thống mở rộng được

Có **ba lớp** độc lập:

| Lớp | Phục vụ | Chọn bởi | Mã |
|---|---|---|---|
| Giao diện website + admin | Người dùng admin/khách xem website | Cookie `locale` (nút VI|EN) → `Accept-Language` → mặc định vi | `src/lib/i18n/**` |
| Chữ trong widget chat | Khách của shop | **Ngôn ngữ chatbot** `settings.language` | `lib/i18n/widget/<mã>.ts`, `components/widget/i18n.tsx` |
| Câu trả lời của chatbot | Khách của shop | `settings.language` (đặt ở Cài đặt hoặc `/admin/languages`) | `domain/chat-packs/<mã>.ts` + `chat-text.ts` + prompt trong `chat.ts` |

### 7.1 Đăng ký ngôn ngữ — `src/lib/i18n/languages.ts` (nguồn duy nhất)
`LANGUAGES` khai `{code, name, english, intl, ui, chat}`. `BASE_LANGUAGE = "vi"` (khoá của mọi câu), `FALLBACK_LANGUAGE = "en"`. Chuỗi tra bản dịch: **ngôn ngữ đó → en → câu gốc** (`lookup.ts`) nên không bao giờ vỡ trang.

### 7.2 Quy ước viết chữ trong mã
- Viết **câu tiếng Việt làm khoá**: `t("Câu tiếng Việt", { n: 3 })` với biến `{n}`. Server component: `const { t } = await getT()` (`lib/i18n/server`). Client: `const t = useT()` (`lib/i18n/client`). Widget/extension: `useTr()` hoặc `h.tr`.
- Bản dịch thêm vào `lib/i18n/messages/en/*.ts` (giao diện) hoặc `lib/i18n/widget/en.ts` (widget). Nhóm file: `chrome`, `home`, `admin*`, `site` (landing), `bot-pages` (nội dung `BotMeta`), `labels` (trạng thái), `languages`, `admin-bots`. Khoá trùng ⇒ file đứng **trước** trong `messages/en/index.ts` thắng.
- **Không gọi `t()` trong hằng số cấp module** (không có ngữ cảnh ngôn ngữ): giữ chuỗi gốc rồi `t(x)` lúc hiển thị, hoặc dùng hàm nhận `t` (vd `groutColors(t)` trong Visualizer).
- Component dùng chung server+client phải là client component (không import `server.ts`).
- Nội dung giới thiệu bot: `localizeMeta(meta, t)` (`src/bots/localize.ts`) dịch cả `BotMeta`; trang bot và danh sách dùng nó.
- Metadata `<title>`: dùng `generateMetadata` + `getT`, không dùng `export const metadata` có chữ.

### 7.3 Chatbot trả lời bằng ngôn ngữ nào
- `TenantSettings.language` (`domain/tenant.ts`, mặc định vi; bot cũ không vỡ). `defaultSettings(shopName, language)`.
- Gói câu chữ `ChatPack` (`domain/chat-packs/types.ts`): thứ trong tuần, câu mẫu (`template`), câu chuyển nhân viên (`handoff`), câu an toàn của guard, nhận diện "chưa giải quyết", nhãn tóm tắt, lời chào/nút gợi ý/chữ theme mặc định, **chỉ thị ngôn ngữ cho LLM**. `Record<ChatLanguage, ChatPack>` ⇒ thêm ngôn ngữ `chat: true` mà thiếu gói thì **TypeScript báo lỗi**.
- Prompt hệ thống (`buildSystemPrompt`): vi ⇒ prompt tiếng Việt; mọi ngôn ngữ khác ⇒ prompt tiếng Anh + `directiveFor(lang)` đặt **đầu và cuối** prompt (đủ mạnh để bot en trả lời tiếng Anh cả khi khách hỏi tiếng Việt — đã thử thật). Prompt riêng từng ngành còn viết tiếng Việt và được bọc bởi chỉ thị này; tool nên trả số liệu/nhãn trung tính.
- Đổi ngôn ngữ + tick "đặt lại" ⇒ lời chào, nút gợi ý, tên trợ lý/phụ đề/nhãn nút lấy mặc định ngôn ngữ mới. Kiến thức cửa hàng/hướng dẫn do chủ shop nhập nên viết bằng ngôn ngữ chatbot.

### 7.4 Quản lý tập trung — `/admin/languages`
Bảng ngôn ngữ + % đã dịch (giao diện/widget) + gói chatbot sẵn sàng; tải JSON các câu **chưa dịch** (`/admin/languages/export?lang=xx&scope=ui|widget`) để gửi người dịch; đổi ngôn ngữ trả lời của từng chatbot (`setBotLanguageAction`). Thống kê tính trong `lib/i18n/coverage.ts`.

### 7.5 Thêm một ngôn ngữ (ví dụ `ja`)
1. Thêm dòng vào `LANGUAGES` trong `languages.ts` (`ui`/`chat` tuỳ ý).
2. Giao diện: tạo `lib/i18n/messages/ja/index.ts` (export `Dictionary` khoá = câu vi) và đăng ký trong `messages/index.ts`. Widget: `lib/i18n/widget/ja.ts` + `widget/index.ts`. Lấy file câu thiếu từ `/admin/languages`.
3. Nếu `chat: true`: viết `domain/chat-packs/ja.ts` (copy `en.ts`), đăng ký ở `chat-packs/index.ts`.
4. `npm run typecheck && npm test` (`lib/i18n/i18n.test.ts` kiểm tra mỗi ngôn ngữ ui có từ điển + widget, mỗi ngôn ngữ chat có gói).

### 7.6 Chưa làm
Ngày giờ admin vẫn định dạng `vi-VN` (`fmtDateTime/fmtDay` trong `components/admin/ui.tsx`; `intlLocale()` đã có sẵn để dùng); câu lý do/lưu ý do server sinh ở `furniture/design.ts`; vài chuỗi động trong Visualizer/IELTS widget.

---

## 8. Thư mục và file quan trọng (bản đồ nhanh)

| Việc | File |
|---|---|
| Danh sách bot + meta | `src/bots/catalog.ts`, `src/bots/<kind>/meta.ts` |
| Giá theo bot | `src/domain/bot-pricing.ts` |
| Schema + DDL + seed | `src/infrastructure/db/schema.ts`, `seed.ts`, `scripts/seed-data.ts`, `scripts/migrate.ts` |
| Chat engine | `src/application/use-cases/chat.ts`, `src/domain/decision.ts` |
| Loader nhúng | `public/widget.js`, `src/app/api/public/[tenant]/loader/route.ts` |
| Widget | `src/components/widget/{ChatWidget,Panels,i18n,frame,extension,extensions}.ts(x)` |
| Studio nội thất | `src/bots/furniture/widget/{Studio,Room3D,ItemImage,ModelViewer,extension}.tsx`, `vision/{placement,modelSprite,tint,analyzer*,cutout,rooms}.ts` |
| Luật thiết kế nội thất | `src/bots/furniture/design.ts` (`ROOM_SETS`, `designRoomSet`, `STYLE_INFO`, `colorTint`) |
| Tách vùng/homography dùng chung | `src/bots/tile/vision/*` |
| Theme admin | `src/app/globals.css` (cuối file), `src/app/admin/layout.tsx`, `src/components/admin/ui.tsx` |
| Ngôn ngữ | `src/lib/i18n/**`, `src/domain/chat-packs/**`, `src/domain/chat-text.ts`, `src/app/admin/languages/**` |
| Tải model / mô hình demo | `scripts/{download-models.mjs,models.json,fetch-demo-furniture.mjs}` |
| TRELLIS | `src/bots/furniture/trellis.ts`, `scripts/trellis-worker/` |

---

## 9. Kiểm thử và xác minh

1. `npm run typecheck && npm test` — luôn chạy; phải xanh trước khi báo xong. Test tích hợp chạy trên PGlite với đủ schema (`src/integration.test.ts`); logic thuần có test cạnh file (`placement.test.ts`, `design.test.ts`, `cutout.test.ts`, `model3d.test.ts`, `i18n.test.ts`, `chat-lang.test.ts`…).
2. `npx next build --webpack` — bắt lỗi biên dịch/route; **chạy khi dev server đã tắt**.
3. Kiểm tra giao diện thật trong trình duyệt khi đổi UI: widget nhúng bằng trang HTML tạm; thử cả `vi`/`en`, sáng/tối admin, mobile (≤ 540 px), khung phóng to.
4. Kiểm tra chữ còn tiếng Việt khi ở `en`: mở trang với cookie `locale=en` và quét text node chứa dấu tiếng Việt (script dùng trong các đợt trước: TreeWalker + regex dấu).
5. Khi sửa tầng quyết định: `npm run eval:decision` (cần key).

---

## 10. Cách mở rộng

### 10.1 Thêm bot ngách mới
Checklist ở `docs/PLAN.md` mục 2 + cổng chất lượng; tóm tắt: ngách hẹp → `meta.ts` → `module.ts` (tools tất định có test, `composeWithAvi`) → bảng trong schema riêng + DDL → `widget/extension.tsx` (công cụ chữ ký) → landing riêng (`components/site/landings/<Kind>Landing.tsx`, CSS `.<kind>-site`) → demo trong `seed.ts` → admin → đăng ký ở `container.ts` + `catalog.ts` → giá ở `bot-pricing.ts` → dịch (`bot-pages.ts`, widget) → test.

### 10.2 Thêm model AI chạy trên trình duyệt
`scripts/models.json` (ghi rõ `license`, `commercial`) → `npm run models` → nạp bằng Transformers.js với `localModelPath="/models/"` trong **worker**. Chỉ model cho phép thương mại mới được vào bản build (`--commercial-only`).

### 10.3 Thêm/đổi mô hình 3D demo
Sửa `MAP` trong `scripts/fetch-demo-furniture.mjs` → chạy script → khởi động lại server (seed sẽ đẩy bản `-v2`). Kiểm tra kích thước bao so với số đo trong `furniture/demo.ts`.

### 10.4 Thêm panel toàn khung cho một bot
Khai `fullScreenPanels` trong extension, `renderPanel(name, data, h)`; thêm `<ExpandButton />` vào header panel; dùng `@container` + `@3xl:` cho bố cục rộng; chữ qua `useTr()`.

---

## 11. Sự cố thường gặp

| Triệu chứng | Nguyên nhân / cách xử lý |
|---|---|
| `Hydration failed` (server vi, client en) hoặc giao diện không cập nhật sau khi sửa nhiều file | Dev server giữ module cũ → **khởi động lại dev server** |
| Dev server: widget kẹt "Đang kết nối trợ lý", log thấy `/config` bị gọi liên tục sau khi vừa chạy `next build` | Chưa rõ gốc (nghi `.next` lẫn build/dev, HMR websocket). Đừng chạy build khi dev đang mở; xoá `.next` rồi chạy lại; kiểm chứng bằng `next start`. Production chạy đúng |
| "Another next dev server is already running" / cổng nhảy sang 3002 | Có tiến trình dev cũ giữ cổng (`taskkill /PID <pid> /F` trên Windows) |
| R2 ghi trả `Access Denied` | Token chỉ đọc → cấp Object Read & Write. Không có R2 thì dùng đĩa `./storage` |
| `.glb` không tải khi nhúng ở web khác | Bucket R2 thiếu CORS GET cho domain đó |
| Studio không có mô hình thật (chỉ khối hộp) | Chưa chạy `fetch-demo-furniture.mjs` hoặc server chưa khởi động lại để seed |
| Model ONNX 404 | Chưa `npm run models` |
| SSO lỗi | Callback phải khớp chính xác `<PUBLIC_BASE_URL>/api/auth/hub/callback`; CSP `form-action` của hub; xem `docs/AVI-REDESIGN.md` |
| Build Turbopack lỗi PostCSS trên Windows | Dùng `npm run build` (Webpack) |

---

## 12. Dành riêng cho AI agent (đọc kỹ)

1. **Đọc `AGENTS.md`** và tài liệu Next trong `node_modules/next/dist/docs/` trước khi viết mã Next; kiến thức cũ về Next có thể sai.
2. **Trả lời/ghi docs bằng tiếng Việt** (ngôn ngữ của dự án). Mã nguồn: tên biến tiếng Anh, chú thích tiếng Việt.
3. **Cập nhật docs cùng lúc**: làm xong việc nào thì tick ở `docs/PLAN.md` mục 3 và ghi **một dòng vào mục 6 (nhật ký, mới nhất ở trên)**; đổi kiến trúc thì sửa file này.
4. Trước khi báo xong: `npm run typecheck && npm test`; đổi UI/route thì kiểm tra thật trên trình duyệt (production `next start` đáng tin hơn dev khi nghi ngờ). Báo trung thực những gì **chưa** kiểm chứng.
5. **Đừng**: nhét logic ngành vào chat engine; join chéo schema; gọi `t()` ở cấp module; để LLM tự tính tiền/số; commit model/GLB/`public/models`/`.env.local`/`data`/`storage`; chạy `next build` khi dev server đang mở; dùng model không cho thương mại.
6. **Bẫy công cụ trên Windows/bash**: heredoc làm mất `\` trong regex và có thể hỏng với dấu nháy lạ → ghi script bằng công cụ Write rồi chạy; dùng `node -e` cho việc ngắn không có regex. Đường dẫn Windows trong script: dùng `/`.
7. **Sửa nhiều file lặp lại cùng kiểu** (như dịch hàng loạt): viết script (Node) làm theo mẫu, rồi chạy `tsc --noEmit` để bắt chỗ sót — dự án đã làm vậy cho i18n (khoá = câu Việt, bọc `t()`, chèn `const t = useT()` vào component).
8. **Ngôn ngữ**: chữ mới hiển thị cho người dùng phải đi qua `t()`/`tr()` và có bản en (mục 7); nội dung `BotMeta` mới phải thêm vào `bot-pages.ts`.
9. **Khi thêm tính năng cho bot ngách**: phép tính tất định ở domain + test; tool trả `notes` khi có giả định; lead mang dữ liệu ngành trong `leads.meta`.
10. **Commit**: chỉ khi người dùng yêu cầu; nhánh feature (không commit thẳng `master`); kết thúc thông điệp bằng dòng `Co-Authored-By` theo chỉ dẫn hiện hành; không dùng `--no-verify`.
11. Trước khi đề xuất việc lớn, đọc `docs/PLAN.md` mục 3 — có thể đã nằm trong danh sách "Việc tiếp theo".

---

## 13. Thuật ngữ

- **Tenant / bot**: một chatbot của khách hàng (`public.tenants`); `kind` = loại bot.
- **jev**: tầng quyết định trước LLM (TypeSafe Jev Router): ý định, độ khó, route.
- **Guard / grounding**: đối chiếu số tiền/mã trong câu trả lời với dữ liệu thật.
- **Handoff**: chuyển cho nhân viên (gọi lại, Zalo, live chat).
- **Hub**: `skill-pages` — tài khoản, thanh toán, gateway LLM dùng chung nhiều sản phẩm.
- **Cutout**: ảnh sản phẩm đã tách nền (PNG trong suốt).
- **Tem (sprite)**: ảnh PNG trong suốt dựng từ GLB ở một góc xoay, dán lên ảnh phòng.
- **Homography**: phép biến đổi phối cảnh giữa mặt sàn (cm) và ảnh, giải từ 4 góc sàn.
- **ChatPack**: gói câu chữ của chatbot cho một ngôn ngữ.
