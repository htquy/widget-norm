# Kế hoạch LLM: Phase 1 (kết nối trực tiếp OpenRouter) → Phase 2 (qua AI Gateway + jev)

Cập nhật: 2026-11-05

## Trạng thái trong Widget Norm (cập nhật 2026-11-05)

Kế hoạch này được đưa vào Widget Norm và áp dụng cho **mọi loại chatbot** (hiện có 2: *store* — bán hàng & đặt lịch, *tile* — gạch ốp lát; sẽ thêm bot khác, xem [PLAN.md](PLAN.md) mục 5). Phần LLM nằm ở tầng dùng chung; mỗi bot chỉ đóng góp **tool, prompt và dữ kiện chống bịa** qua `BotModule` (`src/bots/types.ts`).

| Hạng mục | Trạng thái | Vị trí |
|---|---|---|
| Phase 1 — OpenRouter, tool calling, dự phòng, guard, đo lường | ✅ làm cho mọi bot | `src/adapters/llm/*`, `src/application/use-cases/chat.ts`, `grounding.ts` |
| 2C — tầng quyết định jev (`typesafe/jev-router`) | ✅ chạy trước LLM chính, mọi bot | `src/domain/decision.ts` (`planRoute`), `jevDecisionGateway.ts` |
| 2C — chọn model theo độ khó (`simple`/`complex`) | ✅ | `OPENROUTER_MODEL_SIMPLE` / `_COMPLEX` |
| 2C — đo hiệu quả (% tin không gọi LLM, tuyến xử lý) | ✅ dashboard + `llm_calls` | `src/app/admin/(panel)/page.tsx` |
| Bộ đánh giá tầng quyết định | ✅ 24 câu, jev 24/24 | `npm run eval:decision` |
| 2A — AI Gateway `skill-pages` (route, PII, ngắt mạch, hạn mức theo shop) | ⏳ chưa — đang gọi thẳng OpenRouter | thay `OpenRouterLlmGateway` bằng `GatewayLlmGateway` cùng port `LlmGateway` |
| 2B.3 — khoá hội thoại/đặt lịch + rate limit sang Postgres/Redis | ⏳ chưa — đang trong bộ nhớ | `src/application/locks.ts`, `src/infrastructure/http.ts` |
| Bộ đánh giá 50–100 hội thoại (so Haiku/GLM/DeepSeek) | ⏳ chưa | — |

Khác với bản gốc: bot theo luật dự phòng là **của từng module** (bot gạch hiểu diện tích, "mẫu 2"; bot store tra *Kiến thức cửa hàng*). Khi thêm bot mới, đánh giá jev cho ngành đó bằng cách thêm câu vào `scripts/eval-decision.ts`.

---

## Bối cảnh & lựa chọn model

| Model | Giá (USD / 1M token vào–ra) | Tool | Ảnh | Ghi chú |
|---|---|---|---|---|
| `google/gemma-4-31b-it:free` | 0 | có | có | **Model test Phase 1** — đa ngôn ngữ tốt, xem được ảnh phòng |
| `nvidia/nemotron-3.5-super-vl:free` | 0 | có | có | Dự phòng 1 (free) |
| `google/gemma-4-26b-a4b-it:free` | 0 | có | có | Dự phòng 2 (free) |
| `z-ai/glm-5.3-flash` | 0.15 / 0.50 (mặc định), từ 0.03 / 0.09 tuỳ nhà cung cấp | có | có | Ứng viên trả phí rẻ |
| `deepseek/deepseek-v4.1-flash` | 0.045–0.30 / 0.50–1.20 | có | có | Ứng viên trả phí |
| `claude-haiku-5-5` | 0.10 / 0.50 (+ cache) | có | có | Ứng viên chính khi bán thật |
| `typesafe/jev-router` | theo lượt | — | — | Decision model cho Phase 2 |

Giới hạn bản `:free` của OpenRouter: 20 request/phút; 50 request/ngày (1.000/ngày nếu tài khoản đã từng nạp ≥ 10 credit);
tính theo tài khoản — thêm key/tài khoản không tăng hạn mức. **Nhà cung cấp bản free thường log nội dung** → Phase 1 chỉ test bằng dữ liệu giả, không dùng số điện thoại/ảnh thật của khách.

---

## Phase 1 — Hoàn thiện chức năng, hiệu năng, cô lập dữ liệu, chống bịa (kết nối trực tiếp OpenRouter)

