import { fold } from "@/domain/text";
import { colorHex } from "./design";

/**
 * Hình nhìn thẳng của một món nội thất, vẽ bằng SVG theo đúng tỉ lệ rộng × cao thật (viewBox tính bằng cm).
 * Dùng cho: ảnh demo, thẻ khi shop chưa có ảnh, và "kê thử" trên ảnh phòng (ảnh sản phẩm thật có nền
 * nên không kê lên ảnh phòng được). Thuần chuỗi — chạy được cả server lẫn trình duyệt.
 */
export function furnitureSvg(i: { category: string; color: string; widthCm: number; heightCm: number; depthCm: number }, opts: { pad?: number } = {}): string {
  const W = i.widthCm;
  const H = i.heightCm;
  const pad = opts.pad ?? 0;
  const c = colorHex(i.color);
  const dark = shade(c, -0.28);
  const light = shade(c, 0.18);
  const wood = "#8a6040";
  const cat = fold(i.category);
  let body: string;
  const leg = (x: number, h: number, w = Math.max(3, W * 0.025)) => `<rect x="${x - w / 2}" y="${H - h}" width="${w}" height="${h}" fill="${wood}"/>`;

  if (cat.includes("sofa")) {
    const legH = Math.min(15, H * 0.16);
    const seatY = H * 0.5;
    const arm = Math.min(22, W * 0.1);
    body =
      `<rect x="${arm * 0.6}" y="${H * 0.05}" width="${W - arm * 1.2}" height="${seatY}" rx="8" fill="${dark}"/>` +
      `<rect x="0" y="${H * 0.36}" width="${arm}" height="${H - legH - H * 0.36}" rx="6" fill="${dark}"/>` +
      `<rect x="${W - arm}" y="${H * 0.36}" width="${arm}" height="${H - legH - H * 0.36}" rx="6" fill="${dark}"/>` +
      `<rect x="${arm}" y="${seatY}" width="${W - arm * 2}" height="${H - legH - seatY}" rx="5" fill="${c}"/>` +
      cushions(arm, seatY - 2, W - arm * 2, Math.max(1, Math.round((W - arm * 2) / 70)), light) +
      leg(arm * 0.6, legH) + leg(W - arm * 0.6, legH);
  } else if (cat.includes("giuong")) {
    const headH = H;
    const frameY = H * 0.55;
    body =
      `<rect x="0" y="0" width="${W}" height="${headH * 0.6}" rx="6" fill="${dark}"/>` +
      `<rect x="${W * 0.03}" y="${frameY - 14}" width="${W * 0.94}" height="18" rx="6" fill="#f4f2ee"/>` +
      `<rect x="0" y="${frameY}" width="${W}" height="${H - frameY - 8}" rx="3" fill="${c}"/>` +
      `<rect x="${W * 0.1}" y="${frameY - 26}" width="${W * 0.32}" height="14" rx="6" fill="#ffffff"/><rect x="${W * 0.58}" y="${frameY - 26}" width="${W * 0.32}" height="14" rx="6" fill="#ffffff"/>` +
      leg(6, 8) + leg(W - 6, 8);
  } else if (cat.includes("tu")) {
    const doors = Math.max(1, Math.round(W / 50));
    let d = "";
    for (let k = 0; k < doors; k++) d += `<rect x="${(k * W) / doors + 1.5}" y="2" width="${W / doors - 3}" height="${H - 10}" fill="${c}" stroke="${dark}" stroke-width="1.5"/><rect x="${((k + 0.5) * W) / doors + (k % 2 ? -6 : 4)}" y="${H * 0.45}" width="2" height="16" fill="${dark}"/>`;
    body = `<rect x="0" y="0" width="${W}" height="${H - 6}" fill="${dark}"/>${d}<rect x="0" y="${H - 6}" width="${W}" height="6" fill="${dark}"/>`;
  } else if (cat.includes("ke sach") || cat.includes("ke trang tri")) {
    const shelves = Math.max(2, Math.round(H / 36));
    let s = "";
    for (let k = 1; k < shelves; k++) {
      const y = (k * H) / shelves;
      s += `<rect x="4" y="${y}" width="${W - 8}" height="3" fill="${dark}"/>`;
      for (let b = 0; b < 4; b++) s += `<rect x="${8 + b * ((W - 16) / 5)}" y="${y - (H / shelves) * 0.7}" width="${(W - 16) / 7}" height="${(H / shelves) * 0.7}" fill="${["#b3543b", "#3f6e8c", "#d9b25c", "#6b7d5c"][b]}" opacity="0.85"/>`;
    }
    body = `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${dark}" stroke-width="4"/>${s}`;
  } else if (cat.includes("ke tivi")) {
    body = `<rect x="0" y="0" width="${W}" height="${H - 8}" rx="2" fill="${c}"/><rect x="${W * 0.05}" y="${H * 0.25}" width="${W * 0.28}" height="${H * 0.45}" fill="${dark}" opacity="0.5"/><rect x="${W * 0.67}" y="${H * 0.25}" width="${W * 0.28}" height="${H * 0.45}" fill="${dark}" opacity="0.5"/>` + leg(W * 0.08, 8) + leg(W * 0.92, 8);
  } else if (cat.includes("ghe")) {
    const seatY = H * 0.55;
    body = `<rect x="${W * 0.12}" y="0" width="${W * 0.76}" height="${seatY}" rx="6" fill="${c}"/><rect x="0" y="${seatY}" width="${W}" height="7" rx="3" fill="${dark}"/>` + leg(4, H - seatY - 7) + leg(W - 4, H - seatY - 7);
  } else {
    // Bàn (ăn, trà, làm việc) và mặc định
    const top = Math.max(3, H * 0.06);
    const round = cat.includes("tra") && Math.abs(W - i.depthCm) < 5;
    body = round
      ? `<ellipse cx="${W / 2}" cy="${top}" rx="${W / 2}" ry="${top}" fill="${c}"/><rect x="${W / 2 - 4}" y="${top}" width="8" height="${H - top - 4}" fill="${wood}"/><ellipse cx="${W / 2}" cy="${H - 3}" rx="${W * 0.22}" ry="3" fill="${wood}"/>`
      : `<rect x="0" y="0" width="${W}" height="${top}" rx="1.5" fill="${c}"/>` + (cat.includes("lam viec") ? `<rect x="${W * 0.62}" y="${top}" width="${W * 0.34}" height="${H * 0.22}" fill="${dark}"/>` : "") + leg(W * 0.05, H - top) + leg(W * 0.95, H - top);
  }
  const vb = `${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${W + pad * 2}" height="${H + pad * 2}" preserveAspectRatio="xMidYMax meet">${body}</svg>`;
}

