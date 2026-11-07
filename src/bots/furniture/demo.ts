import type { NewFurnitureItem } from "./domain";

/** Dữ liệu demo của "Nhà Gỗ Demo" (hư cấu) — chỉ nạp cho shop demo */
type Demo = Omit<NewFurnitureItem, "tenantId" | "imageUrl" | "active" | "cutoutUrl" | "modelUrl" | "modelStatus" | "modelJob" | "collection" | "pairs" | "embedding"> & { collection?: string; pairs?: string[] };

export const DEMO_FURNITURE: Demo[] = [
  { sku: "SF-L3-XAM", name: "Sofa văng 3 chỗ Oslo", category: "Sofa", rooms: ["living"], style: "Bắc Âu", material: "Vải bố chống bẩn, khung gỗ sồi", color: "xám ghi", widthCm: 210, depthCm: 90, heightCm: 82, price: 12_900_000, stock: 6, description: "Sofa văng 3 chỗ đệm mút D40 êm, tháo vỏ giặt được. Chân gỗ sồi cao 15 cm để máy hút bụi lọt gầm. Hợp phòng khách 16-25 m²." },
  { sku: "SF-LG-KEM", name: "Sofa góc L Milan", category: "Sofa", rooms: ["living"], style: "Hiện đại", material: "Da công nghiệp, khung gỗ tự nhiên", color: "kem", widthCm: 280, depthCm: 160, heightCm: 85, price: 21_500_000, stock: 2, description: "Sofa góc chữ L, đổi chiều trái/phải khi lắp. Phù hợp phòng khách từ 25 m² trở lên; cần lối đi tối thiểu 80 cm." },
  { sku: "BA-6-OC", name: "Bàn ăn 6 ghế Walnut", category: "Bàn ăn", rooms: ["dining", "kitchen"], style: "Hiện đại", material: "Gỗ óc chó veneer, chân thép sơn tĩnh điện", color: "nâu óc chó", widthCm: 160, depthCm: 80, heightCm: 75, price: 8_900_000, stock: 5, description: "Bàn ăn chữ nhật cho 6 người, mặt veneer chống xước. Giá chưa gồm ghế." },
  { sku: "GH-AN-BE", name: "Ghế ăn Nordic (cái)", category: "Ghế ăn", rooms: ["dining", "kitchen"], style: "Bắc Âu", material: "Gỗ cao su, nệm vải", color: "be", widthCm: 45, depthCm: 52, heightCm: 82, price: 1_150_000, stock: 40, description: "Ghế ăn tựa lưng cong, tải trọng 120 kg. Bán theo cái." },
  { sku: "GI-16-SOI", name: "Giường ngủ 1m6 Bắc Âu", category: "Giường", rooms: ["bedroom"], style: "Bắc Âu", material: "Gỗ sồi, đầu giường bọc vải", color: "sồi tự nhiên", widthCm: 170, depthCm: 210, heightCm: 95, price: 9_800_000, stock: 4, description: "Giường 1m6 x 2m (nệm không kèm), có 2 hộc kéo dưới gầm. Cần phòng ngủ tối thiểu 3 x 3,4 m để còn lối đi." },
  { sku: "TQA-3C", name: "Tủ quần áo 3 cánh Hana", category: "Tủ quần áo", rooms: ["bedroom"], style: "Hiện đại", material: "MDF chống ẩm phủ melamine", color: "trắng", widthCm: 150, depthCm: 55, heightCm: 220, price: 7_400_000, stock: 7, description: "Tủ 3 cánh mở, cao 2,2 m, 2 ngăn kéo. Cần trần cao tối thiểu 2,4 m khi lắp." },
  { sku: "BLV-120", name: "Bàn làm việc 1m2 Focus", category: "Bàn làm việc", rooms: ["office", "bedroom", "kids"], style: "Tối giản", material: "Gỗ MFC, chân sắt", color: "trắng - đen", widthCm: 120, depthCm: 60, heightCm: 75, price: 2_900_000, stock: 18, description: "Bàn làm việc có ngăn kéo và giá để màn hình. Kê sát tường vừa 1m2 trở lên." },
  { sku: "KS-5T", name: "Kệ sách 5 tầng Library", category: "Kệ sách", rooms: ["office", "living", "kids"], style: "Tối giản", material: "Gỗ công nghiệp phủ melamine", color: "gỗ sáng", widthCm: 80, depthCm: 30, heightCm: 180, price: 2_400_000, stock: 0, description: "Kệ sách 5 tầng, tải mỗi tầng 20 kg, có chân cân bằng. Hiện tạm hết hàng, hàng về sau 2-3 tuần." },
  { sku: "BTR-80", name: "Bàn trà tròn Moon", category: "Bàn trà", rooms: ["living"], style: "Bắc Âu", material: "Gỗ tần bì, mặt kính cường lực", color: "tần bì", widthCm: 80, depthCm: 80, heightCm: 42, price: 2_150_000, stock: 12, description: "Bàn trà tròn đường kính 80 cm, bo góc an toàn cho nhà có trẻ nhỏ." },
  { sku: "KTV-180", name: "Kệ tivi 1m8 Linear", category: "Kệ tivi", rooms: ["living"], style: "Hiện đại", material: "Gỗ công nghiệp, mặt đá nhân tạo", color: "xám - trắng", widthCm: 180, depthCm: 40, heightCm: 45, price: 4_600_000, stock: 9, description: "Kệ tivi dài 1m8 cho tivi đến 65 inch, có hộc đựng thiết bị và đi dây ngầm." },
  { sku: "SF-2-JP", name: "Sofa văng 2 chỗ Kyoto", category: "Sofa", rooms: ["living"], style: "Japandi", material: "Khung gỗ óc chó, nệm vải linen", color: "be", widthCm: 170, depthCm: 82, heightCm: 72, price: 10_400_000, stock: 5, description: "Sofa thấp kiểu Nhật – Bắc Âu, khung gỗ lộ, hợp căn hộ 1–2 phòng ngủ và phòng khách từ 12 m²." },
  { sku: "SF-3-IND", name: "Sofa gỗ cẩm xe Đông Dương", category: "Sofa", rooms: ["living"], style: "Indochine", material: "Gỗ cẩm xe, mặt tựa mây đan, nệm vải bố", color: "nâu", widthCm: 200, depthCm: 80, heightCm: 85, price: 16_800_000, stock: 3, description: "Sofa văng phong cách Indochine, tựa lưng mây tre đan thủ công, nệm xanh rêu tháo rời." },
  { sku: "BTR-LOFT", name: "Bàn trà chữ nhật Loft", category: "Bàn trà", rooms: ["living"], style: "Công nghiệp", material: "Gỗ thông thô, khung thép sơn đen", color: "nâu - đen", widthCm: 110, depthCm: 55, heightCm: 40, price: 2_650_000, stock: 8, description: "Bàn trà mặt gỗ thông xử lý thô, khung thép hộp, có kệ dưới để sách báo." },
  { sku: "BTR-JP", name: "Bàn trà thấp Zen", category: "Bàn trà", rooms: ["living"], style: "Japandi", material: "Gỗ óc chó", color: "nâu óc chó", widthCm: 100, depthCm: 50, heightCm: 35, price: 3_200_000, stock: 6, description: "Bàn trà thấp bo cạnh mềm, hợp sofa thấp và thảm cói." },
  { sku: "KTV-IND", name: "Kệ tivi gỗ Đông Dương 1m6", category: "Kệ tivi", rooms: ["living"], style: "Indochine", material: "Gỗ cẩm xe, cánh mây đan", color: "nâu", widthCm: 160, depthCm: 42, heightCm: 55, price: 6_900_000, stock: 4, description: "Kệ tivi cánh mây đan thoáng khí cho thiết bị, chân tiện kiểu Đông Dương." },
  { sku: "GI-18-JP", name: "Giường bệt 1m8 Japandi", category: "Giường", rooms: ["bedroom"], style: "Japandi", material: "Gỗ sồi sơn màu óc chó", color: "nâu óc chó", widthCm: 190, depthCm: 210, heightCm: 80, price: 11_900_000, stock: 3, description: "Giường thấp sát sàn 1m8 × 2m, đầu giường liền tab hai bên." },
  { sku: "BA-4-TRON", name: "Bàn ăn tròn 4 ghế Fika", category: "Bàn ăn", rooms: ["dining", "kitchen"], style: "Bắc Âu", material: "Gỗ tần bì", color: "tần bì", widthCm: 100, depthCm: 100, heightCm: 75, price: 5_200_000, stock: 6, description: "Bàn ăn tròn đường kính 1 m cho 4 người, hợp bếp căn hộ nhỏ, giá chưa gồm ghế." },
  { sku: "GH-MAY", name: "Ghế ăn mây Hội An (cái)", category: "Ghế ăn", rooms: ["dining", "kitchen"], style: "Indochine", material: "Khung gỗ, lưng mây đan", color: "nâu", widthCm: 46, depthCm: 50, heightCm: 85, price: 1_450_000, stock: 24, description: "Ghế ăn lưng mây đan tay, bán theo cái." },
];

