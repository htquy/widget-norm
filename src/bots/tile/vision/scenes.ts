/**
 * Phòng mẫu vẽ bằng code (không dùng ảnh bản quyền): khách chưa có ảnh vẫn ướm thử được ngay.
 * Mỗi phòng biết chính xác vùng sàn/tường/sân/mái (đa giác + 4 góc phối cảnh + kích thước thật),
 * nên không cần AI tách vùng.
 */
import type { SurfaceKind } from "@/bots/tile/domain/tile";
import type { Pt } from "./homography";

export interface SceneSurface {
  /** 4 góc phối cảnh (trên-trái, trên-phải, dưới-phải, dưới-trái), chuẩn hoá 0..1 */
  quad: Pt[];
  /** Vùng phủ gạch (mặc định = quad) */
  polys?: Pt[][];
  /** Phần bị che riêng cho bề mặt này (cửa sổ, gương...) */
  holes?: Pt[][];
  /** Kích thước thật của quad: rộng (cạnh trên) × sâu/cao/dài dốc (m) */
  widthM: number;
  depthM: number;
}

export interface Scene {
  id: string;
  name: string;
  surfaces: Partial<Record<SurfaceKind, SceneSurface>>;
  /** Bề mặt mở sẵn khi chọn phòng */
  start: SurfaceKind[];
  /** Đồ đạc che trước mọi bề mặt (sofa, tủ bếp, bồn tắm...) */
  occluders: Pt[][];
  draw(ctx: CanvasRenderingContext2D, w: number, h: number): void;
}

type Ctx = CanvasRenderingContext2D;

