import { cement, marble, pattern, terrazzo, wood } from "./textures";

/** Dữ liệu demo của shop "Gạch Đẹp Demo" — chỉ nạp cho shop demo */
export const DEMO_TILES = [
  { sku: "VD-6060-TR", desc: "Gạch bóng kiếng vân đá Carrara trắng xám, bề mặt men bóng phản chiếu ánh sáng giúp phòng khách và phòng ngủ trông rộng hơn. Thân gạch porcelain độ hút nước thấp, bền màu. Phù hợp lát sàn khu vực khô ráo; không khuyến nghị cho lối đi ướt vì bề mặt bóng dễ trơn.", name: "Vân đá Carrara trắng", w: 600, h: 600, ppb: 4, price: 245_000, finish: "glossy", usage: ["floor", "wall"], style: "vân đá hiện đại sang trọng", color: "trắng xám", stock: 320, svg: () => marble(11, "#f1efeb", "#7d7a75") },
  { sku: "VD-8080-KEM", desc: "Vân đá Botticino tông kem ấm, bề mặt mờ chống trơn nhẹ, kích thước lớn 80x80 ít mạch ron nên không gian liền mạch. Hợp phòng khách, hành lang, cửa hàng. Phong cách cổ điển – tân cổ điển.", name: "Vân đá Botticino kem", w: 800, h: 800, ppb: 3, price: 315_000, finish: "matte", usage: ["floor"], style: "vân đá cổ điển ấm áp", color: "kem be", stock: 180, svg: () => marble(23, "#e6d7bf", "#a88b66") },
  { sku: "VD-6012-DEN", desc: "Vân đá Marquina nền đen gân trắng, khổ lớn 60x120, bề mặt bóng sang trọng. Thường dùng làm điểm nhấn: sảnh, tường TV, mặt tiền quầy. Nên kết hợp ron đen để tạo cảm giác liền khối.", name: "Vân đá Marquina đen", w: 600, h: 1200, ppb: 2, price: 420_000, finish: "glossy", usage: ["floor", "wall"], style: "vân đá sang trọng cao cấp", color: "đen", stock: 60, svg: () => marble(37, "#1f1f22", "#e8e6e1", 512, 1024) },
  { sku: "VG-1520-SOI", desc: "Gạch vân gỗ sồi tự nhiên dạng thanh 15x80, bề mặt mờ có vân nổi nhẹ, ấm chân và chống trơn tốt. Giữ được vẻ ấm cúng của sàn gỗ nhưng không sợ nước, mối mọt, cong vênh. Hợp phòng ngủ, phòng khách, quán cà phê. Thường lát kiểu xương cá hoặc so le.", name: "Vân gỗ sồi tự nhiên", w: 150, h: 800, ppb: 10, price: 210_000, finish: "matte", usage: ["floor"], style: "vân gỗ ấm cúng tối giản", color: "nâu vàng", stock: 400, svg: () => wood(5, "#c79a64", "#6e4a26") },
  { sku: "VG-2012-OC", desc: "Vân gỗ óc chó tông nâu đậm, thanh dài 20x120 mạnh mẽ, bề mặt mờ. Mang lại cảm giác sang trọng, hiện đại; hợp phòng khách rộng và căn hộ cao cấp.", name: "Vân gỗ óc chó", w: 200, h: 1200, ppb: 6, price: 265_000, finish: "matte", usage: ["floor"], style: "vân gỗ hiện đại", color: "nâu đậm", stock: 150, svg: () => wood(9, "#6b4a33", "#2e1d12") },
  { sku: "XM-6060-GH", desc: "Gạch giả xi măng màu ghi sáng, bề mặt mờ, dùng được cả lát sàn lẫn ốp tường. Phong cách công nghiệp tối giản, dễ phối với nội thất gỗ. Màu trung tính che bụi tốt, vệ sinh dễ.", name: "Xi măng ghi sáng", w: 600, h: 600, ppb: 4, price: 185_000, finish: "matte", usage: ["floor", "wall"], style: "xi măng công nghiệp tối giản", color: "xám ghi", stock: 500, svg: () => cement(3, "#a9a8a3") },
  { sku: "XM-3060-TR", desc: "Gạch ốp tường men trắng sữa 30x60, bề mặt bóng dễ lau chùi, thường dùng cho phòng tắm và bếp. Trắng sáng giúp không gian nhỏ thoáng hơn. Chỉ dùng ốp tường, không lát sàn.", name: "Ốp tường men trắng sữa", w: 300, h: 600, ppb: 8, price: 155_000, finish: "glossy", usage: ["wall"], style: "tối giản phòng tắm bếp", color: "trắng", stock: 600, svg: () => cement(7, "#f4f2ee") },
  { sku: "TZ-6060-MX", desc: "Gạch terrazzo hạt màu trên nền trắng ngà, bề mặt mờ, phong cách trẻ trung. Dùng cho quán cà phê, showroom, căn hộ phong cách Bắc Âu; lát sàn hay ốp tường đều đẹp.", name: "Terrazzo hạt màu", w: 600, h: 600, ppb: 4, price: 275_000, finish: "matte", usage: ["floor", "wall"], style: "terrazzo trẻ trung", color: "trắng nhiều màu", stock: 90, svg: () => terrazzo(13, "#ece8e1", ["#c9573f", "#5d7f8c", "#d9a441", "#8b8a86", "#2f2f2f"]) },
  { sku: "BT-2020-XD", desc: "Gạch bông họa tiết xanh dương – trắng kiểu Đông Dương 20x20, bề mặt mờ. Thường lát làm thảm điểm nhấn hoặc ốp tường quầy bar, bếp. Số viên/thùng nhiều nên báo giá theo thùng 25 viên.", name: "Gạch bông xanh Đông Dương", w: 200, h: 200, ppb: 25, price: 330_000, finish: "matte", usage: ["floor", "wall"], style: "gạch bông cổ điển Đông Dương", color: "xanh dương trắng", stock: 120, svg: () => pattern("#eef0ec", "#2c5d8f") },
  { sku: "XM-6060-DEN", desc: "Xi măng đen than bề mặt nhám chống trơn, hợp ban công, sân thượng, cầu thang ngoài trời. Hiện tạm hết hàng — khách có thể để lại số điện thoại để được báo khi có hàng.", name: "Xi măng đen than", w: 600, h: 600, ppb: 4, price: 195_000, finish: "textured", usage: ["floor"], style: "xi măng công nghiệp nhám chống trơn", color: "đen xám", stock: 0, svg: () => cement(19, "#3a3a3c") },
] as const;

