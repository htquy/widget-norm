# AVI Nội thất 3D: đánh giá khả thi và checklist

Cập nhật: 2026-11-07 (P1–P4 đã triển khai, xem mục 5). Nguồn yêu cầu: prompt "Widget Chatbot AI Tư vấn & Phối cảnh Nội thất 3D" (.NET / React / Three.js / Python).
Phiên bản và giấy phép dưới đây đã kiểm tra trên npm và Hugging Face ngày 2026-11-07.

## 1. Kết luận

**Khả thi trên web**, nhưng nên làm theo cách khác với prompt ở ba điểm:

1. **Giữ một stack (Next.js + TypeScript + Postgres)**, không thêm .NET, SignalR, Python microservice. Engine chat (jev + LLM + tool + guard), lead, đặt lịch, widget nhúng đã có sẵn. Thêm backend thứ hai chỉ nhân đôi chỗ phải vận hành.
2. **Nút thắt là dữ liệu 3D của shop, không phải code.** Phần lớn showroom Việt chỉ có ảnh chụp, không có file `.glb`. Vì vậy studio phải hỗ trợ ba mức, món nào có gì dùng nấy:

   | Món có | Hiển thị trong studio | Chất lượng |
   |---|---|---|
   | File `.glb` | Mô hình 3D thật: xoay, đặt vào ảnh phòng theo camera dựng từ sàn, AR trên điện thoại | Cao nhất |
   | Chỉ có ảnh sản phẩm | Ảnh thật đã tách nền (BiRefNet), dựng đứng trên sàn đúng kích thước, có bóng đổ | Khá, thay hẳn hình SVG hiện tại |
   | Không có gì | Khối hộp đúng kích thước, phủ màu/vân vật liệu (SVG hiện tại chỉ làm phương án cuối) | Thấp |

3. **AI tạo 3D (TRELLIS.2) không chạy realtime cho khách.** Cần GPU lớn; Hugging Face Spaces có hạn mức, không dùng làm hạ tầng sản phẩm được. Chỉ chạy **một lần khi shop nhập sản phẩm** (công cụ trong admin, bán thêm), nhân viên duyệt kết quả trước khi bật.

## 2. Đối chiếu prompt gốc

| Thành phần trong prompt | Đánh giá | Đề xuất cho dự án này |
|---|---|---|
| Một file JS bundle chứa chat + canvas 3D | Bundle Three.js vào script nhúng làm mọi website của khách nặng thêm vài trăm KB | Giữ kiểu nhúng iframe hiện tại (`/embed/[tenant]` + loader). Chỉ nạp 3D (`next/dynamic`) khi khách mở studio |
| Vite | Không cần | Next.js đã đóng gói |
| Axios | Không cần | `fetch` đang dùng là đủ |
| .NET + Semantic Kernel / LangChain.NET | Trùng với engine chat đã có | Thêm tool vào `BotModule` (đã có `design_room`, `check_fit`…) |
| SignalR đồng bộ toạ độ 3D | Không cần: toạ độ chỉ sống trên máy khách | Lưu phương án dạng JSON khi khách gửi lead hoặc tạo link chia sẻ. Streaming chữ dùng SSE (đã có trong kế hoạch) |
| YOLOv8 | **Giấy phép AGPL-3.0**: SaaS đóng mã phải mua giấy phép Ultralytics | Giữ DETR ResNet-50 (Apache-2.0) đã tải |
| SAM | Đã có | SlimSAM (Apache-2.0) |
| Stable Diffusion Inpainting để xoá đồ cũ | Cần GPU server, chậm, hay vẽ bịa | Dùng LaMa ONNX (Apache-2.0) để xoá đồ. Chạy trên trình duyệt máy tính được (~200 MB); trên điện thoại cần server. Để giai đoạn sau |
| TRELLIS / TRELLIS.2 qua HF Spaces realtime | Model MIT, nhưng Spaces không dùng cho production được | Chạy offline khi shop nhập hàng, trên GPU thuê theo giờ |
| Qdrant / Milvus | Thừa với danh mục vài trăm đến vài nghìn món | `pgvector` trong Postgres đang dùng |
| Neo4j | Thừa | Bảng `furniture.pairings` (món A hợp món B, cùng bộ sưu tập) + cột `collection` |
| Thiếu: tối ưu file GLB | GLB từ nhà sản xuất thường 20–100 MB, điện thoại không tải nổi | `@gltf-transform` nén Draco/Meshopt, giảm texture xuống WebP/KTX2, kiểm tra kích thước thật khớp `widthCm × depthCm × heightCm` |
| Thiếu: AR trên điện thoại | Giá trị cao nhất với khách nội thất: đặt sofa vào phòng thật qua camera | `@google/model-viewer` (Android Scene Viewer / WebXR; iOS Quick Look cần USDZ) |
| Thiếu: dựng camera từ ảnh | Muốn đặt GLB lên ảnh phòng cho đúng phối cảnh | Giải tư thế camera từ homography 4 góc sàn + kích thước sàn (đã có trong studio), giả định FOV 55–65°, có thanh chỉnh |

