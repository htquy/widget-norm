import { Document, NodeIO, type Buffer as GltfBuffer, type Material } from "@gltf-transform/core";
import { colorHex } from "./design";
import type { FurnitureItem } from "./domain";

/**
 * Mô hình 3D mẫu (khối hộp ghép) cho dữ liệu demo — để thử xem 3D/AR khi shop demo chưa có file .glb thật.
 * Đúng kích thước thật của món (mét); đáy chạm y = 0, tâm ở gốc x/z.
 */
type Box = { c: [number, number, number]; s: [number, number, number]; color: string };

const hex = (c: string): [number, number, number, number] => {
  const n = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  return [n[0], n[1], n[2], 1];
};

function shade(c: string, k: number) {
  const n = [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(c.slice(i, i + 2), 16) * k))));
  return `#${n.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Ghép món từ các khối theo loại */
export function demoBoxes(i: Pick<FurnitureItem, "category" | "color" | "widthCm" | "depthCm" | "heightCm">): Box[] {
  const W = i.widthCm / 100;
  const D = i.depthCm / 100;
  const H = i.heightCm / 100;
  const base = colorHex(i.color);
  const dark = shade(base, 0.72);
  const wood = "#8a6040";
  const cat = i.category.toLowerCase();
  if (cat.includes("sofa")) {
    const leg = Math.min(0.15, H * 0.18);
    const arm = Math.min(0.2, W * 0.1);
    return [
      { c: [0, leg + (H * 0.4 - leg) / 2, 0], s: [W, H * 0.4 - leg, D], color: base },
      { c: [0, H * 0.7, -D / 2 + 0.11], s: [W - arm * 2, H * 0.6, 0.22], color: dark },
      { c: [-W / 2 + arm / 2, (leg + H * 0.65) / 2 + 0.05, 0], s: [arm, H * 0.65 - leg, D], color: dark },
      { c: [W / 2 - arm / 2, (leg + H * 0.65) / 2 + 0.05, 0], s: [arm, H * 0.65 - leg, D], color: dark },
      ...[-1, 1].map((k) => ({ c: [(k * (W - 0.1)) / 2, leg / 2, (k * (D - 0.1)) / 2] as [number, number, number], s: [0.06, leg, 0.06] as [number, number, number], color: wood })),
    ];
  }
  if (cat.includes("bàn") || cat.includes("ban ")) {
    const top = Math.max(0.03, H * 0.07);
    const lw = 0.06;
    return [
      { c: [0, H - top / 2, 0], s: [W, top, D], color: base },
      ...[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([a, b]) => ({ c: [(a * (W - lw * 2)) / 2, (H - top) / 2, (b * (D - lw * 2)) / 2] as [number, number, number], s: [lw, H - top, lw] as [number, number, number], color: wood })),
    ];
  }
  if (cat.includes("kệ")) {
    const shelves = Math.max(2, Math.round(H / 0.4));
    const t = 0.03;
    return [
      { c: [-W / 2 + t / 2, H / 2, 0], s: [t, H, D], color: base },
      { c: [W / 2 - t / 2, H / 2, 0], s: [t, H, D], color: base },
      { c: [0, H / 2, -D / 2 + 0.01], s: [W, H, 0.02], color: dark },
      ...Array.from({ length: shelves + 1 }, (_, k) => ({ c: [0, (k * (H - t)) / shelves + t / 2, 0] as [number, number, number], s: [W - t * 2, t, D] as [number, number, number], color: base })),
    ];
  }
  return [{ c: [0, H / 2, 0], s: [W, H, D], color: base }];
}

function addBox(doc: Document, buf: GltfBuffer, b: Box, materials: Map<string, Material>) {
  const [x, y, z] = b.c.map((v, k) => v) as [number, number, number];
  const [sx, sy, sz] = b.s.map((v) => v / 2) as [number, number, number];
  // 6 mặt × 4 đỉnh, pháp tuyến theo mặt
  const faces: { n: [number, number, number]; v: [number, number, number][] }[] = [
    { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { n: [0, 0, -1], v: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    { n: [1, 0, 0], v: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
    { n: [-1, 0, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
    { n: [0, 1, 0], v: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
    { n: [0, -1, 0], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
  ];
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  faces.forEach((f, fi) => {
    f.v.forEach((v) => {
      pos.push(x + v[0] * sx, y + v[1] * sy, z + v[2] * sz);
      nor.push(...f.n);
    });
    idx.push(fi * 4, fi * 4 + 1, fi * 4 + 2, fi * 4, fi * 4 + 2, fi * 4 + 3);
  });
  let mat = materials.get(b.color);
  if (!mat) {
    mat = doc.createMaterial(b.color).setBaseColorFactor(hex(b.color)).setRoughnessFactor(0.85).setMetallicFactor(0);
    materials.set(b.color, mat);
  }
  return doc
    .createPrimitive()
    .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setBuffer(buf).setArray(new Float32Array(pos)))
    .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setBuffer(buf).setArray(new Float32Array(nor)))
    .setIndices(doc.createAccessor().setType("SCALAR").setBuffer(buf).setArray(new Uint16Array(idx)))
    .setMaterial(mat);
}

export async function demoGlb(i: Pick<FurnitureItem, "category" | "color" | "widthCm" | "depthCm" | "heightCm" | "name">): Promise<Uint8Array> {
  const doc = new Document();
  const buf = doc.createBuffer();
  const materials = new Map<string, Material>();
  const mesh = doc.createMesh(i.name);
  for (const b of demoBoxes(i)) mesh.addPrimitive(addBox(doc, buf, b, materials));
  doc.createScene().addChild(doc.createNode(i.name).setMesh(mesh));
  return new NodeIO().writeBinary(doc);
}