function poly(ctx: Ctx, w: number, h: number, pts: Pt[], fill: string | CanvasGradient) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}
const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];
function vgrad(ctx: Ctx, h: number, y0: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(0, y0 * h, 0, y1 * h);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function hgrad(ctx: Ctx, w: number, x0: number, x1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0 * w, 0, x1 * w, 0);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function glow(ctx: Ctx, w: number, h: number, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x * w, y * h, 0, x * w, y * h, r * w);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Hộp phòng: trần, tường sau, hai tường bên, sàn — tường sau là hình chữ nhật [bx0,by0]–[bx1,by1]. */
function roomBox(ctx: Ctx, w: number, h: number, b: [number, number, number, number], tone: { wall: string; side: string; ceil: string; floorFar: string; floorNear: string }) {
  const [bx0, by0, bx1, by1] = b;
  poly(ctx, w, h, [[0, 0], [1, 0], [bx1, by0], [bx0, by0]], vgrad(ctx, h, 0, by0, [[0, tone.ceil], [1, "#f6f4ef"]]));
  poly(ctx, w, h, rect(bx0, by0, bx1, by1), vgrad(ctx, h, by0, by1, [[0, tone.wall], [1, shade(tone.wall, -0.06)]]));
  poly(ctx, w, h, [[0, 0], [bx0, by0], [bx0, by1], [0, 1]], hgrad(ctx, w, 0, bx0, [[0, shade(tone.side, -0.1)], [1, tone.side]]));
  poly(ctx, w, h, [[1, 0], [bx1, by0], [bx1, by1], [1, 1]], hgrad(ctx, w, bx1, 1, [[0, shade(tone.side, -0.04)], [1, shade(tone.side, -0.16)]]));
  poly(ctx, w, h, [[bx0, by1], [bx1, by1], [1, 1], [0, 1]], vgrad(ctx, h, by1, 1, [[0, tone.floorFar], [1, tone.floorNear]]));
  // Len chân tường + đường giao tường
  ctx.strokeStyle = "rgba(0,0,0,0.12)";
  ctx.lineWidth = Math.max(1, w / 640);
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(bx0 * w, by1 * h);
  ctx.lineTo(bx1 * w, by1 * h);
  ctx.lineTo(w, h);
  ctx.moveTo(bx0 * w, by0 * h);
  ctx.lineTo(bx0 * w, by1 * h);
  ctx.moveTo(bx1 * w, by0 * h);
  ctx.lineTo(bx1 * w, by1 * h);
  ctx.stroke();
}

/** Làm sáng/tối màu hex theo tỉ lệ (-1..1) */
function shade(hex: string, k: number): string {
  const v = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(Math.min(255, Math.max(0, k >= 0 ? c + (255 - c) * k : c * (1 + k))));
  return `rgb(${f((v >> 16) & 255)},${f((v >> 8) & 255)},${f(v & 255)})`;
}

function windowPane(ctx: Ctx, w: number, h: number, r: Pt[], frame = "#fafafa") {
  const [[x0, y0], , [x1, y1]] = r;
  poly(ctx, w, h, r, vgrad(ctx, h, y0, y1, [[0, "#a9cbee"], [0.7, "#e3eef9"], [1, "#f4f8fc"]]));
  ctx.strokeStyle = frame;
  ctx.lineWidth = Math.max(2, w / 220);
  ctx.strokeRect(x0 * w, y0 * h, (x1 - x0) * w, (y1 - y0) * h);
  ctx.beginPath();
  ctx.moveTo(((x0 + x1) / 2) * w, y0 * h);
  ctx.lineTo(((x0 + x1) / 2) * w, y1 * h);
  ctx.stroke();
}

const LIVING_SOFA: Pt[] = [[0.04, 0.6], [0.4, 0.6], [0.4, 0.9], [0.04, 0.9]];
const LIVING_PLANT: Pt[] = [[0.82, 0.62], [0.93, 0.62], [0.93, 0.9], [0.82, 0.9]];
const KITCHEN_CABINETS: Pt[] = rect(0.2, 0.46, 0.8, 0.64);
const BATH_TUB: Pt[] = rect(0.24, 0.52, 0.47, 0.67);
const BATH_VANITY: Pt[] = rect(0.53, 0.47, 0.71, 0.62);
const BATH_MIRROR: Pt[] = rect(0.555, 0.2, 0.685, 0.41);

export const SCENES: Scene[] = [
  {
    id: "living",
    name: "Phòng khách",
    start: ["floor"],
    occluders: [LIVING_SOFA, LIVING_PLANT],
    surfaces: {
      floor: { quad: [[0.25, 0.6], [0.75, 0.6], [1, 1], [0, 1]], widthM: 4, depthM: 5 },
      wall: { quad: rect(0.25, 0.18, 0.75, 0.6), holes: [rect(0.42, 0.25, 0.62, 0.5)], widthM: 4, depthM: 2.9 },
    },
    draw(ctx, w, h) {
      roomBox(ctx, w, h, [0.25, 0.18, 0.75, 0.6], { wall: "#e9e3d8", side: "#dcd4c6", ceil: "#eeebe5", floorFar: "#b9b1a5", floorNear: "#8c8478" });
      windowPane(ctx, w, h, rect(0.42, 0.25, 0.62, 0.5));
      glow(ctx, w, h, 0.56, 0.7, 0.3, "rgba(255,248,235,0.35)");
      // Sofa
      poly(ctx, w, h, rect(0.05, 0.6, 0.39, 0.73), "#5f6f80");
      poly(ctx, w, h, rect(0.05, 0.73, 0.39, 0.78), "#7b8a9a");
      poly(ctx, w, h, rect(0.05, 0.78, 0.39, 0.89), "#56636f");
      poly(ctx, w, h, rect(0.04, 0.66, 0.08, 0.9), "#4c5864");
      poly(ctx, w, h, rect(0.36, 0.66, 0.4, 0.9), "#4c5864");
      poly(ctx, w, h, rect(0.11, 0.63, 0.18, 0.72), "#d9b26a");
      // Cây
      poly(ctx, w, h, [[0.835, 0.78], [0.915, 0.78], [0.9, 0.9], [0.85, 0.9]], "#c7c1b6");
      ctx.fillStyle = "#4f7a45";
      for (const [x, y, r] of [[0.875, 0.66, 0.035], [0.85, 0.71, 0.03], [0.9, 0.72, 0.03], [0.875, 0.75, 0.03]] as const) {
        ctx.beginPath();
        ctx.ellipse(x * w, y * h, r * w, r * w * 1.3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  {
    id: "kitchen",
    name: "Bếp",
    start: ["wall", "floor"],
    occluders: [KITCHEN_CABINETS],
    surfaces: {
      floor: { quad: [[0.2, 0.64], [0.8, 0.64], [1, 1], [0, 1]], widthM: 3.6, depthM: 3.5 },
      wall: { quad: rect(0.2, 0.33, 0.8, 0.46), widthM: 3.6, depthM: 0.6 },
    },
    draw(ctx, w, h) {
      roomBox(ctx, w, h, [0.2, 0.16, 0.8, 0.64], { wall: "#ece8e1", side: "#ddd7cc", ceil: "#f1efea", floorFar: "#b3aca2", floorNear: "#8f887e" });
      // Tủ trên
      poly(ctx, w, h, rect(0.2, 0.17, 0.8, 0.33), "#b48a5e");
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.lineWidth = Math.max(1, w / 700);
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo((0.2 + i * 0.1) * w, 0.17 * h);
        ctx.lineTo((0.2 + i * 0.1) * w, 0.33 * h);
        ctx.stroke();
      }
      poly(ctx, w, h, rect(0.2, 0.325, 0.8, 0.335), "rgba(0,0,0,0.18)");
      // Mặt đá + tủ dưới
      poly(ctx, w, h, rect(0.2, 0.455, 0.8, 0.475), "#3b3b3e");
      poly(ctx, w, h, rect(0.2, 0.475, 0.8, 0.62), vgrad(ctx, h, 0.475, 0.62, [[0, "#c39a6c"], [1, "#a57d52"]]));
      poly(ctx, w, h, rect(0.2, 0.62, 0.8, 0.64), "#2b2b2b");
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo((0.2 + i * 0.1) * w, 0.48 * h);
        ctx.lineTo((0.2 + i * 0.1) * w, 0.62 * h);
        ctx.stroke();
      }
      // Chậu rửa + vòi + bếp
      poly(ctx, w, h, rect(0.3, 0.452, 0.4, 0.46), "#9aa1a8");
      ctx.strokeStyle = "#8d949b";
      ctx.lineWidth = Math.max(2, w / 300);
      ctx.beginPath();
      ctx.moveTo(0.35 * w, 0.455 * h);
      ctx.lineTo(0.35 * w, 0.41 * h);
      ctx.lineTo(0.37 * w, 0.41 * h);
      ctx.stroke();
      poly(ctx, w, h, rect(0.58, 0.448, 0.7, 0.457), "#1d1d1f");
      glow(ctx, w, h, 0.5, 0.42, 0.25, "rgba(255,244,220,0.28)");
    },
  },
  {
    id: "bathroom",
    name: "Phòng tắm",
    start: ["wall", "floor"],
    occluders: [BATH_TUB, BATH_VANITY],
    surfaces: {
      floor: { quad: [[0.24, 0.67], [0.76, 0.67], [1, 1], [0, 1]], widthM: 2.6, depthM: 2.4 },
      wall: { quad: rect(0.24, 0.12, 0.76, 0.67), holes: [BATH_MIRROR], widthM: 2.6, depthM: 2.7 },
    },
    draw(ctx, w, h) {
      roomBox(ctx, w, h, [0.24, 0.12, 0.76, 0.67], { wall: "#e7e7e4", side: "#d6d6d2", ceil: "#efefec", floorFar: "#b0b0ac", floorNear: "#8a8a86" });
      // Gương + đèn
      poly(ctx, w, h, BATH_MIRROR, vgrad(ctx, h, 0.2, 0.41, [[0, "#cfd9e0"], [1, "#a9b6bf"]]));
      glow(ctx, w, h, 0.62, 0.18, 0.18, "rgba(255,247,225,0.45)");
      // Lavabo
      poly(ctx, w, h, rect(0.53, 0.47, 0.71, 0.49), "#f4f4f2");
      poly(ctx, w, h, rect(0.54, 0.49, 0.7, 0.62), "#7d6a58");
      // Bồn tắm
      poly(ctx, w, h, rect(0.24, 0.52, 0.47, 0.545), "#fafafa");
      poly(ctx, w, h, rect(0.24, 0.545, 0.47, 0.67), vgrad(ctx, h, 0.545, 0.67, [[0, "#f6f6f4"], [1, "#d9d9d6"]]));
      ctx.strokeStyle = "#a7adb3";
      ctx.lineWidth = Math.max(2, w / 320);
      ctx.beginPath();
      ctx.moveTo(0.3 * w, 0.52 * h);
      ctx.lineTo(0.3 * w, 0.44 * h);
      ctx.lineTo(0.33 * w, 0.44 * h);
      ctx.stroke();
    },
  },
  {
    id: "garden",
    name: "Sân vườn",
    start: ["outdoor"],
    occluders: [],
    surfaces: {
      outdoor: { quad: [[0.3, 0.52], [0.7, 0.52], [0.94, 1], [0.06, 1]], widthM: 4, depthM: 7 },
      wall: { quad: rect(0.18, 0.13, 0.82, 0.52), holes: [rect(0.45, 0.28, 0.55, 0.52), rect(0.24, 0.24, 0.36, 0.4), rect(0.64, 0.24, 0.76, 0.4)], widthM: 8, depthM: 3.2 },
    },
    draw(ctx, w, h) {
      poly(ctx, w, h, rect(0, 0, 1, 0.55), vgrad(ctx, h, 0, 0.55, [[0, "#8fbde6"], [1, "#dcebf6"]]));
      // Nhà phía sau
      poly(ctx, w, h, [[0.14, 0.13], [0.86, 0.13], [0.82, 0.08], [0.18, 0.08]], "#7b4b38");
      poly(ctx, w, h, rect(0.18, 0.13, 0.82, 0.52), vgrad(ctx, h, 0.13, 0.52, [[0, "#efe4d2"], [1, "#ddd0bb"]]));
      poly(ctx, w, h, rect(0.45, 0.28, 0.55, 0.52), "#6c4a33");
      windowPane(ctx, w, h, rect(0.24, 0.24, 0.36, 0.4), "#6c4a33");
      windowPane(ctx, w, h, rect(0.64, 0.24, 0.76, 0.4), "#6c4a33");
      // Bãi cỏ + lối sân
      poly(ctx, w, h, rect(0, 0.52, 1, 1), vgrad(ctx, h, 0.52, 1, [[0, "#7fa65a"], [1, "#4f7a35"]]));
      poly(ctx, w, h, [[0.3, 0.52], [0.7, 0.52], [0.94, 1], [0.06, 1]], vgrad(ctx, h, 0.52, 1, [[0, "#c9c2b5"], [1, "#9c958a"]]));
      glow(ctx, w, h, 0.62, 0.7, 0.35, "rgba(255,250,230,0.25)");
      // Chậu cây hai bên
      for (const [x, y, s] of [[0.13, 0.7, 1], [0.87, 0.7, 1], [0.24, 0.56, 0.6], [0.76, 0.56, 0.6]] as const) {
        poly(ctx, w, h, [[x - 0.035 * s, y], [x + 0.035 * s, y], [x + 0.025 * s, y + 0.08 * s], [x - 0.025 * s, y + 0.08 * s]], "#a8644a");
        ctx.fillStyle = "#3f6b2f";
        ctx.beginPath();
        ctx.ellipse(x * w, (y - 0.04 * s) * h, 0.05 * s * w, 0.06 * s * h, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  {
    id: "roof",
    name: "Mái nhà",
    start: ["roof"],
    occluders: [],
    surfaces: {
      roof: { quad: [[0.2, 0.14], [0.8, 0.14], [0.94, 0.5], [0.06, 0.5]], widthM: 10, depthM: 4.5 },
      wall: { quad: rect(0.12, 0.53, 0.88, 0.86), holes: [rect(0.2, 0.6, 0.32, 0.74), rect(0.68, 0.6, 0.8, 0.74), rect(0.45, 0.62, 0.55, 0.86)], widthM: 9, depthM: 3.2 },
    },
    draw(ctx, w, h) {
      poly(ctx, w, h, rect(0, 0, 1, 1), vgrad(ctx, h, 0, 0.9, [[0, "#7fb3e3"], [1, "#e4eff8"]]));
      poly(ctx, w, h, rect(0, 0.86, 1, 1), vgrad(ctx, h, 0.86, 1, [[0, "#7ea25a"], [1, "#55783a"]]));
      // Mái (nền xám để thấy rõ ánh sáng) + diềm mái
      poly(ctx, w, h, [[0.2, 0.14], [0.8, 0.14], [0.94, 0.5], [0.06, 0.5]], vgrad(ctx, h, 0.14, 0.5, [[0, "#8d8a86"], [1, "#6f6c68"]]));
      glow(ctx, w, h, 0.62, 0.28, 0.3, "rgba(255,250,235,0.25)");
      poly(ctx, w, h, rect(0.05, 0.5, 0.95, 0.53), "#e9e6e0");
      poly(ctx, w, h, rect(0.19, 0.125, 0.81, 0.14), "#5a5753");
      // Tường mặt tiền
      poly(ctx, w, h, rect(0.12, 0.53, 0.88, 0.86), vgrad(ctx, h, 0.53, 0.86, [[0, "#d9d2c5"], [1, "#f1ece2"]]));
      windowPane(ctx, w, h, rect(0.2, 0.6, 0.32, 0.74), "#f5f5f5");
      windowPane(ctx, w, h, rect(0.68, 0.6, 0.8, 0.74), "#f5f5f5");
      poly(ctx, w, h, rect(0.45, 0.62, 0.55, 0.86), "#6c4a33");
    },
  },
];

/** Vẽ phòng mẫu ra canvas (mặc định 1280×853 ≈ 3:2). */
export function renderScene(scene: Scene, w = 1280, h = 853): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  scene.draw(c.getContext("2d")!, w, h);
  return c;
}
