import { DomainError } from "@/domain/errors";

export const ROOMS = ["living", "bedroom", "dining", "office", "kitchen", "kids"] as const;
export type Room = (typeof ROOMS)[number];
export const ROOM_LABELS: Record<Room, string> = {
  living: "Phòng khách",
  bedroom: "Phòng ngủ",
  dining: "Phòng ăn",
  office: "Phòng làm việc",
  kitchen: "Bếp",
  kids: "Phòng trẻ em",
};
export const isRoom = (v: unknown): v is Room => (ROOMS as readonly unknown[]).includes(v);

export interface FurnitureItem {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  /** Sofa, bàn ăn, giường, tủ quần áo… */
  category: string;
  rooms: Room[];
  /** Bắc Âu, hiện đại, tân cổ điển, Indochine… */
  style: string;
  material: string;
  color: string;
  /** Kích thước choán sàn (cm) */
  widthCm: number;
  depthCm: number;
  heightCm: number;
  price: number;
  description: string;
  imageUrl: string;
  /** Ảnh sản phẩm tách nền (PNG trong suốt) */
  cutoutUrl: string;
  /** Mô hình 3D .glb */
  modelUrl: string;
  /** "" | pending | review | ready | failed */
  modelStatus: string;
  modelJob: string;
  collection: string;
  /** SKU các món hợp đi kèm */
  pairs: string[];
  /** Vector CLIP của ảnh sản phẩm */
  embedding: number[] | null;
  stock: number;
  active: boolean;
  createdAt: Date;
}
export type NewFurnitureItem = Omit<FurnitureItem, "id" | "createdAt">;

/** Giá trị mặc định cho phần hình ảnh/3D khi tạo món mới (chưa có ảnh tách nền, chưa có mô hình 3D) */
export const NO_ASSETS = { cutoutUrl: "", modelUrl: "", modelStatus: "", modelJob: "", collection: "", pairs: [] as string[], embedding: null as number[] | null };

/** Mức hiển thị tốt nhất của một món trong studio: 3D thật > ảnh thật tách nền > hình vẽ theo số đo */
export type Visual = "model" | "cutout" | "drawn";
export const visualOf = (i: Pick<FurnitureItem, "modelUrl" | "cutoutUrl">): Visual => (i.modelUrl ? "model" : i.cutoutUrl ? "cutout" : "drawn");

export const sizeText = (i: Pick<FurnitureItem, "widthCm" | "depthCm" | "heightCm">) => `${i.widthCm} × ${i.depthCm} × ${i.heightCm} cm (R × S × C)`;

export interface FitResult {
  fits: boolean;
  orientation: "as_is" | "rotated" | null;
  /** Khoảng trống còn lại sau khi đặt (cm), theo hướng đặt */
  leftoverWidthCm: number | null;
  leftoverDepthCm: number | null;
  /** Còn lối đi (≥ minWalkwayCm) ở ít nhất một phía */
  walkwayOk: boolean;
  notes: string[];
}

/**
 * Món đồ có vừa khoảng trống không. Thuần tính toán — bot không tự so kích thước.
 * Cho phép xoay 90° khi cần; chiều cao chỉ kiểm tra nếu khách cho biết (tủ âm, gầm cầu thang, trần thấp).
 */
export function checkFit(item: Pick<FurnitureItem, "widthCm" | "depthCm" | "heightCm">, space: { widthCm: number; depthCm: number; heightCm?: number }, opts: { minWalkwayCm?: number } = {}): FitResult {
  for (const [label, v] of [["rộng", space.widthCm], ["sâu", space.depthCm]] as const) {
    if (!(v >= 10) || v > 3000) throw new DomainError("BAD_SPACE", `Chiều ${label} khoảng trống không hợp lệ (cm)`);
  }
  if (space.heightCm !== undefined && (!(space.heightCm >= 50) || space.heightCm > 600)) throw new DomainError("BAD_SPACE", "Chiều cao khoảng trống không hợp lệ (cm)");
  const minWalkway = opts.minWalkwayCm ?? 60;
  const notes: string[] = [];
  const asIs = item.widthCm <= space.widthCm && item.depthCm <= space.depthCm;
  const rotated = item.depthCm <= space.widthCm && item.widthCm <= space.depthCm;
  const heightOk = space.heightCm === undefined || item.heightCm <= space.heightCm;
  if (!heightOk) notes.push(`Món đồ cao ${item.heightCm} cm, vượt chiều cao cho phép ${space.heightCm} cm`);
  if (!asIs && !rotated) {
    notes.push(`Món đồ choán ${item.widthCm} × ${item.depthCm} cm, lớn hơn khoảng trống ${space.widthCm} × ${space.depthCm} cm kể cả khi xoay`);
    return { fits: false, orientation: null, leftoverWidthCm: null, leftoverDepthCm: null, walkwayOk: false, notes };
  }
  const orientation = asIs ? "as_is" : "rotated";
  const w = asIs ? item.widthCm : item.depthCm;
  const d = asIs ? item.depthCm : item.widthCm;
  const leftoverWidthCm = space.widthCm - w;
  const leftoverDepthCm = space.depthCm - d;
  const walkwayOk = Math.max(leftoverWidthCm, leftoverDepthCm) >= minWalkway;
  if (orientation === "rotated") notes.push("Cần xoay ngang 90° mới đặt vừa");
  if (!walkwayOk) notes.push(`Đặt vừa nhưng còn chưa tới ${minWalkway} cm lối đi ở mọi phía — sẽ rất chật`);
  return { fits: heightOk, orientation, leftoverWidthCm, leftoverDepthCm, walkwayOk, notes };
}

export interface OrderLine {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

/** Tạm tính đơn: tiền hàng theo số lượng, kiểm tra tồn. Phí vận chuyển/lắp đặt do nhân viên xác nhận. */
export function orderTotals(items: { item: Pick<FurnitureItem, "sku" | "name" | "price" | "stock" | "active">; quantity: number }[]): { lines: OrderLine[]; subtotal: number; notes: string[] } {
  if (items.length === 0) throw new DomainError("EMPTY_ORDER", "Chưa chọn món nào");
  if (items.length > 20) throw new DomainError("BAD_ORDER", "Tối đa 20 món mỗi lần");
  const lines: OrderLine[] = [];
  const notes: string[] = [];
  for (const { item, quantity } of items) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) throw new DomainError("BAD_QTY", `Số lượng "${item.name}" không hợp lệ`);
    if (!item.active) throw new DomainError("INACTIVE", `"${item.name}" hiện không bán`);
    if (!(item.price > 0)) throw new DomainError("NO_PRICE", `"${item.name}" chưa có giá để tạm tính`);
    if (quantity > item.stock) notes.push(item.stock > 0 ? `"${item.name}" chỉ còn ${item.stock} cái trong kho` : `"${item.name}" đang hết hàng, thời gian giao do nhân viên xác nhận`);
    lines.push({ sku: item.sku, name: item.name, quantity, unitPrice: item.price, total: item.price * quantity });
  }
  notes.push("Chưa gồm phí vận chuyển và lắp đặt — nhân viên xác nhận theo địa chỉ");
  return { lines, subtotal: lines.reduce((s, l) => s + l.total, 0), notes };
}

/** Form admin: "living,dining" → ["living","dining"] (chấp nhận cả nhãn tiếng Việt) */
export function parseRooms(text: string): Room[] {
  const byLabel = new Map(ROOMS.map((r) => [ROOM_LABELS[r].toLowerCase(), r]));
  return [...new Set(text.split(/[,;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean).map((s) => (isRoom(s) ? s : byLabel.get(s))).filter((r): r is Room => !!r))];
}