## 3. Checklist thư viện và model

### 3.1 Frontend 3D (chỉ nạp khi mở studio)

| Thư viện | Phiên bản | Chức năng | Lý do |
|---|---|---|---|
| `three` | 0.183.x (đã cài) — `@google/model-viewer` 4.4 yêu cầu three `^0.183`, nên không dùng 0.187 | Render 3D, `GLTFLoader`, `DRACOLoader`, `KTX2Loader`, `MeshoptDecoder`, `Raycaster`, `ShadowMaterial` | Lõi 3D |
| `@react-three/fiber` | 9.8.2 | Three.js dạng component React | Hợp kiến trúc widget React. Yêu cầu React `>=19 <19.4`; dự án đang 19.3.1. **Không nâng React lên 19.4** trước khi fiber hỗ trợ |
| `@react-three/drei` | 10.7.9 | `useGLTF`, `OrbitControls`, `ContactShadows`, `Environment`, `Bounds`, `Html` | Tiết kiệm việc viết loader, bóng, camera |
| `@react-three/xr` | 6.6.32 | WebXR AR (Android Chrome) | Tuỳ chọn: chỉ khi muốn AR ngay trong canvas |
| `@google/model-viewer` | bản mới nhất | Nút "Xem trong phòng bằng camera" cho từng món | Đường ngắn nhất tới AR, hỗ trợ cả iOS qua USDZ |
| `zustand` | bản mới nhất | Trạng thái cảnh (món, vị trí, xoay, món đang chọn) | Mặc định của hệ R3F, tránh render lại cả cây |
| Kéo thả trên sàn | tự viết | Raycast con trỏ xuống mặt phẳng sàn, ghim theo lưới 5 cm, va chạm bằng hộp bao | Đã có logic tương đương ở `src/bots/furniture/vision/placement.ts` (dùng lại luật trong/ngoài phòng, chồng nhau) |

### 3.2 Xử lý mô hình 3D phía server / admin

| Thư viện | Chức năng | Lý do |
|---|---|---|
| `@gltf-transform/core`, `@gltf-transform/functions`, `@gltf-transform/extensions` | Kiểm tra, nén (Draco/Meshopt), gộp mesh, giảm texture | Giữ mỗi GLB < 5 MB, đọc kích thước bao để đối chiếu số đo của shop |
| `meshoptimizer` | Nén lưới | Đi cùng gltf-transform |
| `sharp` | Đổi texture sang WebP, tạo ảnh xem trước | Nhẹ hơn cho điện thoại |
| Kho file hiện có (`FileStorage`: local / Cloudflare R2) | Lưu `.glb`, ảnh tách nền | Không cần kho mới |

### 3.3 Model AI

