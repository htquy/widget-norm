# Máy chủ tạo 3D từ ảnh (TRELLIS.2)

Widget Norm không chạy TRELLIS trực tiếp (cần GPU NVIDIA khoảng 24 GB VRAM). Bạn dựng một dịch vụ HTTP nhỏ trên máy GPU
(Modal, RunPod, Replicate, hoặc máy riêng) và đặt `TRELLIS_API_URL` (+ `TRELLIS_API_KEY`) trong `.env.local`.

## Hợp đồng HTTP

```
POST {TRELLIS_API_URL}/generate     body: { "image_base64": "...", "mime": "image/png" }   → { "job_id": "..." }
GET  {TRELLIS_API_URL}/jobs/{id}                                                       → { "status": "pending|running|done|failed",
                                                                                           "glb_base64": "..."  (hoặc "glb_url": "https://..."),
                                                                                           "error": "..." }
Header: Authorization: Bearer {TRELLIS_API_KEY}   (nếu có)
```

- Địa chỉ phải là HTTPS (trừ `localhost` khi thử).
- `.glb` trả về: đơn vị mét, đáy chạm y = 0 càng tốt (studio tự co giãn theo số đo trong danh mục).
- Mô hình sinh ra luôn ở trạng thái **chờ duyệt**: chỉ hiện trong trang admin cho tới khi nhân viên tick "Duyệt".

## Thử không cần GPU

```bash
node scripts/trellis-worker/mock-server.mjs
# .env.local:  TRELLIS_API_URL=http://localhost:8787
```

## Dựng worker thật

Model: `microsoft/TRELLIS.2-4B` (MIT, kể cả file sinh ra). Làm theo README của repo
https://github.com/microsoft/TRELLIS.2 để cài đặt, rồi bọc `pipeline.run(image)` + xuất `.glb` bằng FastAPI theo hợp đồng trên.
Gợi ý vận hành: độ chi tiết 512³ (vài giây/món trên H100), nén kết quả bằng `gltf-transform optimize` trước khi trả; giới hạn một
công việc chạy cùng lúc mỗi GPU; tắt máy khi rảnh (serverless GPU tính tiền theo giây).
Chất lượng: ảnh một mặt nên mặt sau là AI đoán; chân mảnh, mây đan, kính, kim loại bóng dễ sai — luôn xem lại trước khi duyệt.
