/**
 * Hình học "kê thử": toạ độ sàn thật (cm) ↔ ảnh (0..1) qua homography của 4 góc sàn,
 * vị trí mặc định của từng món theo loại phòng, kiểm tra ra ngoài phòng / chồng lên nhau.
 * Thuần tính toán — có test.
 */
import { apply, homography, type Pt } from "@/bots/tile/vision/homography";
import { fold } from "@/domain/text";

export interface Placed {
  key: string;
  itemId: string;
  name: string;
  category: string;
  color: string;
  price: number;
  /** Ảnh thật tách nền (PNG trong suốt) — rỗng thì vẽ minh hoạ theo số đo */
  cutoutUrl?: string;
  /** Mô hình 3D đã duyệt */
  modelUrl?: string;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  /** Tâm món trên sàn (cm): x theo chiều rộng phòng, y từ tường trong (0) ra phía người chụp */
  x: number;
  y: number;
  /** Xoay 90° (đặt dọc tường bên) — chỉ dùng khi chưa có `angle` */
  rot: boolean;
  /** Góc xoay tự do quanh trục đứng (độ). 0 = mặt trước quay về phía người chụp; 90 = hướng sang phải; 270 = sang trái */
  angle?: number;
}

/** Góc xoay hiệu lực (độ, 0..359) */
export const yawDeg = (p: Pick<Placed, "rot" | "angle">) => (((p.angle ?? (p.rot ? 90 : 0)) % 360) + 360) % 360;

/** Hướng mặt trước của món trên mặt sàn (vector đơn vị: x sang phải, y về phía người chụp) */
export const frontVector = (p: Pick<Placed, "rot" | "angle">): Pt => {
  const a = (yawDeg(p) * Math.PI) / 180;
  return [Math.sin(a), Math.cos(a)];
};

/** Góc xoay (độ) để mặt trước hướng về điểm (px, py) trên sàn, nhìn từ tâm (cx, cy) */
export const angleToward = (cx: number, cy: number, px: number, py: number) => (((Math.atan2(px - cx, py - cy) * 180) / Math.PI) % 360 + 360) % 360;

export interface Floor {
  /** 4 góc vùng sàn trên ảnh (0..1): trên-trái, trên-phải, dưới-phải, dưới-trái */
  quad: Pt[];
  widthCm: number;
  depthCm: number;
}

