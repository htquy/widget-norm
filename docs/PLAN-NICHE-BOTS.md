# Kế hoạch bot ngách: AVI Thời trang + lộ trình bot chuyên ngành

Cập nhật: 2026-11-06 · Trạng thái: **phân tích & kế hoạch, chưa code** · Liên quan: [PLAN.md](PLAN.md) mục 5, `src/bots/roadmap.ts`

> Các con số thị trường lấy từ báo cáo công khai (nguồn ở cuối). Những chỗ ghi **(ước tính)** là giả định của mình, cần kiểm chứng ở bước P0 trước khi chốt giá.

---

## Phần A — AVI Thời trang

### A1. Kết luận nhanh

**Nên làm, nhưng không làm "chatbot tư vấn thời trang" chung chung.** Bot phải giải quyết được ba việc cụ thể:

1. **Chốt size đúng**: dựa trên bảng size của shop và dáng của từng mẫu, không để LLM tự đoán.
2. **Trả lời còn hàng theo size × màu**: lấy từ tồn kho thật.
3. **Chốt đơn COD ngay trong chat và xác nhận đơn**: giảm bom hàng.

Từ đó, định vị bán hàng là **"bớt hoàn hàng vì sai size, bớt bom hàng, trả lời inbox cao điểm"**, không phải "có AI".

| Tiêu chí | Đánh giá | Lý do chính |
|---|---|---|
| Nhu cầu | **Cao** | Thời trang & phụ kiện là ngành lớn nhất TMĐT (~28% GMV bốn sàn). Câu hỏi lặp lại rất nhiều ("cao 1m60 nặng 50kg mặc size gì", "còn màu đen size M không"). |
| Kỹ thuật | **Cao** | Dùng lại ~70% lõi: catalogue AVI, jev, live chat, lead, đặt lịch, widget, analytics. Phần riêng chủ yếu là tool tính toán (size, tồn kho, giỏ). |
| Thương mại | **Trung bình** | Rủi ro lớn nhất là **kênh bán**: phần lớn đơn thời trang nằm trên TikTok Shop/Shopee/Facebook, nơi không nhúng được widget. Thị trường phục vụ được thực tế là shop có website riêng và shop bán qua Messenger/Zalo (sau khi có kênh). |
| Giá | **Khả thi nếu kiểm soát chi phí AI** | Biên lợi nhuận chỉ ổn khi phần lớn câu hỏi đi qua mẫu/tool thay vì LLM lớn, và phải có hạn mức hội thoại theo gói (hiện chưa có, xem A6). |

### A2. Thị trường

- **Quy mô:** GMV bốn sàn năm 2025 khoảng 430.000–458.000 tỷ đồng, tuỳ đơn vị đo (Metric / YouNet ECI). Thời trang & phụ kiện chiếm ~28%, tương đương **~120.000–130.000 tỷ/năm chỉ riêng trên sàn**.
- **Dịch chuyển kênh:** TikTok Shop đã vượt Shopee riêng ở ngành thời trang (53,1% so với 46,1%), và tổng thị phần lên ~39,6%. Năm 2025, hơn 600.000 shop rời sàn vì phí sàn tăng và cạnh tranh giá. Hai xu hướng này đẩy local brand **xây kênh riêng** (website, Zalo, Messenger) để giữ khách và biên lợi nhuận. Đây chính là khách hàng của ta.
- **Phân khúc mục tiêu, theo thứ tự ưu tiên:**
  1. **Local brand / shop D2C có website** (Haravan, Sapo, Shopify, WordPress), chạy quảng cáo về website. Có 200–5.000 SKU biến thể và 1–5 nhân viên trực inbox. Trả tiền được và đo được hiệu quả.
  2. **Shop bán qua Messenger/Zalo + livestream:** số lượng lớn nhất nhưng cần kênh Messenger/Zalo (chưa có) và nhạy cảm giá hơn.
  3. **Chuỗi cửa hàng** (đồng phục, áo dài may đo, đồ công sở): đơn giá cao, cần đặt lịch thử đồ/đo. Dùng lại booking sẵn có.
- **Không nhắm:** shop chỉ bán trên sàn, vì sàn đã có chat và AI riêng và không cho nhúng.
- **Quy mô thị trường phục vụ được (ước tính):** vài chục nghìn shop thời trang có website riêng. Nếu chiếm 0,5–1% trong 12–18 tháng (≈150–400 shop trả phí) thì MRR đạt **≈60–300 triệu/tháng** với giá ở A5. Đây là con số để đặt mục tiêu, không phải dự báo.

