/** Tiện ích văn bản/tiền tệ dùng chung cho mọi loại bot */

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

export function slugify(s: string): string {
  return fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}