function cushions(x: number, y: number, w: number, n: number, fill: string) {
  let s = "";
  for (let k = 0; k < n; k++) s += `<rect x="${x + (k * w) / n + 2}" y="${y - 22}" width="${w / n - 4}" height="24" rx="7" fill="${fill}"/>`;
  return s;
}

/** Ảnh thẻ (nền sáng, có lề) cho món chưa có ảnh */
export function furnitureCardSvg(i: Parameters<typeof furnitureSvg>[0], cutoutUrl = ""): string {
  const inner = cutoutUrl
    ? `<image href="${cutoutUrl}" x="0" y="0" width="${i.widthCm}" height="${i.heightCm}" preserveAspectRatio="xMidYMax meet"/>`
    : furnitureSvg(i).replace(/^<svg[^>]*>|<\/svg>$/g, "");
  const side = Math.max(i.widthCm, i.heightCm) * 1.25;
  const ox = (side - i.widthCm) / 2;
  const oy = side * 0.88 - i.heightCm;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side * 1.33} ${side}" width="400" height="300"><rect width="100%" height="100%" fill="#f3eee6"/><rect y="${side * 0.88}" width="100%" height="${side * 0.12}" fill="#e4dccf"/><g transform="translate(${ox + side * 0.165} ${oy})">${inner}</g></svg>`;
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

function shade(hex: string, amt: number): string {
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const out = n.map((v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt))));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