### A3. Nỗi đau cần giải (xếp theo giá trị tiền)

| Nỗi đau | Hệ quả | Bot giải thế nào |
|---|---|---|
| Sai size → đổi/hoàn | Mất phí ship 2 chiều và hàng tồn. Quốc tế: ~45% lượt hoàn do size/màu/dáng. | Tool `recommend_size`: bảng size theo dáng (ôm/suông/oversize), nhận chiều cao, cân nặng, số đo nếu có. Trả size kèm độ tự tin và lý do ("mẫu này form ôm, nên lên 1 size"). |
| Inbox dồn sau livestream/quảng cáo | Khách hỏi xong chờ lâu thì đi | Trả lời tức thì về size, tồn kho, ship, đổi trả. Câu khó mới chuyển nhân viên (đã có live chat). |
| "Còn size M màu đen không?" | Nhân viên phải mở kho tra | Tool `check_stock` theo biến thể. Thẻ sản phẩm hiện chip size/màu, chip hết hàng thì làm mờ. |
| Bom hàng COD | Mất phí ship và vốn quay vòng | Tạo đơn nháp trong chat, xác nhận lại (Zalo/SMS ở giai đoạn sau), ghi lịch sử bom theo số điện thoại. |
| Khách không biết phối đồ | Giỏ hàng chỉ có 1 món | Tool `suggest_outfit` lấy từ lookbook của shop → bán kèm (AOV +). |
| Khách gửi ảnh "có mẫu này không" | Nhân viên phải lục kho ảnh | `search_by_image` (P2): embedding ảnh → mẫu giống nhất trong catalogue. |

### A4. Đối thủ và khác biệt

- **Chatbot VN phổ biến** (Botcake/Pancake, AhaChat, FChat, Harafunnel): mạnh ở quản lý inbox đa kênh, kịch bản theo luật, comment-to-inbox livestream. Thường miễn phí hoặc rẻ. Không có tư vấn size theo dáng, không đọc tồn kho biến thể kèm lý do, AI hiểu ngữ cảnh còn hạn chế. **Không cạnh tranh trực diện ở mảng quản lý inbox**; định vị là lớp tư vấn và chốt đơn trên website, sau đó mới thêm kênh.
- **Công cụ size/try-on quốc tế** (Fit Finder, Kiwi Sizing, các app try-on trên Shopify): làm tốt từng mảnh nhưng giá theo USD, không tiếng Việt, không có chat/chốt đơn/COD.
- **Khác biệt của ta:** một bot tiếng Việt gói cả size, tồn kho, phối đồ, chốt đơn, nhân viên trực, báo cáo "size nào bị hỏi mà hết hàng". Có guard chống bịa (giá và mã có thật) và tầng jev giữ chi phí thấp.

### A5. Giá và tính khả thi về giá

**Chi phí AI mỗi hội thoại (ước tính):**
- Số đo thực tế trong `llm_calls` hiện mới có 3 lượt: trung bình ~4.000 token vào và ~600 token ra mỗi lượt gọi LLM. Một hội thoại bán hàng khoảng 6 lượt, tức ~24.000 vào và ~3.600 ra.

| Kịch bản | Giả định | Chi phí / hội thoại |
|---|---|---|
| Tốt | 50% lượt đi mẫu/tool (jev), còn lại model flash, có cache prompt | ~50–80đ |
| Trung bình | 80% flash, 20% model mạnh | ~150–300đ |
| Xấu | Phần lớn đi model mạnh, không cache | ~500–1.000đ |

Đơn giá token thay đổi theo thời gian, nên phải đo bằng số thật ở P0. Ảnh try-on nếu làm có chi phí riêng, ~1.000–3.000đ/ảnh (ước tính) → **bán theo credit, không đưa vào gói**.

**Đề xuất giá (đặt giữa AVI 199k và AVI Gạch 499k):**

| Gói | Giá/tháng | Hạn mức | Có gì | Chi phí AI tối đa (kịch bản trung bình) |
|---|---|---|---|---|
| Starter | **399.000đ** | 1.000 hội thoại | Toàn bộ AVI + bảng size, tồn kho biến thể (CSV), chốt đơn nháp, phối đồ | ~150–300k |
| Pro | **899.000đ** | 4.000 hội thoại | + đồng bộ Haravan/Sapo/Shopify, tìm theo ảnh, học từ đổi size, báo cáo hoàn/bom | ~600k–1,2tr → **lỗ nếu không đạt kịch bản tốt** |
| Vượt hạn mức | 150đ/hội thoại | | | |
| Add-on try-on | 99.000đ / 100 ảnh | | | ~100–300k |