/** Bộ sưu tập + món hợp đi kèm của dữ liệu demo (theo SKU) */
export const DEMO_PAIRS: Record<string, { collection: string; pairs: string[] }> = {
  "SF-L3-XAM": { collection: "Oslo", pairs: ["BTR-80", "KTV-180", "KS-5T"] },
  "SF-2-JP": { collection: "Kyoto", pairs: ["BTR-JP"] },
  "BTR-JP": { collection: "Kyoto", pairs: ["SF-2-JP", "GI-18-JP"] },
  "GI-18-JP": { collection: "Kyoto", pairs: ["BTR-JP"] },
  "SF-3-IND": { collection: "Hội An", pairs: ["KTV-IND", "GH-MAY"] },
  "KTV-IND": { collection: "Hội An", pairs: ["SF-3-IND"] },
  "GH-MAY": { collection: "Hội An", pairs: ["BA-6-OC", "SF-3-IND"] },
  "BA-4-TRON": { collection: "Fika", pairs: ["GH-AN-BE"] },
  "GH-AN-BE": { collection: "Fika", pairs: ["BA-4-TRON", "BA-6-OC"] },
};

export const DEMO_FURNITURE_SERVICES = [
  { name: "Khảo sát & đo đạc tại nhà", durationMin: 60, price: 0, desc: "Nhân viên đến đo không gian, tư vấn bố trí và lắp thử mô hình." },
  { name: "Tham quan showroom", durationMin: 45, price: 0, desc: "Xem và ngồi thử sản phẩm thật, chọn màu vải và gỗ tại chỗ." },
];

