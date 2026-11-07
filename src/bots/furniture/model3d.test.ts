import { Document, NodeIO } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { inspectGlb, isGlb } from "./model3d";

/** Hộp rộng × cao × sâu (m) dưới dạng .glb */
async function box(w: number, h: number, d: number): Promise<Uint8Array> {
  const doc = new Document();
  const buf = doc.createBuffer();
  const [x, y, z] = [w / 2, h / 2, d / 2];
  const pos = doc.createAccessor().setType("VEC3").setBuffer(buf).setArray(new Float32Array([-x, -y, -z, x, -y, -z, x, y, -z, -x, y, -z, -x, -y, z, x, -y, z, x, y, z, -x, y, z]));
  const idx = doc.createAccessor().setType("SCALAR").setBuffer(buf).setArray(new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 1, 2, 6, 1, 6, 5, 0, 3, 7, 0, 7, 4]));
  const prim = doc.createPrimitive().setAttribute("POSITION", pos).setIndices(idx);
  const mesh = doc.createMesh().addPrimitive(prim);
  const node = doc.createNode().setMesh(mesh);
  doc.createScene().addChild(node);
  return new NodeIO().writeBinary(doc);
}

describe("kiểm tra file .glb", () => {
  it("đọc kích thước thật (cm) và đếm tam giác", async () => {
    const r = await inspectGlb(await box(2.1, 0.82, 0.9), { widthCm: 210, depthCm: 90, heightCm: 82 });
    expect(r.sizeCm).toEqual({ width: 210, height: 82, depth: 90 });
    expect(r.triangles).toBe(12);
    expect(r.warnings).toEqual([]);
  });

  it("chấp nhận mô hình xoay 90° nhưng cảnh báo khi lệch quá 15%", async () => {
    const rotated = await inspectGlb(await box(0.9, 0.82, 2.1), { widthCm: 210, depthCm: 90, heightCm: 82 });
    expect(rotated.warnings).toEqual([]);
    const wrong = await inspectGlb(await box(1, 1, 1), { widthCm: 210, depthCm: 90, heightCm: 82 });
    expect(wrong.warnings.join(" ")).toContain("lệch hơn 15%");
  });

  it("từ chối file không phải .glb", async () => {
    expect(isGlb(new TextEncoder().encode("hello world, this is not glb"))).toBe(false);
    await expect(inspectGlb(new TextEncoder().encode("hello world, this is not glb at all"))).rejects.toThrow(/glb/i);
  });
});

describe("mô hình demo", () => {
  it("sofa/bàn/kệ dựng từ khối có đúng kích thước thật", async () => {
    const { demoGlb } = await import("./demoModels");
    for (const item of [
      { name: "Sofa", category: "Sofa", color: "xám ghi", widthCm: 210, depthCm: 90, heightCm: 82 },
      { name: "Bàn trà", category: "Bàn trà", color: "nâu", widthCm: 100, depthCm: 50, heightCm: 35 },
      { name: "Kệ", category: "Kệ sách", color: "gỗ sáng", widthCm: 80, depthCm: 30, heightCm: 180 },
    ]) {
      const r = await inspectGlb(await demoGlb(item), item);
      expect(r.sizeCm).toEqual({ width: item.widthCm, height: item.heightCm, depth: item.depthCm });
      expect(r.warnings).toEqual([]);
    }
  });
});