**Đọc bảng này:**
- Gói chỉ có lãi gộp ≥70% khi chi phí **≤ ~80đ/hội thoại**. Điều kiện là jev chặn được phần lớn câu lặp (size, ship, đổi trả) bằng mẫu và tool, và mặc định dùng model flash. Đây là **điều kiện tiên quyết**, không phải tối ưu sau.
- Nếu P0 đo ra 150–300đ thì phải chọn một trong hai: hạ hạn mức (Starter 600, Pro 2.500), hoặc tăng giá Pro lên ~1,2tr.
- **ROI với khách:** AOV thời trang ~300–500k (ước tính). Chỉ cần thêm ~1–2 đơn/ngày, hoặc bớt vài đơn hoàn vì sai size mỗi tuần, là đủ bù 399k. Rẻ hơn rất nhiều so với 1 nhân viên trực inbox (~7–9tr/tháng). Đây là câu chuyện bán hàng chính.
- Dùng thử: giữ trial hiện có, nhưng **giới hạn 200 hội thoại** để không bị đốt chi phí AI.

### A6. Kiến trúc (theo `hub-architecture`)

`kind = "fashion"`. Module `src/bots/fashion/` dùng `composeWithAvi(core, fashion)`, nên catalogue, prompt, grounding và thẻ sản phẩm đều kế thừa từ AVI; không sao chép code.

**Schema `fashion`** (DDL idempotent + RLS, có `tenant_id`, khoá logic tới `store.products.id`, không FK chéo schema):

| Bảng | Nội dung |
|---|---|
| `size_charts` | Bảng size theo nhóm/dáng: `fit` (ôm/suông/oversize), `rows` jsonb (size → khoảng chiều cao, cân nặng, ngực, eo, mông). Có mẫu sẵn cho bảng size phổ biến ở VN. |
| `product_fit` | Sản phẩm → `size_chart_id`, độ lệch form ("lên 1 size"), chất liệu co giãn. |
| `variants` | Sản phẩm × size × màu → SKU, tồn kho, ảnh màu, `external_id` (Haravan/Sapo). |
| `fit_feedback` | Size đã mua, số đo khách, kết quả (vừa/chật/rộng/đổi). Dùng để hiệu chỉnh gợi ý theo từng mẫu. |
| `outfits` | Bộ phối từ lookbook: danh sách sản phẩm, dịp, phong cách. |
| `order_drafts` | Giỏ hàng, địa chỉ, COD/chuyển khoản, trạng thái xác nhận, `phone_hash` để chấm điểm rủi ro bom hàng. |
| `image_embeddings` (P2) | Vector ảnh sản phẩm. Cần pgvector: Supabase và PGlite đều hỗ trợ, phải kiểm tra lại. |

**Tool:** `recommend_size`, `check_stock`, `suggest_outfit`, `add_to_cart`, `create_order_draft`, `track_order` (P2, gọi GHN/GHTK), `search_by_image` (P2).
- Mọi con số (size, giá, tồn kho) đều do tool trả. LLM chỉ diễn đạt lại, và guard kiểm tra.

**Widget:**
- Form size nhanh (chiều cao, cân nặng, dáng người, thích mặc rộng hay vừa).
- Thẻ biến thể với chip size/màu.
- Giỏ hàng mini.
- Carousel phối đồ.

**Admin:**
- Bảng size (nhập Excel/CSV, có mẫu).
- Tồn kho biến thể.
- Đơn nháp.
- Báo cáo: "size bị hỏi mà hết", "mẫu bị đổi size nhiều" (dấu hiệu bảng size sai), tỷ lệ chốt đơn.

**Phễu:** hỏi size → xem thẻ → thêm giỏ → tạo đơn → xác nhận.

**Việc nền tảng phải làm trước hoặc song song** (đã có trong PLAN.md mục 3/5):

