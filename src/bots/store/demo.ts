/** Dữ liệu demo của shop "Lumi Beauty" (mỹ phẩm & spa) — chỉ nạp cho shop demo */

export const DEMO_PRODUCTS: { sku: string; name: string; category: string; price: number; tags: string[]; desc: string; inStock?: boolean }[] = [
  { sku: "LM-SRM-01", name: "Sữa rửa mặt dịu nhẹ Amino 150ml", category: "Làm sạch", price: 189_000, tags: ["da nhạy cảm", "da khô"], desc: "Sữa rửa mặt gốc amino acid, pH 5.5, không xà phòng, không hương liệu. Phù hợp da nhạy cảm, da khô, da đang treatment. Dùng sáng và tối, tạo bọt nhẹ rồi massage 30 giây." },
  { sku: "LM-SRM-02", name: "Gel rửa mặt BHA kiểm soát dầu 150ml", category: "Làm sạch", price: 215_000, tags: ["da dầu", "mụn"], desc: "Gel rửa mặt chứa 0,5% BHA (salicylic acid) và kẽm PCA, giúp làm sạch sâu lỗ chân lông, giảm dầu thừa. Dành cho da dầu, da mụn. Không dùng chung với retinol nồng độ cao trong cùng buổi." },
  { sku: "LM-TN-01", name: "Toner cấp ẩm HA 200ml", category: "Toner", price: 245_000, tags: ["cấp ẩm", "mọi loại da"], desc: "Toner không cồn với 3 loại hyaluronic acid và panthenol, cấp ẩm tức thì, làm dịu da sau rửa mặt. Phù hợp mọi loại da." },
  { sku: "LM-SR-01", name: "Serum Niacinamide 10% + Zinc 30ml", category: "Serum", price: 329_000, tags: ["thâm mụn", "lỗ chân lông", "da dầu"], desc: "Serum niacinamide 10% kết hợp kẽm 1%, giúp mờ thâm mụn, se khít lỗ chân lông, điều tiết dầu. Dùng sáng/tối sau toner. Người mới dùng nên bắt đầu cách ngày." },
  { sku: "LM-SR-02", name: "Serum Vitamin C 15% sáng da 30ml", category: "Serum", price: 459_000, tags: ["sáng da", "chống oxy hoá"], desc: "Serum vitamin C (ascorbic acid 15%) + vitamin E + ferulic acid, giúp sáng da, mờ đốm nâu. Dùng buổi sáng, bắt buộc kèm kem chống nắng. Bảo quản nơi mát, tránh ánh nắng." },
  { sku: "LM-SR-03", name: "Serum Retinol 0.3% phục hồi 30ml", category: "Serum", price: 520_000, tags: ["chống lão hoá", "mụn ẩn"], desc: "Retinol 0,3% dạng bao nang, giảm nếp nhăn, cải thiện mụn ẩn. Chỉ dùng buổi tối, 2–3 lần/tuần ở 2 tuần đầu. Không dùng khi mang thai/cho con bú." },
  { sku: "LM-KD-01", name: "Kem dưỡng phục hồi Ceramide 50ml", category: "Dưỡng ẩm", price: 385_000, tags: ["da khô", "da nhạy cảm", "phục hồi"], desc: "Kem dưỡng chứa 5 loại ceramide, cholesterol và acid béo, phục hồi hàng rào bảo vệ da, giảm khô ráp. Phù hợp da khô, da nhạy cảm, da sau treatment." },
  { sku: "LM-KD-02", name: "Gel dưỡng ẩm oil-free 50ml", category: "Dưỡng ẩm", price: 299_000, tags: ["da dầu", "mụn"], desc: "Gel dưỡng mỏng nhẹ, không dầu, không gây bít tắc, thấm nhanh. Dành cho da dầu, da hỗn hợp, da mụn." },
  { sku: "LM-KCN-01", name: "Kem chống nắng SPF50+ PA++++ 50ml", category: "Chống nắng", price: 349_000, tags: ["chống nắng", "mọi loại da"], desc: "Kem chống nắng phổ rộng SPF50+ PA++++, kết cấu sữa mỏng, không vệt trắng, kiềm dầu nhẹ. Thoa lại sau mỗi 2–3 giờ khi ở ngoài trời." },
  { sku: "LM-MN-01", name: "Mặt nạ đất sét làm sạch 100g", category: "Mặt nạ", price: 265_000, tags: ["da dầu", "lỗ chân lông"], desc: "Mặt nạ đất sét kaolin + bentonite, hút dầu, làm sạch lỗ chân lông. Dùng 1–2 lần/tuần, để 10 phút rồi rửa sạch.", inStock: false },
];

export const DEMO_SERVICES = [
  { name: "Soi da & tư vấn liệu trình (miễn phí)", durationMin: 30, price: 0, desc: "Chuyên viên soi da bằng máy, tư vấn quy trình chăm sóc phù hợp. Không bắt buộc mua sản phẩm." },
  { name: "Chăm sóc da cơ bản", durationMin: 60, price: 350_000, desc: "Làm sạch sâu, tẩy tế bào chết, đắp mặt nạ, massage mặt thư giãn." },
  { name: "Lấy nhân mụn chuẩn y khoa", durationMin: 75, price: 450_000, desc: "Làm sạch, lấy nhân mụn vô khuẩn, điện tím, mặt nạ làm dịu." },
  { name: "Liệu trình phục hồi da nhạy cảm", durationMin: 90, price: 690_000, desc: "Liệu trình chuyên sâu cho da kích ứng, mỏng yếu: làm dịu, cấp ẩm, ánh sáng sinh học." },
];

