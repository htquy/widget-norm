import type { PricingRule } from "./estimate";

/** Fictional multi-category retail data; only used by the demo account. */
export const DEMO_PRODUCTS: {
  sku: string;
  name: string;
  category: string;
  price: number;
  tags: string[];
  desc: string;
  inStock?: boolean;
  pricing?: PricingRule;
}[] = [
  {
    sku: "AVI-SON",
    name: "Sơn nội thất Mịn Màng 18L",
    category: "Vật liệu",
    price: 1_650_000,
    tags: ["sơn", "nội thất", "sơn tường"],
    desc: "Sơn nội thất lau chùi được, thùng 18 lít, 1 thùng phủ khoảng 120 m² một lớp. Nên sơn 2 lớp hoàn thiện sau 1 lớp lót. Có dịch vụ thi công trọn gói.",
    pricing: { model: "coverage", unit: "thùng", coveragePerUnit: 120, coats: 2, wastePercent: 5, addons: [{ label: "Công thi công", per: "area", price: 25_000 }] },
  },
  {
    sku: "AVI-SAN",
    name: "Sàn gỗ công nghiệp Oak 12mm",
    category: "Vật liệu",
    price: 289_000,
    tags: ["sàn gỗ", "lát sàn", "gỗ công nghiệp"],
    desc: "Sàn gỗ công nghiệp dày 12mm, chống ẩm, bề mặt vân gỗ sồi. Giá theo m². Có thi công kèm phào và len chân tường.",
    pricing: { model: "per_area", wastePercent: 7, minAreaM2: 10, addons: [{ label: "Công thi công + phụ kiện", per: "area", price: 45_000 }] },
  },
  {
    sku: "AVI-REM",
    name: "Rèm vải Linen cản sáng",
    category: "Nội thất",
    price: 180_000,
    tags: ["rèm", "rèm cửa", "linen"],
    desc: "Vải linen cản sáng 90%, khổ 2,8m. Giá theo mét dài vải. Rèm nhún gấp 2 lần chiều rộng cửa. Bao gồm may và ray treo.",
    pricing: { model: "per_length", foldFactor: 2, wastePercent: 5, addons: [{ label: "Công may và phụ kiện", per: "quantity", price: 40_000 }] },
  },
  {
    sku: "AVI-DP",
    name: "Áo đồng phục Polo Corp",
    category: "Đồng phục",
    price: 150_000,
    tags: ["đồng phục", "áo polo", "in logo"],
    desc: "Polo cá sấu, may theo size tập thể, thêu logo ngực. Giá theo số lượng, càng nhiều càng rẻ. Giao trong 10 ngày.",
    pricing: { model: "per_unit", unit: "áo", tiers: [{ minQty: 20, price: 135_000 }, { minQty: 50, price: 120_000 }, { minQty: 100, price: 105_000 }], addons: [{ label: "Thêu logo", per: "quantity", price: 15_000 }] },
  },
  {
    sku: "AVI-BGN",
    name: "Bình giữ nhiệt Everyday 500ml",
    category: "Gia dụng",
    price: 249_000,
    tags: ["quà tặng", "giữ nhiệt", "500ml"],
    desc: "Inox 304, dung tích 500ml, giữ nóng 6 giờ, giữ lạnh 12 giờ. Có hộp quà, màu kem và xanh. Bảo hành 6 tháng lỗi nhà sản xuất.",
  },
  {
    sku: "AVI-TOTE",
    name: "Túi tote Canvas Daily",
    category: "Phụ kiện",
    price: 159_000,
    tags: ["túi", "quà tặng", "canvas"],
    desc: "Vải canvas dày, kích thước 35 × 40cm, có ngăn trong và khóa nam châm. Màu trắng ngà, giặt tay với nước lạnh.",
  },
  {
    sku: "AVI-TEE",
    name: "Áo thun Essential Cotton",
    category: "Thời trang",
    price: 199_000,
    tags: ["áo", "cotton", "unisex"],
    desc: "Cotton 100%, dáng unisex, size S đến XL. Ba màu trắng, đen, xanh navy. Đổi size trong 7 ngày khi còn tem.",
  },
  {
    sku: "AVI-LAMP",
    name: "Đèn bàn Focus",
    category: "Gia dụng",
    price: 459_000,
    tags: ["đèn", "bàn học", "làm việc"],
    desc: "Đèn LED 3 chế độ ánh sáng, nguồn USB-C, điều chỉnh độ sáng cảm ứng. Bảo hành 12 tháng, không kèm củ sạc.",
  },
  {
    sku: "AVI-HUB",
    name: "Hub USB-C Connect 4 cổng",
    category: "Công nghệ",
    price: 329_000,
    tags: ["usb", "laptop", "phụ kiện"],
    desc: "Gồm 2 USB-A, HDMI 4K 30Hz, USB-C PD 60W. Máy cần hỗ trợ xuất hình qua USB-C để dùng HDMI.",
  },
  {
    sku: "AVI-BOX",
    name: "Hộp quà Warm Wishes",
    category: "Quà tặng",
    price: 289_000,
    tags: ["quà tặng", "sinh nhật", "hộp quà"],
    desc: "Một sổ tay A5, một bút kim loại và thiệp viết tay. Ghi lời chúc miễn phí, gói trong hộp giấy kraft.",
  },
];
export const DEMO_SERVICES = [
  {
    name: "Tư vấn chọn sản phẩm",
    durationMin: 30,
    price: 0,
    desc: "Nhân viên giúp chọn sản phẩm theo nhu cầu và ngân sách. Không bắt buộc mua hàng.",
  },
  {
    name: "Hẹn xem sản phẩm tại shop",
    durationMin: 30,
    price: 0,
    desc: "Đến cửa hàng xem mẫu thật và thử sản phẩm.",
  },
  {
    name: "Tư vấn quà tặng doanh nghiệp",
    durationMin: 60,
    price: 0,
    desc: "Trao đổi số lượng, ngân sách và đóng gói; nhân viên xác nhận báo giá sau buổi tư vấn.",
  },
];
export const DEMO_KNOWLEDGE = `GIAO HÀNG
- Nội thành TP.HCM: phí 20.000đ; miễn phí cho đơn từ 500.000đ.
- Tỉnh thành khác: 2–4 ngày, phí 30.000đ; miễn phí cho đơn từ 800.000đ.
- Hỗ trợ COD toàn quốc.

ĐỔI TRẢ
- Đổi size và đổi sản phẩm trong 7 ngày nếu còn tem, chưa sử dụng và có hóa đơn.
- Sản phẩm lỗi do nhà sản xuất: shop kiểm tra và hỗ trợ đổi hàng.

BẢO HÀNH
- Theo từng sản phẩm trong danh mục. Không hứa bảo hành khi danh mục chưa có thông tin.

THANH TOÁN
- Tiền mặt, chuyển khoản hoặc COD. Chưa hỗ trợ trả góp.

ĐẶT LỊCH
- Tư vấn sản phẩm, xem mẫu và tư vấn quà doanh nghiệp miễn phí. Khách báo trước khi đổi lịch.

ĐƠN HÀNG
- Tra cứu đơn hàng cần nhân viên kiểm tra. Bot không truy cập hệ thống vận chuyển.`;
export const DEMO_QUESTIONS = [
  {
    text: "Có quà tặng nào dưới 300.000đ?",
    label: "product_query",
    topic: "quà tặng",
    need: "Tìm quà dưới 300.000đ",
    sentiment: "neutral",
    handledBy: "llm_simple",
  },
  {
    text: "Áo cotton có size XL không?",
    label: "product_query",
    topic: "size áo",
    need: "Hỏi size áo cotton",
    sentiment: "neutral",
    handledBy: "llm_simple",
  },
  {
    text: "Ship ra Hà Nội mất mấy ngày?",
    label: "knowledge_query",
    topic: "giao hàng",
    need: "Hỏi thời gian giao",
    sentiment: "neutral",
    handledBy: "llm_simple",
  },
  {
    text: "Đặt lịch ghé xem sản phẩm cuối tuần",
    label: "booking",
    topic: "đặt lịch",
    need: "Hẹn ghé cửa hàng",
    sentiment: "neutral",
    handledBy: "template",
  },
  {
    text: "Đơn hàng của mình giao đến đâu rồi?",
    label: "not_in_data",
    topic: "đơn hàng",
    need: "Tra cứu vận chuyển",
    sentiment: "neutral",
    handledBy: "handoff",
    unanswered: true,
  },
  {
    text: "Mình nhận sai màu túi",
    label: "complaint",
    topic: "đổi trả",
    need: "Đổi túi giao sai màu",
    sentiment: "negative",
    handledBy: "handoff",
    unanswered: true,
  },
  {
    text: "Chào shop",
    label: "greeting",
    topic: "chào hỏi",
    need: "",
    sentiment: "neutral",
    handledBy: "template",
  },
  {
    text: "Cho mình gặp nhân viên",
    label: "human_request",
    topic: "gặp nhân viên",
    need: "Nhân viên tư vấn",
    sentiment: "neutral",
    handledBy: "handoff",
  },
];