| Model | Giấy phép | Chạy ở đâu | Chức năng | Trạng thái |
|---|---|---|---|---|
| `Xenova/slimsam-77-uniform` | Apache-2.0 | Trình duyệt | Tách vùng sàn | Đã có |
| `onnx-community/depth-anything-v2-small` | Apache-2.0 | Trình duyệt | Độ sâu: che khuất đồ mới sau đồ cũ, ước lượng độ cao camera | Đã tải, chưa dùng |
| `Xenova/clip-vit-base-patch32` | MIT | Trình duyệt + server | Phong cách/loại phòng. Embedding ảnh sản phẩm cho tìm "món giống ảnh" và chấm hợp phong cách | Đã có (trình duyệt) |
| `Xenova/detr-resnet-50` | Apache-2.0 | Trình duyệt | Nhận đồ đã có trong phòng | Đã có |
| `onnx-community/BiRefNet_lite-ONNX` | MIT | Trình duyệt của admin, lúc nhập sản phẩm | Tách nền ảnh sản phẩm thật | **Cần tải**: nền tảng cho mức "chỉ có ảnh" |
| `Carve/LaMa-ONNX` | Apache-2.0 | Trình duyệt máy tính / server | Xoá đồ cũ khỏi ảnh phòng | Giai đoạn sau |
| `microsoft/TRELLIS.2-4B` | MIT | GPU thuê theo giờ, offline | Ảnh sản phẩm → GLB (shop duyệt trước khi dùng) | Tuỳ chọn, bán thêm |
| ~~`briaai/RMBG-1.4`, `RMBG-2.0`~~ | Giấy phép riêng của Bria, cấm dùng thương mại nếu không mua | — | Tách nền | **Không dùng** |
| ~~YOLOv8~~ | AGPL-3.0 | — | Nhận diện | **Không dùng** |

### 3.4 Dữ liệu

| Thành phần | Chức năng |
|---|---|
| Extension `pgvector` + gói npm `pgvector` (0.3.1) | Cột `embedding vector(512)` cho ảnh sản phẩm (CLIP); tìm theo ảnh và theo ngữ nghĩa |
| Bảng `furniture.items` thêm cột | `model_url` (GLB), `cutout_url` (ảnh tách nền), `collection`, `materials`, `embedding` |
| Bảng `furniture.pairings` | Món hợp nhau / cùng bộ, để gợi ý trọn bộ thay cho Neo4j |
| Bảng `furniture.designs` | Phương án khách lưu (JSON toạ độ + ảnh), link chia sẻ, gắn vào lead |

## 4. Lộ trình đề xuất

| Giai đoạn | Việc | Kết quả khách thấy | Rủi ro |
|---|---|---|---|
| **P1 — Ảnh thật thay hình vẽ** | Admin tải ảnh sản phẩm → BiRefNet tách nền ngay trên trình duyệt → lưu `cutout_url`. Studio dựng ảnh thật đứng trên sàn, đúng kích thước, có bóng | Sofa thật của shop trong ảnh phòng khách | Ảnh chụp góc nghiêng thì phối cảnh lệch. Hướng dẫn shop chụp chính diện |
| **P2 — GLB + AR** | Upload GLB (nén, kiểm tra kích thước); chế độ 3D trong studio (R3F, kéo thả trên sàn, xoay góc nhìn); đặt GLB vào ảnh phòng bằng camera giải từ homography; nút AR `model-viewer` trên thẻ sản phẩm | Xoay xem 3D, đặt vào phòng thật bằng camera | Shop phải có GLB. Cần hướng dẫn xuất từ SketchUp/3ds Max/Blender |
| **P3 — Tìm kiếm thông minh** | pgvector + CLIP embedding; "tìm món giống ảnh này"; bảng pairings cho gợi ý trọn bộ | Khách gửi ảnh Pinterest → món tương tự của shop | Thấp |
| **P4 — Tuỳ chọn** | LaMa xoá đồ cũ; depth để che khuất; TRELLIS.2 tạo GLB từ ảnh cho shop (bán thêm) | Ảnh phối cảnh "sạch" hơn | Chi phí GPU, chất lượng mô hình AI không đều |