export const DEMO_KNOWLEDGE = `GIAO HÀNG
- Nội thành TP.HCM: giao trong 2–4 giờ, phí 20.000đ; miễn phí cho đơn từ 500.000đ.
- Tỉnh thành khác: 2–4 ngày qua GHN, phí 30.000đ; miễn phí cho đơn từ 800.000đ.
- Hỗ trợ COD (thanh toán khi nhận hàng) toàn quốc.

ĐỔI TRẢ
- Đổi trả trong 7 ngày nếu sản phẩm lỗi do nhà sản xuất hoặc giao sai, còn nguyên tem/seal.
- Sản phẩm đã mở nắp không áp dụng đổi trả vì lý do không hợp da, trừ khi có kích ứng kèm ảnh chụp.

THANH TOÁN
- Tiền mặt, chuyển khoản, thẻ ATM/Visa/Master, ví MoMo.

THÀNH VIÊN
- Tích 1 điểm cho mỗi 10.000đ. 100 điểm = voucher 50.000đ.
- Thành viên Vàng (chi tiêu từ 5 triệu/năm) được giảm 10% dịch vụ spa.

CAM KẾT
- 100% sản phẩm chính hãng, có hoá đơn nhập khẩu. Hoàn tiền gấp đôi nếu phát hiện hàng giả.

SPA
- Khách nên đến trước giờ hẹn 10 phút. Huỷ/đổi lịch vui lòng báo trước 2 giờ.
- Không trang điểm trước khi đến soi da để kết quả chính xác hơn.`;

export const DEMO_QUESTIONS: { text: string; label: string; topic: string; need: string; sentiment: string; handledBy: string; unanswered?: boolean }[] = [
  { text: "Da dầu mụn nên dùng sữa rửa mặt nào ạ?", label: "needs_consult", topic: "sữa rửa mặt da dầu", need: "Tìm sữa rửa mặt cho da dầu mụn", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Serum vitamin C giá bao nhiêu", label: "product_query", topic: "serum vitamin c", need: "Hỏi giá serum vitamin C", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Ship ra Hà Nội mất mấy ngày", label: "knowledge_query", topic: "giao hàng tỉnh", need: "Hỏi thời gian giao hàng ra Hà Nội", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Mình muốn đặt lịch soi da cuối tuần", label: "booking", topic: "đặt lịch soi da", need: "Đặt lịch soi da cuối tuần", sentiment: "neutral", handledBy: "template" },
  { text: "Retinol với niacinamide dùng chung được không, da mình nhạy cảm", label: "needs_consult", topic: "kết hợp hoạt chất", need: "Hỏi cách kết hợp retinol và niacinamide cho da nhạy cảm", sentiment: "neutral", handledBy: "llm_complex" },
  { text: "Shop có bán kem trị nám không", label: "product_query", topic: "trị nám", need: "Tìm sản phẩm trị nám", sentiment: "neutral", handledBy: "llm_simple", unanswered: true },
  { text: "Đơn hàng của mình giao tới đâu rồi", label: "not_in_data", topic: "tra cứu đơn hàng", need: "Kiểm tra tình trạng đơn hàng", sentiment: "neutral", handledBy: "handoff", unanswered: true },
  { text: "Shop có tẩy lông không", label: "product_query", topic: "dịch vụ tẩy lông", need: "Hỏi dịch vụ tẩy lông", sentiment: "neutral", handledBy: "llm_simple", unanswered: true },
  { text: "Dùng xong bị nổi mẩn đỏ, thất vọng quá", label: "complaint", topic: "kích ứng sản phẩm", need: "Phản ánh kích ứng sau khi dùng", sentiment: "negative", handledBy: "handoff", unanswered: true },
  { text: "Giờ mở cửa chủ nhật", label: "ask_contact", topic: "giờ mở cửa", need: "Hỏi giờ mở cửa chủ nhật", sentiment: "neutral", handledBy: "template" },
  { text: "Kem chống nắng có bị bết không", label: "product_query", topic: "kem chống nắng", need: "Hỏi kết cấu kem chống nắng", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Có son môi không shop", label: "product_query", topic: "son môi", need: "Tìm son môi", sentiment: "neutral", handledBy: "llm_simple", unanswered: true },
  { text: "Chào shop", label: "greeting", topic: "chào hỏi", need: "", sentiment: "neutral", handledBy: "template" },
  { text: "Cho mình gặp nhân viên tư vấn", label: "human_request", topic: "gặp nhân viên", need: "Muốn nói chuyện với nhân viên", sentiment: "neutral", handledBy: "handoff" },
  { text: "Thành viên vàng được giảm bao nhiêu", label: "knowledge_query", topic: "ưu đãi thành viên", need: "Hỏi quyền lợi thành viên", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Có trả góp không", label: "knowledge_query", topic: "trả góp", need: "Hỏi mua trả góp", sentiment: "neutral", handledBy: "llm_simple", unanswered: true },
];

