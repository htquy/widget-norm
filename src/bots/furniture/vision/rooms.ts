/**
 * Phòng mẫu trống vẽ bằng code (không dùng ảnh bản quyền): khách chưa có ảnh vẫn kê thử được ngay.
 * Mỗi phòng biết chính xác 4 góc sàn và kích thước thật nên không cần AI.
 */
import type { Pt } from "@/bots/tile/vision/homography";
import type { Room } from "../domain";

export interface SampleRoom {
  id: string;
  name: string;
  room: Room;
  quad: Pt[];
  widthM: number;
  depthM: number;
  colors: { wall: string; side: string; floor: string; plank: string };
}

export const SAMPLE_ROOMS: SampleRoom[] = [
  { id: "living", name: "Phòng khách 4×5 m", room: "living", quad: [[0.22, 0.58], [0.78, 0.58], [1, 0.98], [0, 0.98]], widthM: 4, depthM: 5, colors: { wall: "#ece6dc", side: "#e0d8cb", floor: "#b99470", plank: "#a27f5d" } },
  { id: "bedroom", name: "Phòng ngủ 3,5×4 m", room: "bedroom", quad: [[0.2, 0.6], [0.8, 0.6], [1, 0.98], [0, 0.98]], widthM: 3.5, depthM: 4, colors: { wall: "#e5e8e4", side: "#d8ddd8", floor: "#c4a27c", plank: "#ad8b66" } },
  { id: "dining", name: "Phòng ăn 3,5×3,5 m", room: "dining", quad: [[0.2, 0.6], [0.8, 0.6], [1, 0.98], [0, 0.98]], widthM: 3.5, depthM: 3.5, colors: { wall: "#efe8dd", side: "#e3d9ca", floor: "#a9a39a", plank: "#98928a" } },
];

export function drawSampleRoom(r: SampleRoom, w = 1280, h = 853): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const [tl, tr, br, bl] = r.quad.map(([x, y]) => [x * w, y * h] as Pt);
  const top = h * 0.08;
  // Trần, tường trong, tường bên
  ctx.fillStyle = "#f4f2ee";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = r.colors.wall;
  ctx.fillRect(tl[0], top, tr[0] - tl[0], tl[1] - top);
  ctx.fillStyle = r.colors.side;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(tl[0], top);
  ctx.lineTo(tl[0], tl[1]);
  ctx.lineTo(bl[0], bl[1]);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(tr[0], top);
  ctx.lineTo(tr[0], tr[1]);
  ctx.lineTo(br[0], br[1]);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  // Sàn gỗ/gạch theo phối cảnh
  const g = ctx.createLinearGradient(0, tl[1], 0, h);
  g.addColorStop(0, r.colors.plank);
  g.addColorStop(1, r.colors.floor);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(tl[0], tl[1]);
  ctx.lineTo(tr[0], tr[1]);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1.5;
  for (let k = 1; k < 12; k++) {
    const t = k / 12;
    ctx.beginPath();
    ctx.moveTo(tl[0] + (tr[0] - tl[0]) * t, tl[1]);
    ctx.lineTo(bl[0] + (br[0] - bl[0]) * t - (0.5 - t) * w * 0.02, h);
    ctx.stroke();
  }
  // Cửa sổ + chân tường
  const wx = tl[0] + (tr[0] - tl[0]) * 0.32;
  const ww = (tr[0] - tl[0]) * 0.36;
  const wy = top + (tl[1] - top) * 0.15;
  const wh = (tl[1] - top) * 0.5;
  const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
  sky.addColorStop(0, "#cfe3f1");
  sky.addColorStop(1, "#eef5f8");
  ctx.fillStyle = sky;
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 8;
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy);
  ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.06)";
  ctx.fillRect(tl[0], tl[1] - 10, tr[0] - tl[0], 10);
  // Ánh sáng cửa sổ hắt xuống sàn
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.78, 10, w * 0.5, h * 0.78, w * 0.35);
  glow.addColorStop(0, "rgba(255,250,235,0.28)");
  glow.addColorStop(1, "rgba(255,250,235,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, tl[1], w, h - tl[1]);
  return c;
}
