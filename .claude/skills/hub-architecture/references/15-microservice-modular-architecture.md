# Quy Chuẩn Kiến Trúc Modular Monolith Sẵn Sàng Chuyển Đổi Microservices (Microservice-Ready Rules)

---

## 1. Mục Tiêu & Triết Lý Thiết Kế
Hệ thống hiện tại được triển khai dưới mô hình **Modular Monolith** nhằm tiết kiệm tối đa chi phí vận hành hạ tầng máy chủ ban đầu, nhưng được phân tách nghiêm ngặt về mặt cấu trúc thư mục, domain logic và cơ sở dữ liệu để **có thể bóc tách thành các Microservices độc lập bất kỳ lúc nào mà không cần viết lại nghiệp vụ**.

---

## 2. Phân Chia Database Schemas (PostgreSQL Multi-Schema)
Hệ thống được tổ chức thành 5 schema độc lập trong cùng một cơ sở dữ liệu:

1. **`authentication`**:
   - `users`, `Account`, `sessions`, `VerificationToken`
   - `oauth_clients`: Đăng ký ứng dụng/tool doanh nghiệp (Desktop, Mobile, Web, Widget).
   - `oauth_authorization_codes`: Mã xác thực tạm thời hỗ trợ PKCE RFC 7636.
   - `oauth_access_tokens`: Token truy cập bảo mật (lưu trữ hash SHA-256).
   - `oauth_refresh_tokens`: Refresh token hỗ trợ cơ chế xoay vòng (token rotation).

2. **`apps`**:
   - `apps`: Danh mục sản phẩm phần mềm (Web App, Desktop Tool Windows, Mobile App, Embed Widget, MCP Server).
   - `app_menu_items`: Cấu hình danh mục menu theo từng app, phân quyền `FREE` hoặc `PAID`.
   - `features`: Định nghĩa tính năng cấp cao (VD: `FINANCIAL_REPORT`, `AI_ADVISOR`, `EXCEL_EXPORT`).
   - `subscription_plans`: Bảng giá & chu kỳ do Admin cấu hình (1 tháng, 3 tháng, 1 năm, vĩnh viễn...).
   - `plan_features`: Ràng buộc tính năng được mở trong từng gói cước.
   - `user_subscriptions`: Trạng thái gói, ngày bắt đầu, ngày hết hạn (`endsAt`), tham chiếu đơn hàng.

3. **`payment`**:
   - `orders`: Đơn đặt hàng.
   - `payment_transactions`: Giao dịch thanh toán (VietQR, SePay, thẻ).
   - `webhook_events`: Nhật ký nhận tín hiệu biến động số dư.
   - `skill_accesses`: Quyền truy cập nội dung đã mua.

4. **`catalog`**:
   - `Skill`, `SkillVersion`, `SkillPrice`: Thư viện kỹ năng AI.
   - `tools`, `tool_prices`, `tool_versions`: Danh mục công cụ & bản cài đặt.
   - `AITool`, `industries`, `skill_categories`, `UseCase`, `news_articles`, `rankings`.

5. **`audit`**:
   - `audit_logs`: Nhật ký truy vết bảo mật, hành động của người dùng và quản trị viên.

---

## 3. Quy Tắc Phân Tách Code & Controllers (Microservice-Ready)

### Quy tắc 1: Không Join Cross-Schema trong tầng Application & Domain
- Tuyệt đối **không** viết các câu lệnh truy vấn SQL hoặc Prisma `include`/`join` trực tiếp từ bảng của schema này sang bảng của schema khác qua các quan hệ lỏng lẻo.
- Mọi giao tiếp giữa các module phải thông qua **Service Interface / Facade** (VD: `AppsService` muốn kiểm tra thông tin user thì gọi `UserRepository.findById` hoặc giải mã từ Access Token).
- Khi tách Microservice: Module `apps` chỉ cần chuyển lời gọi local sang lời gọi HTTP REST/gRPC đến Microservice `authentication`.

### Quy tắc 2: Phân tách rõ ràng tầng Controllers
- Mọi logic xử lý giao thức HTTP (parsing request, headers, validation, query params, status codes, cookies) phải nằm trọn vẹn trong các **Controller Class** riêng biệt:
  - `OAuthController`: Xử lý Authorize, Token, UserInfo, Revoke, Discovery.
  - `AppsController`: Xử lý Apps catalog, Dynamic Menus, Check-Access, Admin Plan/Menu Config.
  - `PaymentController`, `OrderController`, `CatalogController`.
- Các file route của Next.js App Router (`app/api/.../route.ts`) chỉ đóng vai trò là **Routing Wrapper mỏng** (3 - 5 dòng code) chuyển tiếp trực tiếp sang hàm tương ứng của Controller.
- Khi chuyển đổi sang NestJS, Fastify, Express hoặc Hono: Chỉ cần chuyển giao Controller mà không làm ảnh hưởng tầng Domain/Application.

### Quy tắc 3: Xác thực tập trung chuẩn Doanh nghiệp SSO OAuth2 PKCE
- Toàn bộ app thứ ba, web con hoặc tool Windows kết nối vào hệ thống phải tuân theo luồng chuẩn:
  1. Client khởi tạo `code_verifier` và hash `code_challenge` (S256).
  2. Mở trình duyệt đến `/api/auth/oauth/authorize`.
  3. Người dùng đăng nhập xác nhận -> Hệ thống redirect về `redirect_uri?code=...`.
  4. Client gọi `POST /api/auth/oauth/token` gửi kèm `code_verifier` để nhận `access_token` và `refresh_token`.
  5. Mọi thao tác sau đó gửi `Authorization: Bearer <access_token>`.

### Quy tắc 4: Cổng Xác Minh Bản Quyền & Menu Động (Entitlement Hub)
- Endpoint xác minh tập trung: `GET /api/apps/:slug/check-access` (hoặc `/entitlement`).
- Hỗ trợ các phương thức xác thực:
  - Header `Authorization: Bearer <access_token>` (dành cho app/tool bên ngoài gọi qua OAuth2).
  - Cookie Session (dành cho Web app dùng chung domain).
  - Query parameter `?userId=...` (dành cho server-to-server có secret).
- Phản hồi chuẩn:
  ```json
  {
    "success": true,
    "data": {
      "app": { "slug": "smart-money-desktop", "name": "SmartMoney Pro Desktop" },
      "isPaid": true,
      "hasActiveSubscription": true,
      "status": "ACTIVE",
      "subscription": {
        "planName": "Gói VIP Doanh Nghiệp 1 Năm",
        "interval": "YEAR",
        "daysRemaining": 365,
        "isLifetime": false
      },
      "unlockedFeatures": ["FINANCIAL_REPORT", "EXCEL_EXPORT", "AI_ADVISOR"],
      "menus": [...]
    }
  }
  ```
- Endpoint menu động: `GET /api/apps/:slug/menus`.
  - Item có `access: "FREE"` luôn mở (`isAccessible: true, isLocked: false`).
  - Item có `access: "PAID"` tự động kiểm tra thời hạn gói và tính năng `requiredFeature`. Nếu chưa trả phí hoặc chưa có tính năng, trả về `isLocked: true, lockReason: "REQUIRE_SUBSCRIPTION"` hoặc `"REQUIRE_FEATURE"`.