| Việc | Mức cần | Lý do |
|---|---|---|
| Hạn mức hội thoại theo gói (`messagesPerMonth`) | **Bắt buộc trước khi bán** | Không có thì không kiểm soát được chi phí AI. |
| Ảnh khách gửi → LLM/vision trong engine chung | Cần cho P2 | Hiện mới có ở bot gạch bản cũ. |
| Connector Haravan/Sapo/Shopify (catalogue + tồn kho + tạo đơn) | Cần cho Pro | Khách sẽ không nhập tay tồn kho. |
| Kênh Messenger/Zalo OA | Mở phân khúc 2 | Đây là thị trường lớn nhất của thời trang. |
| Streaming câu trả lời | Nên có | Giảm cảm giác chờ. |

> Lỗi phát hiện khi đo số liệu: bảng `llm_calls` trên DB Postgres đang dùng **thiếu 6 cột** (`decision_label`, `decision_confidence`, `decision_model`, `decision_latency_ms`, `decision_tokens`, `route`). Mảng DDL chỉ có `CREATE TABLE IF NOT EXISTS` mà không có `ADD COLUMN`. Cùng gốc với lỗi cột `variant` vừa sửa. Cần sửa trước, nếu không số liệu chi phí ở A5 sẽ không đo được.

### A7. Lộ trình và điều kiện đi tiếp

| Giai đoạn | Thời lượng (ước tính) | Việc chính | Điều kiện qua cửa |
|---|---|---|---|
| **P0 – Kiểm chứng** | 1–2 tuần | Phỏng vấn 15–20 shop (5 có website, 10 bán qua inbox). Thêm "AVI Thời trang" vào `roadmap.ts` kèm form chờ. Đo chi phí/hội thoại thật trên 2 bot đang có. Kiểm tra API Haravan/Sapo. Sửa thiếu cột `llm_calls`. | ≥5 shop đồng ý dùng thử có cam kết; chi phí ≤150đ/hội thoại. |
| **P1 – MVP** | 3–4 tuần | Hạn mức hội thoại, schema `fashion`, size/tồn kho/phối đồ/đơn nháp, widget, admin, demo shop, câu eval cho `eval-decision`, test tích hợp, landing theo `hub-landing-design`. | 5 shop chạy thật 30 ngày; ≥30% câu hỏi size trả lời không cần nhân viên. |
| **P2 – Pro** | 4–6 tuần | Connector Haravan/Sapo/Shopify, tìm theo ảnh, học từ `fit_feedback`, tra vận đơn, kênh Messenger/Zalo. | ≥20 shop trả phí; churn tháng <8%. |
| **P3 – Add-on** | Tuỳ | Try-on theo credit, chấm điểm rủi ro bom hàng, nhắc giỏ bỏ dở qua Zalo ZNS. | Có khách yêu cầu và trả tiền. |

**KPI theo dõi:**
- Tỷ lệ hội thoại → đơn nháp → đơn xác nhận.
- % câu hỏi size được giải mà không cần nhân viên.
- Chi phí AI/hội thoại.
- Tỷ lệ đổi size của shop trước/sau, do shop tự báo hoặc qua `fit_feedback`.

### A8. Rủi ro

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Đơn chủ yếu nằm trên sàn | Cao | Chỉ nhắm D2C có website ở P1; thêm Messenger/Zalo ở P2; không hứa với shop chỉ bán sàn. |
| Đối thủ miễn phí | Cao | Bán theo kết quả (size, chốt đơn, hoàn hàng); không bán "chatbot". Có báo cáo chứng minh ROI trong admin. |
| Gợi ý size sai → khách phàn nàn | Trung bình | Chỉ dựa trên bảng size của shop. Hiện độ tự tin, câu "nếu phân vân giữa 2 size…", và chuyển nhân viên khi tự tin thấp. |
| Chi phí AI vượt giá | Trung bình | Bắt buộc có hạn mức; jev ưu tiên mẫu/tool; model flash mặc định; đo hằng tuần. |
| Dữ liệu cá nhân (số đo, ảnh cơ thể nếu try-on) | Trung bình | Xin đồng ý và có tự xoá theo Nghị định 13/2023; giữ `OPENROUTER_DATA_COLLECTION=deny`; ảnh try-on không lưu lâu dài. |
| Chất lượng try-on kém, làm mất uy tín | Trung bình | Để ở P3 dạng add-on tuỳ chọn, gắn nhãn "ảnh minh hoạ". |

---

## Phần B — Lộ trình bot ngách

### B1. Tiêu chí chọn ngách

Một bot ngách chỉ đáng làm khi đạt **≥4/5** tiêu chí:

1. **Có phép tính hoặc tra cứu chuyên ngành** (báo giá theo kích thước, size, lịch theo tài nguyên, trả góp) mà chatbot chung không làm đúng được. Đây là hào chắn chính.
2. **Giá trị đơn/lead cao**, để khách trả 500k–1,5tr/tháng mà vẫn có lời.
3. **Khách tự có website/fanpage và chạy quảng cáo**, nên có lưu lượng chat.
4. **Có dữ liệu riêng của shop** (catalogue, bảng giá, lịch) để bot không thể bị copy bằng ChatGPT.
5. **Dùng lại lõi ≥60%**: AVI, booking, quote, vision, live chat.

### B2. Chấm điểm ứng viên

Điểm từ 1 đến 5, cao là tốt. Cột "Rủi ro pháp lý" cũng chấm theo chiều này: 5 là ít rủi ro.

| Bot | Phép tính riêng | Giá trị lead | Có website/ads | Dùng lại lõi | Rủi ro pháp lý | Tổng | Giá gợi ý/tháng |
|---|---|---|---|---|---|---|---|
| **Vật liệu & nội thất** (sơn, sàn gỗ, rèm, thiết bị vệ sinh, nội thất) — mở rộng bot gạch | 5 (tính lít/m², khổ rèm, số tấm sàn) | 5 | 5 | 5 (quote + ướm ảnh của tile) | 5 | **25** | 499k–899k |
| **Nha khoa & thẩm mỹ** (niềng, implant, spa) — cụ thể hoá "clinic" | 4 (ước tính phác đồ/chi phí theo tình trạng, trả góp) | 5 (đơn 10–60tr) | 5 | 4 (cần booking theo bác sĩ) | 3 (quảng cáo y tế, không chẩn đoán) | **21** | 799k–1,5tr |
| **AVI Thời trang** (phần A) | 4 | 3 | 4 | 5 | 5 | **21** | 399k–899k |
| **Ngoại ngữ & du học** | 4 (test đầu vào trong chat → lộ trình, học phí, lịch khai giảng) | 4 | 5 | 4 | 4 | **21** | 599k–999k |
| **Bất động sản dự án** | 4 (lọc căn, lịch thanh toán, khoản vay) | 5 | 5 | 4 | 3 (thông tin pháp lý dự án) | **21** | 999k–2tr |
| **Đồng phục & in ấn quà tặng B2B** | 5 (báo giá theo số lượng × chất liệu × kiểu in, bảng size tập thể) | 4 | 4 | 4 (dùng chung bảng size của thời trang + quote) | 5 | **22** | 499k–899k |
| **Garage / đại lý xe** (xe máy, ô tô, xe điện) | 4 (bảo dưỡng theo km/đời xe, trả góp) | 4 | 4 | 4 | 4 | **20** | 499k–999k |
| **Mỹ phẩm / skincare D2C** | 3 (quiz loại da → routine) | 3 | 5 | 5 (giống thời trang) | 2 (công bố công dụng) | **18** | 399k–699k |
| **Tour, homestay, khách sạn nhỏ** | 3 | 3 | 3 | 4 | 5 | **18** | 399k–699k |
| **Nhà hàng, đặt bàn** (đang đứng đầu roadmap) | 2 | 2 (đơn thấp; Grab/ShopeeFood chiếm kênh) | 3 | 4 | 5 | **16** | 199k–399k |
| **Vật tư nông nghiệp** | 4 | 3 | 1 (khách dùng Zalo, ít web) | 3 | 2 (thuốc BVTV) | **13** | Hoãn |

### B3. Đề xuất thứ tự

1. **Vật liệu & nội thất** (mở rộng `tile` thành họ "AVI Vật liệu"): rẻ nhất để làm vì đã có quote m², ướm ảnh và catalogue. Chỉ cần **tổng quát hoá công thức báo giá** (xem B4). Có thể ra trước hoặc song song với thời trang.
2. **AVI Thời trang**: thị trường lớn nhất. Xây hai năng lực nền dùng lại cho bot sau: biến thể + tồn kho, và chốt đơn.
3. **Nha khoa & thẩm mỹ**: giá cao nhất. Cần booking theo tài nguyên (bác sĩ/ghế) trước. Thay mục "clinic" chung trong roadmap.
4. **Ngoại ngữ & du học**, rồi **đồng phục B2B** (dùng bảng size của thời trang + công thức báo giá).
5. **BĐS dự án**, **garage/xe**: làm khi có đối tác đầu tiên, vì cần dữ liệu và quy trình riêng của từng đơn vị.
6. **Hạ nhà hàng xuống cuối**, hoãn nông nghiệp. Cập nhật `src/bots/roadmap.ts` khi chốt.

