# AVI: thiết kế sản phẩm và lõi dùng chung

## Hướng thiết kế

- Hub: nền trắng `#ffffff`, mực `#202436`, iris `#5f45e4`, lavender `#f1f0ff`, mint `#d9f3e8`. Hero trình diễn workspace thật, bố cục có nhịp điệu thay vì một lưới thẻ đồng đều.
- AVI: phong cách trợ lý bán lẻ thân thiện, sắc tím, chat và sản phẩm làm trung tâm. Đa ngành: thời trang, phụ kiện, gia dụng, quà tặng, dịch vụ.
- Bot gạch: phong cách material studio, xanh blueprint `#15476d`, nền giấy `#f2f5f5`, hình không gian lát gạch và bảng mẫu vật liệu; typography lớn, bố cục bất đối xứng.
- Admin: workspace có sidebar tối, header ngữ cảnh, khu thử chatbot riêng, checklist thiết lập, bảng số liệu có khoảng thở. Geist cho giao diện; serif chỉ dùng tiêu đề studio gạch.
- Không bịa số liệu khách hàng; dữ liệu mẫu luôn gắn nhãn. Nút ít nhất 44px, mobile không tràn ngang, có focus và reduced motion.

## Kiến trúc

`AVI Core` là tập capability dùng chung, không phải bản sao một bot. Engine sở hữu booking, knowledge, CRM, live chat, analytics, guard. Module store cung cấp capability catalogue qua port. `composeWithAvi(core, extension)` gộp tools, prompt, grounding, cards và lifecycle. Bot gạch chỉ định nghĩa nghiệp vụ gạch và kế thừa catalogue chung. Giữ `store` làm khóa dữ liệu để không phá tenant cũ; thương hiệu và URL công khai là AVI.

Danh mục sản phẩm vẫn ở schema store và chỉ repository của module store truy cập. Bot ngành dùng capability qua `BotModule`, không join schema. Engine không có nhánh điều kiện theo ngành.

## Tài khoản, domain, thanh toán

`skill-pages` là identity/payment/gateway provider. OAuth2 PKCE S256, state + verifier cookie HttpOnly có thời hạn; liên kết bằng subject của hub, không tin email client. Token hub được mã hóa ở server để kiểm tra entitlement sau đăng nhập và trong widget.

Domain được chuẩn hóa (IDN, chữ thường, bỏ www và dấu chấm cuối), khóa unique toàn nền tảng. Một domain có một chủ tài khoản, không reset trial khi thêm bot hay đổi email. Chủ domain xác minh DNS TXT trước khi nhúng vào production. Không fetch URL do người dùng nhập để xác minh (tránh SSRF). Mã nhúng chỉ hoạt động trên domain đã xác minh; preview admin dùng session sở hữu bot.

Giá nguồn duy nhất theo loại bot. Quyền trả phí luôn kiểm tra từ hub; không dùng query `paid=true`, email hay dữ liệu localStorage để kích hoạt. Gói hub cần được cấu hình tương ứng trước khi chạy thật.

## Phụ thuộc triển khai

Cần URL hub, OAuth client + redirect URI đã đăng ký, cấu hình app/gói giá trên hub, API key gateway nếu bật AI trung tâm và DNS TXT của domain khách. Không tự tạo giao dịch thanh toán thật trong quá trình kiểm thử.

## Nguồn thiết kế đã tham khảo

