import { DomainError } from "@/domain/errors";
import { fold } from "@/domain/text";
import { checkFit, ROOM_LABELS, type FurnitureItem, type Room } from "./domain";

/**
 * Luật thiết kế phòng (thuần, có test) — bot và studio ảnh phòng dùng chung:
 * phong cách + bảng màu 60-30-10, bộ món thiết yếu theo loại phòng, chia ngân sách,
 * kiểm tra diện tích chiếm sàn và khoảng thông thuỷ.
 */

export const STYLES = ["scandinavian", "modern", "minimal", "japandi", "indochine", "neoclassic", "industrial"] as const;
export type StyleId = (typeof STYLES)[number];

export interface StyleInfo {
  id: StyleId;
  label: string;
  /** Câu mô tả cho CLIP (tiếng Anh — model học trên dữ liệu tiếng Anh) */
  clip: string;
  /** Từ khoá khớp với cột style/material/color của shop (đã bỏ dấu) */
  keywords: string[];
  /** Bảng màu 60-30-10: nền – chủ đạo – điểm nhấn */
  palette: [string, string, string];
  tips: string;
}

export const STYLE_INFO: Record<StyleId, StyleInfo> = {
  scandinavian: { id: "scandinavian", label: "Bắc Âu", clip: "a scandinavian style interior with light wood and white walls", keywords: ["bac au", "scandinavian", "nordic", "go soi", "tan bi", "go sang"], palette: ["#f4f1ec", "#c9a77c", "#7d8b74"], tips: "Gỗ sáng, vải tự nhiên, tường trắng ngà; điểm nhấn xanh rêu hoặc xám." },
  modern: { id: "modern", label: "Hiện đại", clip: "a modern contemporary interior with clean lines", keywords: ["hien dai", "modern", "da", "kim loai", "kinh"], palette: ["#ecebe8", "#5b5f66", "#b0814f"], tips: "Đường nét gọn, tương phản xám – kem, kim loại hoặc da làm điểm nhấn." },
  minimal: { id: "minimal", label: "Tối giản", clip: "a minimalist interior with few objects and neutral colors", keywords: ["toi gian", "minimal", "trang", "mfc", "melamine"], palette: ["#f5f5f3", "#d8d6d1", "#2f2f2f"], tips: "Ít món, nhiều khoảng trống, màu trung tính, đồ có ngăn chứa kín." },
  japandi: { id: "japandi", label: "Japandi", clip: "a japandi interior with low wooden furniture and earthy tones", keywords: ["japandi", "nhat", "go oc cho", "may", "coi"], palette: ["#ece6dc", "#8a6f55", "#2e2b28"], tips: "Đồ thấp, gỗ trầm, vật liệu thô mộc; tông đất, đen làm điểm nhấn." },
  indochine: { id: "indochine", label: "Indochine", clip: "an indochine style interior with rattan, dark wood and patterned tiles", keywords: ["indochine", "dong duong", "may tre", "go cam xe", "gach bong"], palette: ["#efe6d4", "#5a3b26", "#2c5d4f"], tips: "Gỗ sẫm, mây tre, gạch bông; điểm nhấn xanh lục hoặc vàng mù tạt." },
  neoclassic: { id: "neoclassic", label: "Tân cổ điển", clip: "a neoclassical luxury interior with moldings and velvet furniture", keywords: ["tan co dien", "co dien", "neoclassic", "nhung", "phao chi", "ma vang"], palette: ["#f2ede4", "#b9a37e", "#1f3a4d"], tips: "Phào chỉ, vải nhung, kim loại mạ vàng; bố cục đối xứng." },
  industrial: { id: "industrial", label: "Công nghiệp", clip: "an industrial loft interior with concrete, black metal and leather", keywords: ["cong nghiep", "industrial", "loft", "thep", "sat", "xi mang"], palette: ["#d9d6d0", "#4a4a48", "#a35a2f"], tips: "Bê tông, thép sơn đen, gỗ thô, da bò; ánh sáng vàng ấm." },
};
export const isStyle = (v: unknown): v is StyleId => (STYLES as readonly unknown[]).includes(v);