### B4. Năng lực nền dùng chung (đầu tư một lần, nhiều bot dùng)

| Năng lực | Bot hưởng lợi | Ghi chú |
|---|---|---|
| **Công thức báo giá cấu hình được** (biến đầu vào → công thức → dòng báo giá, có hao hụt/làm tròn đơn vị) | Gạch, sơn, rèm, sàn, đồng phục, in ấn, nha khoa, xe | Tách từ `tile/quotes.ts` thành capability chung. Module ngành chỉ khai báo biến và công thức. |
| **Biến thể + tồn kho + giỏ/đơn nháp** | Thời trang, mỹ phẩm, đồng phục, vật liệu | Làm cùng thời trang, đặt ở tầng AVI để bot khác kế thừa. |
| **Booking theo tài nguyên** (bác sĩ, ghế, phòng, xe) | Nha khoa, ngoại ngữ (lớp), garage, homestay | Đã ghi ở PLAN.md mục 5. |
| **Ảnh vào engine chung** (vision, embedding) | Thời trang, vật liệu, nha khoa (ảnh răng, chỉ tham khảo), garage | Đã ghi ở PLAN.md mục 3. |
| **Kênh Messenger/Zalo OA + ZNS** | Tất cả, đặc biệt thời trang và mỹ phẩm | Mở rộng thị trường lớn nhất. |
| **Hạn mức hội thoại + đo chi phí** | Tất cả | Điều kiện để bán có lãi. |

### B5. Nguyên tắc giá cho mọi bot ngách

- **Giá theo giá trị lead của ngành, không theo chi phí làm bot.** Vì vậy nha khoa/BĐS đặt giá cao hơn thời trang, dù độ khó kỹ thuật tương đương.
- Mỗi gói có **hạn mức hội thoại**. Chi phí AI tối đa ≤30% giá gói; phần vượt tính theo hội thoại.
- Tính năng tốn chi phí biến đổi (try-on, gửi ZNS, tạo ảnh phối cảnh) **bán theo credit**.
- Trang giá mỗi bot có câu ROI cụ thể ("1 ca niềng răng = 20 tháng phí", "1 đơn/ngày = hoà vốn").

---

## Nguồn

- [Doanh thu TMĐT 2025 đạt hơn 458.000 tỷ đồng (Doanh nhân – Pháp luật)](https://doanhnhan.baophapluat.vn/doanh-thu-thuong-mai-dien-tu-2025-dat-hon-458-000-ty-dong-tiktok-shop-pha-hoi-nong-len-shopee.html)
- [TikTok Shop tăng trưởng 93% (Nhà đầu tư)](https://nhadautu.vn/tiktok-shop-tang-truong-93-cuoc-dua-song-ma-voi-shopee-ngay-cang-ro-net-d103507.html)
- [TMĐT 2025: Lazada và Tiki chia nhau 3% thị phần (Đại biểu Nhân dân)](https://daibieunhandan.vn/thuong-mai-dien-tu-viet-nam-2025-lazada-va-tiki-tut-doc-chia-nhau-3-thi-phan-10405406.html)
- [Hơn 600.000 shop rời TMĐT năm 2025 (Doanh nhân – Pháp luật)](https://doanhnhan.baophapluat.vn/hon-600-000-shop-chia-tay-thi-truong-thuong-mai-dien-tu-trong-nam-2025-da-tang-cua-shopee-cham-lai.html)
- [Báo cáo TMĐT 2025 (MISA eShop)](https://www.misaeshop.vn/bao-cao-thuong-mai-dien-tu-2025/)
- [Top chatbot Facebook miễn phí (Tinh tế)](https://tinhte.vn/thread/top-11-chatbot-facebook-mien-phi-da-nang-nhat-2024.3841344/) · [Botcake – commerce](https://botcake.io/use-cases/commerce)
- [Virtual try-on: dữ liệu ngành nói gì (AI Frame)](https://intercom.help/ai-frame/en/articles/15908603-does-virtual-try-on-actually-work-what-the-industry-data-says) · [Thống kê gợi ý size bằng AI (Envive)](https://www.envive.ai/post/ai-powered-size-recommendation-statistics) · [Virtual try-on statistics (Morphed)](https://morphed.app/stats/virtual-try-on-statistics)