/** Hình chữ nhật bao (theo trục sàn) của chân đồ sau khi xoay */
export const footprint = (p: Pick<Placed, "widthCm" | "depthCm" | "rot" | "angle">) => {
  const a = (yawDeg(p) * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  const r = (v: number) => Math.round(v * 100) / 100;
  return { w: r(p.widthCm * c + p.depthCm * s), d: r(p.widthCm * s + p.depthCm * c) };
};

/** 4 góc chân đồ (cm) sau khi xoay: trước-trái, trước-phải… theo thứ tự quanh chu vi */
export function footCorners(p: Placed): Pt[] {
  const a = (yawDeg(p) * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const hw = p.widthCm / 2;
  const hd = p.depthCm / 2;
  // (u, v) cục bộ: u sang phải của món, v về phía mặt trước; xoay theo yaw
  return ([[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]] as Pt[]).map(([u, v]) => [p.x + u * c + v * s, p.y - u * s + v * c] as Pt);
}

export function floorToImage(f: Floor) {
  return homography(
    [
      [0, 0],
      [f.widthCm, 0],
      [f.widthCm, f.depthCm],
      [0, f.depthCm],
    ],
    f.quad,
  );
}
export function imageToFloor(f: Floor) {
  return homography(f.quad, [
    [0, 0],
    [f.widthCm, 0],
    [f.widthCm, f.depthCm],
    [0, f.depthCm],
  ]);
}

/** Đa giác chân đồ trên ảnh (0..1) + tỉ lệ px/cm ở mép trước (để vẽ chiều cao) */
export function project(f: Floor, p: Placed, imgW: number, imgH: number) {
  const H = floorToImage(f);
  const { w, d } = footprint(p);
  // Đa giác để vẽ bóng / chọn: hình chữ nhật xoay thật
  const poly = footCorners(p).map((c) => apply(H, c)).map(([u, v]) => [u * imgW, v * imgH] as Pt);
  // Cạnh trước của hộp bao (theo trục sàn) — để co giãn ảnh phẳng như trước
  const fl = apply(H, [p.x - w / 2, p.y + d / 2]);
  const fr = apply(H, [p.x + w / 2, p.y + d / 2]);
  const frontWidthPx = Math.hypot((fr[0] - fl[0]) * imgW, (fr[1] - fl[1]) * imgH);
  const pxPerCm = frontWidthPx / w;
  const base: Pt = [((fl[0] + fr[0]) / 2) * imgW, ((fl[1] + fr[1]) / 2) * imgH];
  // Tâm chân đồ trên ảnh + tỉ lệ px/cm ngang + độ chúi camera (suy từ độ co dọc của sàn) — để dựng mô hình 3D đúng góc nhìn
  const c0 = apply(H, [p.x, p.y]);
  const cx = apply(H, [p.x + 50, p.y]);
  const cy = apply(H, [p.x, p.y + 50]);
  const center: Pt = [c0[0] * imgW, c0[1] * imgH];
  const pxPerCmX = Math.hypot((cx[0] - c0[0]) * imgW, (cx[1] - c0[1]) * imgH) / 50;
  const pxPerCmY = Math.hypot((cy[0] - c0[0]) * imgW, (cy[1] - c0[1]) * imgH) / 50;
  const pitchDeg = (Math.asin(Math.min(0.85, Math.max(0.12, pxPerCmY / Math.max(1e-6, pxPerCmX)))) * 180) / Math.PI;
  return { poly, pxPerCm, base, frontWidthPx, heightPx: p.heightCm * pxPerCm, center, pxPerCmX, pitchDeg };
}

/** Món có nằm trọn trong vùng sàn không */
export function insideFloor(f: Pick<Floor, "widthCm" | "depthCm">, p: Placed): boolean {
  const { w, d } = footprint(p);
  return p.x - w / 2 >= -1 && p.x + w / 2 <= f.widthCm + 1 && p.y - d / 2 >= -1 && p.y + d / 2 <= f.depthCm + 1;
}

/** Hai món chồng lên nhau (cho phép ghế lọt gầm bàn ăn) */
export function overlaps(a: Placed, b: Placed): boolean {
  const ca = fold(a.category);
  const cb = fold(b.category);
  const chairTable = (x: string, y: string) => x.includes("ghe") && y.includes("ban an");
  if (chairTable(ca, cb) || chairTable(cb, ca)) return false;
  const fa = footprint(a);
  const fb = footprint(b);
  return Math.abs(a.x - b.x) * 2 < fa.w + fb.w - 2 && Math.abs(a.y - b.y) * 2 < fa.d + fb.d - 2;
}

/**
 * Đặt mô hình 3D vừa khớp số đo catalogue: thử xoay 90° quanh trục đứng nếu như vậy khớp rộng × sâu hơn,
 * rồi co giãn từng trục về đúng số đo (cm) — số đo shop nhập là chuẩn, mô hình chỉ cho hình dáng.
 * size = kích thước bao của mô hình gốc (MÉT, theo chuẩn glTF; trục x rộng, y cao, z sâu).
 */
export function fitModel(size: { x: number; y: number; z: number }, target: { widthCm: number; depthCm: number; heightCm: number }) {
  const err = (w: number, d: number) => Math.abs(Math.log((w * 100) / target.widthCm)) + Math.abs(Math.log((d * 100) / target.depthCm));
  const rotated = err(size.z, size.x) < err(size.x, size.z);
  const sw = rotated ? size.z : size.x;
  const sd = rotated ? size.x : size.z;
  return {
    rotY: rotated ? Math.PI / 2 : 0,
    /** Hệ số co giãn theo trục của mô hình GỐC (trước khi xoay), mét → để dựng ở đơn vị mét thì nhân với 0,01 đã có sẵn */
    scale: rotated
      ? { x: target.depthCm / 100 / size.x, y: target.heightCm / 100 / size.y, z: target.widthCm / 100 / size.z }
      : { x: target.widthCm / 100 / size.x, y: target.heightCm / 100 / size.y, z: target.depthCm / 100 / size.z },
    rotated,
    /** Lệch tỉ lệ rộng/sâu so với catalogue sau khi xoay (0 = khớp) */
    distortion: Math.max(Math.abs((sw * 100) / target.widthCm - 1), Math.abs((sd * 100) / target.depthCm - 1)),
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Vị trí mặc định khi kê cả bộ: sofa/giường áp tường trong, bàn trà trước sofa 45 cm,
 * tủ/kệ áp tường bên (xoay), bàn ăn giữa phòng, ghế chia hai bên bàn.
 */
export function autoLayout(f: Pick<Floor, "widthCm" | "depthCm">, items: Omit<Placed, "x" | "y" | "rot">[]): Placed[] {
  const W = f.widthCm;
  const D = f.depthCm;
  const out: Placed[] = [];
  const find = (k: string) => out.find((p) => fold(p.category).includes(k));
  let leftY = 20;
  let rightY = 20;
  const chairs = items.filter((i) => fold(i.category).includes("ghe"));
  for (const it of items) {
    const c = fold(it.category);
    if (c.includes("ghe")) continue;
    let p: Placed;
    if (c.includes("sofa") || c.includes("giuong")) {
      p = { ...it, rot: false, x: W / 2, y: it.depthCm / 2 + 5 };
    } else if (c.includes("ban tra")) {
      const sofa = find("sofa");
      p = { ...it, rot: false, x: sofa?.x ?? W / 2, y: sofa ? sofa.y + sofa.depthCm / 2 + 45 + it.depthCm / 2 : D / 2 };
    } else if (c.includes("ban an")) {
      p = { ...it, rot: false, x: W / 2, y: D / 2 };
    } else if (c.includes("tu") || c.includes("ke sach")) {
      p = { ...it, rot: true, angle: 90, x: it.depthCm / 2 + 3, y: leftY + it.widthCm / 2 };
      leftY += it.widthCm + 20;
    } else {
      // Kệ tivi, bàn làm việc… áp tường phải
      p = { ...it, rot: true, angle: 270, x: W - it.depthCm / 2 - 3, y: rightY + it.widthCm / 2 + (c.includes("ke tivi") ? 60 : 0) };
      rightY += it.widthCm + 20;
    }
    p.x = clamp(p.x, footprint(p).w / 2, W - footprint(p).w / 2);
    p.y = clamp(p.y, footprint(p).d / 2, D - footprint(p).d / 2);
    out.push(p);
  }
  const table = find("ban an");
  chairs.forEach((ch, i) => {
    const t = table ?? { x: W / 2, y: D / 2, widthCm: 120, depthCm: 80 };
    const perSide = Math.ceil(chairs.length / 2);
    const side = i < perSide ? -1 : 1;
    const k = side < 0 ? i : i - perSide;
    const n = side < 0 ? perSide : chairs.length - perSide;
    const x = t.x - t.widthCm / 2 + ((k + 0.5) * t.widthCm) / n;
    const y = t.y + side * (t.depthCm / 2 + ch.depthCm / 2 - 12);
    out.push({ ...ch, rot: false, x, y: clamp(y, ch.depthCm / 2, D - ch.depthCm / 2) });
  });
  return out;
}