/** Tên shop hay ghi ("Bắc Âu", "hiện đại"...) → mã phong cách */
export function styleFromText(text: string): StyleId | undefined {
  // Khớp nguyên từ: "da" (da thuộc) không được khớp "đan" trong "mây đan"
  const t = ` ${fold(text).replace(/[^a-z0-9]+/g, " ")} `;
  const has = (k: string) => t.includes(` ${k} `);
  return STYLES.find((s) => has(fold(STYLE_INFO[s].label))) ?? STYLES.find((s) => STYLE_INFO[s].keywords.some(has));
}

/** Mức hợp phong cách của một món: 2 = đúng phong cách, 1 = hợp (họ gần), 0 = lệch */
const NEAR: Record<StyleId, StyleId[]> = {
  scandinavian: ["japandi", "minimal"],
  modern: ["minimal", "industrial"],
  minimal: ["scandinavian", "modern", "japandi"],
  japandi: ["scandinavian", "minimal"],
  indochine: ["japandi"],
  neoclassic: ["modern"],
  industrial: ["modern"],
};
export function styleScore(item: Pick<FurnitureItem, "style" | "material" | "color">, style: StyleId): number {
  const own = styleFromText(item.style) ?? styleFromText(item.material);
  if (own === style) return 2;
  if (own && NEAR[style].includes(own)) return 1;
  return 0;
}