export const DEMO_TILE_SERVICES = [
  { name: "Khảo sát & đo đạc tại nhà (miễn phí nội thành)", durationMin: 60, price: 0, desc: "Kỹ thuật viên đến đo diện tích, kiểm tra nền, tư vấn kiểu lát và lượng vật tư." },
  { name: "Tư vấn trực tiếp tại showroom", durationMin: 45, price: 0, desc: "Xem mẫu thật, so màu dưới ánh sáng phòng, nhận báo giá chi tiết." },
];

export const DEMO_TILE_KNOWLEDGE = `GIAO HÀNG
- Miễn phí giao hàng nội thành TP.HCM cho đơn từ 20 m². Đơn nhỏ hơn: 150.000đ/chuyến.
- Tỉnh lân cận: báo phí theo khoảng cách, giao trong 1–3 ngày.

ĐỔI TRẢ
- Đổi trả gạch nguyên thùng, chưa bóc, trong 7 ngày. Gạch đã cắt, đã thi công không đổi trả.
- Hỗ trợ đổi gạch lỗi men, sứt mẻ khi nhận hàng (chụp ảnh lúc nhận).

THI CÔNG
- Shop giới thiệu đội thợ quen, báo giá nhân công theo m² sau khi khảo sát.
- Nên mua dư 1 thùng cùng lô để thay thế khi cần.

THANH TOÁN
- Đặt cọc 30% khi lên đơn, thanh toán phần còn lại khi nhận hàng. Chuyển khoản hoặc tiền mặt.

SHOWROOM
- Mở cửa 8h–20h mỗi ngày, có bãi đỗ xe ô tô.`;

export const DEMO_TILE_QUESTIONS = [
  { text: "Phòng khách 25m2 nên lát gạch gì", label: "needs_consult", topic: "gạch phòng khách", need: "Chọn gạch lát phòng khách 25 m²", sentiment: "neutral", handledBy: "llm_complex" },
  { text: "Gạch vân gỗ có chống trơn không", label: "product_query", topic: "gạch vân gỗ", need: "Hỏi độ chống trơn gạch vân gỗ", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Báo giá gạch 60x60 cho 40m2", label: "product_query", topic: "báo giá gạch 60x60", need: "Báo giá 40 m² gạch 60x60", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Có giao hàng ra Bình Dương không", label: "knowledge_query", topic: "giao hàng tỉnh", need: "Hỏi giao hàng Bình Dương", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Đặt lịch khảo sát nhà mình thứ 7", label: "booking", topic: "khảo sát tại nhà", need: "Đặt lịch khảo sát", sentiment: "neutral", handledBy: "template" },
  { text: "Có gạch ngoài trời cho sân thượng không", label: "product_query", topic: "gạch sân thượng", need: "Tìm gạch lát sân thượng", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Shop có bán bồn cầu không", label: "product_query", topic: "thiết bị vệ sinh", need: "Tìm thiết bị vệ sinh", sentiment: "neutral", handledBy: "llm_simple", unanswered: true },
  { text: "Giá nhân công lát bao nhiêu 1m2", label: "knowledge_query", topic: "giá nhân công", need: "Hỏi giá nhân công lát gạch", sentiment: "neutral", handledBy: "handoff", unanswered: true },
  { text: "Gạch giao bị mẻ mấy viên, xử lý sao", label: "complaint", topic: "gạch bị mẻ", need: "Phản ánh gạch giao bị mẻ", sentiment: "negative", handledBy: "handoff", unanswered: true },
  { text: "Gạch bông có hợp lát bếp không", label: "needs_consult", topic: "gạch bông nhà bếp", need: "Tư vấn gạch bông cho bếp", sentiment: "neutral", handledBy: "llm_complex" },
];