| # | Hạng mục | Nội dung | Trạng thái |
|---|---|---|---|
| 1.1 | Adapter OpenRouter | Chat Completions + tool calling (vòng lặp tối đa 5 lượt), ảnh đầu vào, chuỗi dự phòng `models[]`, timeout, phân loại lỗi (429/5xx/timeout → `LlmUnavailableError`) | ✅ |
| 1.2 | Chọn nhà cung cấp LLM | `LLM_PROVIDER=openrouter\|anthropic\|rules`; tự chọn theo key có sẵn | ✅ |
| 1.3 | Tự hạ cấp khi LLM lỗi | LLM lỗi/hết hạn mức → bot theo luật trả lời lượt đó, hội thoại không vỡ | ✅ |
| 1.4 | Quản lý context | Khi đổi nhà cung cấp hoặc history quá dài → mở history mới kèm tóm tắt từ transcript (không sửa history cũ — tương thích preserved thinking của Claude); bỏ ảnh cũ khỏi history OpenRouter | ✅ |
| 1.5 | Cô lập dữ liệu nhiều shop | Mọi tool lọc theo `tenantId` lấy ở server; khoá theo hội thoại tránh 2 tin nhắn ghi đè nhau; test tích hợp 2 shop dùng chung visitorId | ✅ |
| 1.6 | Kiến thức shop | Ô "Kiến thức cửa hàng" (FAQ, chính sách) trong Cài đặt, đưa vào system prompt trong thẻ dữ liệu | ✅ |
| 1.7 | Chống trả lời ảo | Prompt chỉ dùng dữ liệu tool/kiến thức shop + **bộ kiểm tra sau trả lời**: số tiền & mã SKU trong câu trả lời phải có trong dữ liệu; sai → hỏi lại 1 lần có nhắc lỗi; vẫn sai → câu trả lời an toàn | ✅ |
| 1.8 | Đo lường | Bảng `llm_calls` (shop, model, token, độ trễ, fallback, guard) + thẻ "AI" trên dashboard | ✅ |
| 1.9 | Test | Unit test guard, adapter OpenRouter (fetch giả), test tích hợp cô lập 2 shop trên PGlite | ✅ |

Chưa làm trong Phase 1 (để Phase 2): rate limit/khoá dùng Redis/DB cho nhiều instance; streaming câu trả lời.

## Phase 2 — Gọi qua AI Gateway (`skill-pages`) + decision model jev

**Cập nhật 2026-11-05:** đã triển khai adapter `HubLlmGateway` và `HubDecisionGateway` cho cả bot trả lời và jev; gateway trung tâm có tools/toolChoice, role tool, assistant tool_calls, kết quả toolCalls và SSE toolCallDeltas (OpenAI/OpenRouter). Bot luật dự phòng vẫn dùng khi gateway lỗi. Widget có 68 test, hub có 2 test hợp đồng JSON/SSE. Chưa chạy xuyên suốt với gateway thật vì chưa có `HUB_*` trong cấu hình widget. `AiRoute`/chuỗi model theo chính sách dữ liệu, usage theo tenant, hạn mức và khoá phân tán bên dưới vẫn chưa hoàn tất.

### 2A. Gateway (`skill-pages`)
1. Endpoint văn bản truyền `tools`/`tool_choice`/`tool_calls`/tin nhắn `tool` (cả SSE).
2. Adapter OpenRouter (dùng lại adapter OpenAI + `baseUrl`, header `HTTP-Referer`/`X-Title`, `provider.order`, `provider.data_collection`) và adapter Anthropic (SDK chính thức, prompt caching).
3. Bảng `AiRoute`: route → chuỗi model có thứ tự + chính sách dữ liệu (`allowsPII`, `noLogging`). Ví dụ `chat-sales`: Haiku 5.5 → GLM 5.3 Flash / DeepSeek V4.1 Flash (nhà cung cấp ghim, data_collection=deny); `dev-test`: các model `:free`.
4. Phân loại lỗi + `Retry-After` + ngắt mạch theo model; mã hoá key nhà cung cấp; usage theo `clientId` + `tenantId`; hạn mức theo shop.

### 2B. WidgetChats
1. `GatewayLlmGateway` thay `OpenRouterLlmGateway` (cùng port `LlmGateway`), gửi `route`, `tenantId`, cờ `containsPII`.
2. Gateway chết → bot theo luật (đã có từ Phase 1).
3. Rate limit + khoá hội thoại chuyển sang Postgres/Redis để chạy nhiều instance.

### 2C. Tầng kiểm soát jev (decision model) — chạy TRƯỚC LLM chính
Mỗi tin nhắn khách → 1 lượt jev phân loại (chọn trong tập nhãn cố định, kèm xác suất):

| Quyết định | Nhãn | Hành động |
|---|---|---|
| Vi phạm / ngoài phạm vi | `abuse`, `injection`, `off_topic` | Trả câu từ chối mẫu, **không gọi LLM** |
| Trả lời được ngay không cần LLM | `greeting`, `ask_contact`, `ask_quote_with_data`, `pick_tile` | Dùng template / tính báo giá trực tiếp (đã có tool) |
| Có trong dữ liệu shop? | `in_catalog`, `in_knowledge`, `not_in_data` | `not_in_data` → câu "chưa có thông tin, để lại SĐT", không gọi LLM |
| Cần LLM | `needs_consult` (+ độ khó `simple`/`complex`) | `simple` → model rẻ (GLM/DeepSeek Flash), `complex` → Haiku 5.5 |

Ngưỡng tin cậy: xác suất < 0.6 → bỏ qua tầng jev, gọi LLM bình thường (an toàn hơn từ chối nhầm).
Đo hiệu quả bằng `llm_calls`: tỉ lệ tin nhắn không cần gọi LLM, chi phí/hội thoại trước và sau, tỉ lệ guard chặn.

### Thứ tự thực hiện Phase 2
2A.1–2A.3 → 2B.1–2B.2 → bộ đánh giá 50–100 hội thoại tiếng Việt (so sánh Haiku / GLM / DeepSeek) → 2C → 2A.4, 2B.3.