/** Màu tên tiếng Việt → mã màu xấp xỉ (để so với bảng màu lấy từ ảnh phòng) */
const COLOR_WORDS: [string, string][] = [
  ["trang", "#f2f0ec"], ["kem", "#e8dcc4"], ["be", "#d8c7a8"], ["xam ghi", "#8d8f91"], ["xam", "#9a9a98"], ["den", "#2a2a2a"],
  ["nau oc cho", "#5b3d2b"], ["oc cho", "#5b3d2b"], ["nau", "#7a5236"], ["soi", "#c8a676"], ["tan bi", "#d4b48a"], ["go sang", "#d9bf94"],
  ["xanh reu", "#5d6b4f"], ["xanh", "#4f6d8a"], ["vang", "#d6a84a"], ["do", "#a23a2e"], ["hong", "#d8a0a4"],
];
export function colorHex(color: string): string {
  const t = fold(color);
  return COLOR_WORDS.find(([w]) => t.includes(w))?.[1] ?? "#9b8f80";
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
/** Khoảng cách màu đơn giản (0 = trùng, ~441 = đen–trắng) */
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

/** Món có hợp bảng màu ảnh phòng không: gần một trong các màu chính, hoặc là màu trung tính/gỗ */
export function paletteScore(item: Pick<FurnitureItem, "color">, palette: string[]): number {
  if (palette.length === 0) return 0;
  const c = colorHex(item.color);
  const d = Math.min(...palette.map((p) => colorDistance(c, p)));
  return d < 60 ? 2 : d < 120 ? 1 : 0;
}

/** Bộ món theo loại phòng: danh mục (khớp cột category của shop), tỉ lệ ngân sách gợi ý, bắt buộc hay không */
export interface SetSlot {
  category: string;
  /** Từ khoá nhận diện danh mục của shop (đã bỏ dấu) */
  match: string[];
  share: number;
  required: boolean;
  /** Số lượng mặc định (ghế ăn theo số người) */
  qty?: (seats: number) => number;
}

export const ROOM_SETS: Record<Room, SetSlot[]> = {
  living: [
    { category: "Sofa", match: ["sofa"], share: 0.5, required: true },
    { category: "Bàn trà", match: ["ban tra"], share: 0.12, required: true },
    { category: "Kệ tivi", match: ["ke tivi", "ke tv"], share: 0.22, required: false },
    { category: "Kệ sách", match: ["ke sach", "ke trang tri"], share: 0.16, required: false },
  ],
  bedroom: [
    { category: "Giường", match: ["giuong"], share: 0.5, required: true },
    { category: "Tủ quần áo", match: ["tu quan ao"], share: 0.35, required: true },
    { category: "Bàn làm việc", match: ["ban lam viec", "ban trang diem"], share: 0.15, required: false },
  ],
  dining: [
    { category: "Bàn ăn", match: ["ban an"], share: 0.55, required: true },
    { category: "Ghế ăn", match: ["ghe an"], share: 0.45, required: true, qty: (s) => s },
  ],
  kitchen: [
    { category: "Bàn ăn", match: ["ban an"], share: 0.55, required: true },
    { category: "Ghế ăn", match: ["ghe an"], share: 0.45, required: true, qty: (s) => s },
  ],
  office: [
    { category: "Bàn làm việc", match: ["ban lam viec"], share: 0.55, required: true },
    { category: "Kệ sách", match: ["ke sach"], share: 0.45, required: false },
  ],
  kids: [
    { category: "Bàn làm việc", match: ["ban lam viec", "ban hoc"], share: 0.5, required: true },
    { category: "Kệ sách", match: ["ke sach"], share: 0.5, required: false },
  ],
};

/** Đồ DETR nhận ra trong ảnh (nhãn COCO) → danh mục shop, để không gợi ý trùng món khách đã có */
export const DETECTED_TO_CATEGORY: Record<string, string> = {
  couch: "Sofa",
  bed: "Giường",
  "dining table": "Bàn ăn",
  chair: "Ghế ăn",
  tv: "Kệ tivi",
};

export interface RoomSetInput {
  room: Room;
  budget?: number;
  style?: StyleId;
  /** Kích thước phòng (cm) */
  roomWidthCm?: number;
  roomDepthCm?: number;
  /** Danh mục khách đã có (từ ảnh hoặc khách nói) */
  existing?: string[];
  /** Số người ngồi ăn */
  seats?: number;
  /** Bảng màu lấy từ ảnh phòng (#rrggbb) */
  palette?: string[];
}

export interface RoomSetPick {
  item: FurnitureItem;
  category: string;
  quantity: number;
  total: number;
  reason: string;
}

export interface RoomSetResult {
  room: Room;
  style: StyleId | null;
  picks: RoomSetPick[];
  subtotal: number;
  budget: number | null;
  /** % diện tích sàn bị đồ chiếm (nên ≤ 40%) */
  coveragePercent: number | null;
  palette: [string, string, string] | null;
  skipped: string[];
  notes: string[];
}

const slotMatches = (slot: SetSlot, category: string) => slot.match.some((m) => fold(category).includes(m));

/** Khoảng thông thuỷ cần quanh món (cm) — để kiểm tra phòng còn lối đi */
function clearanceNote(category: string, room: { w: number; d: number } | null, item: FurnitureItem): string | null {
  const c = fold(category);
  if (c.includes("ban an") && room) {
    // Kéo ghế ra cần ~75 cm mỗi phía có ghế
    const needW = item.widthCm + 150;
    const needD = item.depthCm + 150;
    const fits = (needW <= room.w && needD <= room.d) || (needW <= room.d && needD <= room.w);
    return fits ? null : `Bàn ăn ${item.widthCm}×${item.depthCm} cm cần khoảng ${needW}×${needD} cm để kéo ghế thoải mái — phòng hơi chật, cân nhắc bàn nhỏ hơn hoặc kê sát tường một phía.`;
  }
  if (c.includes("giuong") && room) {
    const fits = item.widthCm + 120 <= room.w || item.widthCm + 120 <= room.d;
    return fits ? null : `Giường rộng ${item.widthCm} cm nên chừa ~60 cm mỗi bên để đi lại; phòng ${room.w}×${room.d} cm sẽ phải kê sát tường một bên.`;
  }
  if (c.includes("sofa")) return "Đặt bàn trà cách sofa 40–45 cm; lối đi chính nên rộng ≥ 80 cm.";
  if (c.includes("ke tivi")) return "Khoảng cách xem tivi lý tưởng ≈ 1,5–2,5 lần đường chéo màn hình (tivi 55 inch: 2,1–3,5 m).";
  return null;
}

/**
 * Gợi ý trọn bộ cho một phòng: mỗi danh mục thiết yếu một món hợp phong cách/màu, vừa phòng, trong ngân sách.
 * Ngân sách chia theo tỉ lệ từng danh mục; món nào vượt phần của mình thì lấy phần dư của danh mục trước.
 */
export function designRoomSet(catalog: FurnitureItem[], input: RoomSetInput): RoomSetResult {
  if (input.budget !== undefined && !(input.budget > 0)) throw new DomainError("BAD_BUDGET", "Ngân sách không hợp lệ");
  const seats = Math.min(12, Math.max(1, Math.round(input.seats ?? 4)));
  const room = input.roomWidthCm && input.roomDepthCm ? { w: input.roomWidthCm, d: input.roomDepthCm } : null;
  if (room && (room.w < 100 || room.d < 100 || room.w > 3000 || room.d > 3000)) throw new DomainError("BAD_ROOM", "Kích thước phòng không hợp lệ");
  const existing = new Set((input.existing ?? []).map(fold));
  const palette = input.palette ?? [];
  const notes: string[] = [];
  const skipped: string[] = [];
  const picks: RoomSetPick[] = [];

  // Ứng viên của từng danh mục: vừa phòng, đúng loại phòng; điểm = phong cách + màu + còn hàng
  const slots = ROOM_SETS[input.room]
    .filter((slot) => {
      const has = [...existing].some((e) => slotMatches(slot, e));
      if (has) skipped.push(`${slot.category} (đã có)`);
      return !has;
    })
    .map((slot) => {
      const qty = slot.qty?.(seats) ?? 1;
      const candidates = catalog
        .filter((i) => i.active && i.price > 0 && slotMatches(slot, i.category) && i.rooms.includes(input.room))
        .filter((i) => !room || checkFit(i, { widthCm: room.w, depthCm: room.d }).fits)
        // Món phụ đang hết hàng thì không gợi ý (món bắt buộc vẫn giữ, kèm lưu ý đặt thêm)
        .filter((i) => slot.required || i.stock >= qty)
        // Phong cách khách chọn nặng nhất (×3), màu ảnh phòng chỉ là gợi ý phụ (×1)
        .map((i) => ({ i, score: (input.style ? styleScore(i, input.style) * 3 : 0) + paletteScore(i, palette) + (i.stock >= qty ? 2 : 0) }));
      return { slot, qty, candidates, cheapest: candidates.length ? Math.min(...candidates.map((c) => c.i.price)) * qty : 0 };
    });
  // Món bắt buộc chọn trước; mỗi món được tiêu phần còn lại trừ phần giữ chỗ tối thiểu cho món bắt buộc phía sau.
  // Trong các món đủ tiền: điểm cao nhất, hoà điểm thì giá gần "phần chia" của danh mục nhất.
  const order = [...slots].sort((a, b) => Number(b.slot.required) - Number(a.slot.required));
  let remaining = input.budget ?? Infinity;
  for (let k = 0; k < order.length; k++) {
    const { slot, qty, candidates } = order[k];
    const reserve = order.slice(k + 1).filter((o) => o.slot.required && o.candidates.length).reduce((s, o) => s + o.cheapest, 0);
    const allowance = remaining - reserve;
    const target = input.budget ? input.budget * slot.share : 0;
    // Cùng bộ sưu tập / shop đánh dấu "hợp đi kèm" với món đã chọn → cộng điểm (ngang một mức phong cách)
    const goesWith = (i: FurnitureItem) => picks.some((p) => p.item.pairs.includes(i.sku) || i.pairs.includes(p.item.sku) || (!!i.collection && i.collection === p.item.collection));
    const within = candidates
      .filter((c) => c.i.price * qty <= allowance)
      .map((c) => ({ ...c, score: c.score + (goesWith(c.i) ? 3 : 0) }))
      .sort((a, b) => b.score - a.score || (target ? Math.abs(a.i.price * qty - target) - Math.abs(b.i.price * qty - target) : a.i.price - b.i.price));
    const chosen = within[0];
    if (!chosen) {
      if (candidates.length) skipped.push(`${slot.category} (vượt ngân sách — món rẻ nhất ${Math.min(...candidates.map((c) => c.i.price)).toLocaleString("vi-VN")} ₫)`);
      else if (slot.required) skipped.push(`${slot.category} (cửa hàng chưa có món vừa phòng)`);
      continue;
    }
    const total = chosen.i.price * qty;
    remaining -= total;
    const why = [
      input.style && styleScore(chosen.i, input.style) === 2 ? `đúng phong cách ${STYLE_INFO[input.style].label}` : input.style && styleScore(chosen.i, input.style) === 1 ? `hợp phong cách ${STYLE_INFO[input.style].label}` : "",
      paletteScore(chosen.i, palette) === 2 ? "màu hợp với phòng" : "",
      picks.some((p) => p.item.pairs.includes(chosen.i.sku) || chosen.i.pairs.includes(p.item.sku) || (!!chosen.i.collection && chosen.i.collection === p.item.collection)) ? "cùng bộ / hợp món đã chọn" : "",
      room ? "vừa kích thước phòng" : "",
      chosen.i.stock < qty ? `kho còn ${chosen.i.stock}, cần đặt thêm` : "",
    ].filter(Boolean);
    picks.push({ item: chosen.i, category: slot.category, quantity: qty, total, reason: why.join(", ") || "giá tốt nhất trong danh mục" });
    const n = clearanceNote(slot.category, room, chosen.i);
    if (n) notes.push(n);
  }
  // Hiển thị theo thứ tự danh mục của phòng (sofa trước bàn trà…)
  const rank = (c: string) => ROOM_SETS[input.room].findIndex((s) => s.category === c);
  picks.sort((a, b) => rank(a.category) - rank(b.category));

  const subtotal = picks.reduce((s, p) => s + p.total, 0);
  let coveragePercent: number | null = null;
  if (room) {
    const used = picks.reduce((s, p) => s + p.item.widthCm * p.item.depthCm * p.quantity, 0);
    coveragePercent = Math.round((used / (room.w * room.d)) * 100);
    if (coveragePercent > 40) notes.push(`Đồ chiếm ${coveragePercent}% diện tích sàn (nên ≤ 40%) — phòng sẽ chật, nên bỏ bớt món phụ hoặc chọn kích thước nhỏ hơn.`);
  }
  if (input.budget && subtotal < input.budget * 0.6 && picks.length) notes.push(`Còn dư ${(input.budget - subtotal).toLocaleString("vi-VN")} ₫ ngân sách — có thể nâng cấp sofa/giường hoặc thêm thảm, đèn.`);
  notes.push("Giá tạm tính chưa gồm vận chuyển và lắp đặt.");
  return {
    room: input.room,
    style: input.style ?? null,
    picks,
    subtotal,
    budget: input.budget ?? null,
    coveragePercent,
    palette: input.style ? STYLE_INFO[input.style].palette : null,
    skipped,
    notes,
  };
}

export const roomSetTitle = (r: Pick<RoomSetResult, "room" | "style">) => `${ROOM_LABELS[r.room]}${r.style ? ` phong cách ${STYLE_INFO[r.style].label}` : ""}`;

/**
 * Màu để nhuộm mô hình 3D theo catalogue: chỉ khi shop ghi MỘT màu nhận ra được ("xám ghi", "nâu óc chó").
 * Nhiều màu ("trắng - đen", "xám / trắng") hoặc màu lạ → null (giữ màu gốc của mô hình).
 */
export function colorTint(color: string): string | null {
  if (/[-–/,+&]| và | va /.test(color.toLowerCase())) return null;
  const t = fold(color);
  return COLOR_WORDS.find(([w]) => t.includes(w))?.[1] ?? null;
}