export const DEMO_FURNITURE_KNOWLEDGE = `GIAO HÀNG & LẮP ĐẶT
- Giao hàng và lắp đặt miễn phí nội thành TP.HCM cho đơn từ 5.000.000đ; đơn nhỏ hơn phí 300.000đ. Tỉnh lân cận báo phí theo khoảng cách.
- Giao trong 3-7 ngày với hàng có sẵn, 15-25 ngày với hàng đặt theo kích thước hoặc màu riêng.
- Nhận hàng trong thang máy cần thang rộng tối thiểu 90 cm; hàng lớn (sofa góc, tủ) có thể phải kéo tời, báo trước để sắp xếp.

BẢO HÀNH & ĐỔI TRẢ
- Bảo hành khung 5 năm, bề mặt và phụ kiện 12 tháng. Lỗi sản xuất đổi mới trong 30 ngày.
- Không đổi trả hàng đặt theo kích thước riêng, trừ lỗi sản xuất.

THANH TOÁN
- Đặt cọc 30% khi chốt đơn, thanh toán phần còn lại khi giao. Trả góp 0% qua thẻ tín dụng cho đơn từ 10.000.000đ.

SHOWROOM
- 88 Điện Biên Phủ, Q.3. Mở cửa 9h-21h mỗi ngày.`;

export const DEMO_FURNITURE_QUESTIONS = [
  { text: "Phòng khách 4x5m nên mua sofa nào", label: "needs_consult", topic: "sofa phòng khách", need: "Chọn sofa cho phòng khách 4x5m", sentiment: "neutral", handledBy: "llm_complex" },
  { text: "Sofa góc L có vừa góc phòng 3m x 2,5m không", label: "product_query", topic: "kích thước sofa", need: "Kiểm tra sofa góc có vừa không gian", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Bàn ăn 6 người giá bao nhiêu", label: "product_query", topic: "bàn ăn", need: "Hỏi giá bàn ăn 6 người", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Giao hàng và lắp đặt có tính phí không", label: "knowledge_query", topic: "giao hàng lắp đặt", need: "Hỏi phí giao lắp", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Cho mình đặt lịch khảo sát đo đạc tại nhà", label: "booking", topic: "khảo sát tại nhà", need: "Đặt lịch khảo sát", sentiment: "neutral", handledBy: "template" },
  { text: "Tủ quần áo cho phòng trần thấp 2m3", label: "product_query", topic: "tủ quần áo trần thấp", need: "Tìm tủ phù hợp trần 2,3m", sentiment: "neutral", handledBy: "llm_simple" },
  { text: "Bàn ăn có đặt theo kích thước riêng được không", label: "knowledge_query", topic: "đặt theo kích thước", need: "Hỏi đặt đóng theo kích thước", sentiment: "neutral", handledBy: "llm_simple", unanswered: true },
  { text: "Ghế sofa bị lún sau 2 tháng, bảo hành sao", label: "complaint", topic: "bảo hành sofa", need: "Phản ánh sofa lún", sentiment: "negative", handledBy: "handoff", unanswered: true },
];
