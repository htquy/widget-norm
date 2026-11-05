import { fold } from "@/domain/text";

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