- [frontend-design chính chủ Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design): đã cài vào `.claude/skills/frontend-design`, áp dụng bố cục theo nội dung và nhận diện riêng từng bot.
- [Linear Asks](https://linear.app/asks) và [Customer Requests](https://linear.app/docs/customer-requests): tham khảo cấu trúc workspace, điều hướng và ngữ cảnh khách hàng; không sao chép giao diện.
- [Florim Visualizer](https://visualizer.florim.com/?lang=en): tham khảo cách đặt không gian và vật liệu làm trọng tâm. Minh họa phòng trong repo là SVG tự viết, không dùng ảnh thương mại của bên thứ ba.

## Cấu hình chạy thật

1. Đảm bảo `PUBLIC_BASE_URL` đúng origin đang chạy (kể cả cổng ở local). Không dùng URL khác cổng của dev server cho callback.
2. Trên `skill-pages`, đăng ký OAuth client cho Widget Norm, callback `<PUBLIC_BASE_URL>/api/auth/hub/callback`, scope `openid profile email orders:read orders:write`, PKCE `S256`. Public client không cần secret; confidential client phải đặt `HUB_CLIENT_SECRET`.
3. Tạo hai app đang hoạt động: `avi` và `avi-tile` (hoặc đặt lại `HUB_APP_AVI`, `HUB_APP_TILE`). Gói tháng Cơ bản: AVI **199.000đ**, AVI Gạch **499.000đ**. Các giá `proMonthly` chỉ phục vụ tương thích cấu hình cũ, chưa quảng bá khi hạn mức theo tin nhắn chưa triển khai.
4. Điền `HUB_BASE_URL`, `HUB_CLIENT_ID` vào widget. Khi bật client ID, tạo bot mới bắt buộc qua tài khoản trung tâm. Phiên local có sẵn được chuyển qua SSO để liên kết và giữ nguyên workspace/bot; liên kết cần cả phiên local và phiên hub. Khi bật SSO, form mật khẩu local bị ẩn và server action local login không còn xác thực bằng mật khẩu. Bảng user, session và OAuth dùng chung của skill-pages là nguồn danh tính; `public.accounts` ở widget chỉ là metadata workspace và liên kết bằng subject.
5. Cấu hình SePay/VietQR ở hub bằng module sẵn có. Trong **Domain & thanh toán**, chọn gói và tạo QR. Widget gọi API `/api/apps/:slug`, `POST /api/orders`, `POST /api/orders/:id/payment`, `GET /api/orders/:id/status` bằng Bearer SSO server-side. Trạng thái PAID được đối chiếu entitlement rồi tự kích hoạt. Không truyền API token hay tin giá/trạng thái từ trình duyệt. Một subscription app của hub gắn một bot đang chọn; chuyển kích hoạt sẽ dừng quyền của bot cùng loại trước đó sau khi trial hết hạn. Widget kiểm tra lại quyền từ hub khi phục vụ, không chỉ kiểm tra lúc kích hoạt.
6. AI: tạo client gateway có quyền TEXT/OpenRouter trên hub, đặt key client vào `HUB_GATEWAY_KEY`; key nhà cung cấp nằm tại hub, không gửi xuống trình duyệt hoặc widget. Cả model trả lời và tầng jev đi qua hub khi có cấu hình này. Không có gateway thì đường trực tiếp cũ/rules vẫn dùng được cho dev.
7. Khách đăng ký domain ở workspace, thêm TXT `_avi-verify.<domain>` với giá trị hiển thị, bấm xác minh để kết nối bot. Chỉ origin đã xác minh được lưu vào cài đặt; domain đã xác minh không hết hạn để tránh nhận lại trial bằng email khác. Giữ chỗ chưa xác minh hết hạn sau 24h. Domain chuyển chủ cần quy trình hỗ trợ, không tự reset trial.

Migration idempotent chạy khi khởi động, có xử lý kết nối dev được giữ bởi HMR. Chỉ fixture `lumi-demo` / tên Lumi Beauty / account `admin@demo.vn` được thay danh mục, dịch vụ và phân tích mẫu bằng dữ liệu AVI, đổi slug `avi-demo`; dữ liệu tenant khách hàng không bị chuyển đổi.

Kiểm tra: `npm run typecheck`, `npm test`, `npm run build`. Build mặc định dùng Webpack vì Turbopack 16.4.5 đang panic ở PostCSS trên máy này; có thể thử lại bằng `npm run build:turbo`. Test gateway tại hub: `npx tsx --test tests/avi-gateway.test.ts tests/api-user.test.ts`, `npx tsc --noEmit --incremental false`.

Local đã cấu hình `HUB_BASE_URL=http://localhost:3000`, `HUB_CLIENT_ID=widget-norm`, `PUBLIC_BASE_URL=http://localhost:3001`. Client/callback và hai gói tháng đã đăng ký vào hub. Để cài môi trường khác: trong skill-pages chạy `npx tsx --env-file-if-exists=.env --env-file-if-exists=.env.local scripts/setup-widget-norm.ts --apply` với `WIDGET_NORM_BASE_URL` phù hợp. Đăng nhập thật dùng cơ chế trung tâm; không có tài khoản/mật khẩu riêng ở widget. Chưa thực hiện chuyển tiền thật. Route policy, model fallback chain tại hub, tenant usage/quota và rate limit nhiều instance vẫn là các mốc tiếp theo trong `PLAN-LLM.md`.
