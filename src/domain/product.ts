export interface Product {
  id: string;
  tenantId: string;
  sku: string;
  name: string;
  category: string;
  /** VND; 0 = liên hệ để biết giá */
  price: number;
  description: string;
  /** Link trang sản phẩm trên web shop */
  url: string;
  imageUrl: string;
  tags: string[];
  inStock: boolean;
  active: boolean;
  createdAt: Date;
}

export const MAX_DESCRIPTION_LENGTH = 4000;

export const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")} ₫`;
export const priceText = (n: number) => (n > 0 ? formatVnd(n) : "Liên hệ");

/** Bỏ dấu tiếng Việt + chữ thường — dùng cho tìm kiếm và bot theo luật */
export const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

const STOP = new Set(
  "cho toi minh em anh chi ban shop co khong ko la gi nao the nhu va voi cua can muon xem hoi tu van mua ban giup nhe a ah oi duoc dang con bao nhieu gia".split(" "),
);

export function keywords(text: string): string[] {
  return [...new Set(fold(text).split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP.has(w)))];
}

/** Điểm khớp đơn giản (không cần full-text search): tên ×3, danh mục/tag ×2, mô tả ×1 */
export function scoreProduct(p: Product, words: string[]): number {
  if (words.length === 0) return 0;
  const name = fold(`${p.name} ${p.sku}`);
  const cat = fold(`${p.category} ${p.tags.join(" ")}`);
  const desc = fold(p.description);
  let s = 0;
  for (const w of words) {
    if (name.includes(w)) s += 3;
    if (cat.includes(w)) s += 2;
    if (desc.includes(w)) s += 1;
  }
  return s;
}