Ước lượng tải thêm khi mở studio: three + fiber + drei khoảng 250–400 KB gzip; mỗi GLB đã nén 1–5 MB; BiRefNet_lite chỉ tải ở trang admin.

## 5. Trạng thái triển khai (2026-11-07)

| Giai đoạn | Đã làm | Ghi chú / khác kế hoạch |
|---|---|---|
| **P1 ảnh thật tách nền** | Trang admin sản phẩm: tải ảnh → **SlimSAM** (không phải BiRefNet) tách nền ngay trên trình duyệt, chạm thêm điểm xanh/đỏ để sửa, lưu PNG trong suốt; studio dựng ảnh thật lên sàn, lỗi tải ảnh thì quay về hình vẽ | BiRefNet_lite chỉ có bản fp16 (114 MB) / fp32 (224 MB), không có int8 chạy được trên WASM; SlimSAM đã tải sẵn, giấy phép Apache-2.0, kết quả tốt với ảnh sản phẩm nền đơn giản |
| **P2 GLB + 3D + AR** | Tải .glb (route `/api/admin/furniture/upload`, tối đa 40 MB, kiểm định dạng + kích thước bao + số tam giác, cảnh báo lệch > 15% so với số đo); studio có chế độ **Phòng 3D** (three + react-three-fiber: kéo thả ghim 5 cm, xoay phòng, GLB tự xoay 90° và co giãn theo số đo, ảnh thật dựng tấm đứng, còn lại là khối hộp); thẻ sản phẩm có nút **Xoay 3D · xem bằng camera** (model-viewer, AR) | Chưa đặt GLB lên *ảnh phòng* bằng camera giải từ homography (đang kê 3D trong phòng dựng sẵn) |
| **P3 tìm theo ảnh + món đi kèm** | Vector CLIP của ảnh sản phẩm (tính ở trình duyệt khi tải ảnh; `npm run embed:catalog` cho dữ liệu cũ); khách gửi ảnh mẫu → API `/x/similar` → món giống nhất; cột `collection`, `pairs`; tool `suggest_pairs`; `design_room` cộng điểm món cùng bộ | Lưu vector dạng jsonb + cosine trong JS thay vì pgvector: danh mục vài nghìn món là đủ, không phụ thuộc extension (PGlite lẫn Supabase). Chuyển pgvector khi danh mục > ~20.000 món |
| **P5 xoay tự do + đồ thật (2026-11-07)** | Studio dựng GLB thành tem ở góc xoay bất kỳ, camera trực giao cùng độ chúi với ảnh (`vision/modelSprite.ts`), dán lên ảnh phòng; nút tròn kéo để xoay + thanh trượt; demo dùng 18 mô hình quét CC0 (Poly Haven) từ `scripts/fetch-demo-furniture.mjs` | Chiếu sáng tem là cố định (môi trường phòng chuẩn), chưa khớp ánh sáng ảnh; màu vật liệu chính đã nhuộm theo `color` catalogue (`vision/tint.ts`), nhưng món nhiều vật liệu chỉ nhuộm phần lớn nhất |
| **P4 tạo 3D từ ảnh** | Nút "Tạo 3D nháp bằng AI" (admin) → `/api/admin/furniture/model` → máy chủ GPU riêng theo hợp đồng ở `scripts/trellis-worker/README.md`; kết quả vào trạng thái **review** (khách không thấy) tới khi nhân viên tick Duyệt; có `mock-server.mjs` để thử cả luồng | Chưa dựng worker TRELLIS.2 thật (cần GPU). Biến môi trường `TRELLIS_API_URL`, `TRELLIS_API_KEY` |

Dữ liệu demo: 18 món có ảnh tách nền (SVG vẽ theo số đo) và mô hình 3D mẫu dựng từ khối cho sofa/bàn/kệ, kèm bộ sưu tập và món đi kèm.
Kho file: `FileStorage` (R2 hoặc đĩa) — thêm `.glb` (`model/gltf-binary`).
