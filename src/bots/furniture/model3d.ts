import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/functions";
import { DomainError } from "@/domain/errors";

/**
 * Kiểm tra file .glb shop tải lên: đúng định dạng, không quá nặng cho điện thoại, và kích thước thật
 * có khớp số đo shop đã nhập (rộng × sâu × cao) không. Mô hình nén Draco/Meshopt không đọc được ở server
 * thì vẫn nhận (chỉ kiểm định dạng + dung lượng) và báo là chưa đối chiếu được kích thước.
 */
export const MAX_GLB_BYTES = 40 * 1024 * 1024;
/** Trên ngưỡng này điện thoại tải chậm — khuyến nghị nén */
export const HEAVY_GLB_BYTES = 8 * 1024 * 1024;

export interface GlbReport {
  bytes: number;
  /** Kích thước bao của mô hình (cm), theo mét × 100; trục: rộng (x), cao (y), sâu (z) */
  sizeCm: { width: number; height: number; depth: number } | null;
  triangles: number | null;
  warnings: string[];
}

export function isGlb(bytes: Uint8Array): boolean {
  return bytes.length > 20 && bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46 && new DataView(bytes.buffer, bytes.byteOffset).getUint32(4, true) === 2;
}

export async function inspectGlb(bytes: Uint8Array, expected?: { widthCm: number; depthCm: number; heightCm: number }): Promise<GlbReport> {
  if (bytes.byteLength > MAX_GLB_BYTES) throw new DomainError("GLB_TOO_BIG", `File .glb tối đa ${MAX_GLB_BYTES / 1024 / 1024} MB — hãy nén (Draco/Meshopt) và giảm texture`);
  if (!isGlb(bytes)) throw new DomainError("BAD_GLB", "Đây không phải file .glb (glTF 2.0 nhị phân)");
  const warnings: string[] = [];
  if (bytes.byteLength > HEAVY_GLB_BYTES) warnings.push(`File ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB khá nặng; điện thoại sẽ tải chậm. Nên nén xuống dưới 8 MB.`);

  let sizeCm: GlbReport["sizeCm"] = null;
  let triangles: number | null = null;
  try {
    const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(bytes);
    const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
    if (!scene) throw new Error("no scene");
    const b = getBounds(scene);
    const dim = (i: number) => Math.round((b.max[i] - b.min[i]) * 1000) / 10; // m → cm, 0,1 cm
    sizeCm = { width: dim(0), height: dim(1), depth: dim(2) };
    triangles = 0;
    for (const mesh of doc.getRoot().listMeshes())
      for (const prim of mesh.listPrimitives()) {
        const idx = prim.getIndices();
        const pos = prim.getAttribute("POSITION");
        triangles += idx ? idx.getCount() / 3 : pos ? pos.getCount() / 3 : 0;
      }
    if (triangles > 300_000) warnings.push(`${Math.round(triangles / 1000)}K tam giác — quá nhiều cho web, nên giảm xuống dưới 150K.`);
  } catch {
    warnings.push("Không đọc được kích thước từ file (có thể đã nén Draco/Meshopt). Mô hình vẫn dùng được; số đo trong danh mục sẽ được dùng để co giãn.");
  }

  if (sizeCm && expected) {
    // Mô hình có thể xoay 90° quanh trục đứng, nên chấp nhận cả hai chiều rộng/sâu
    const off = (a: number, b: number) => Math.abs(a - b) / b;
    const direct = Math.max(off(sizeCm.width, expected.widthCm), off(sizeCm.depth, expected.depthCm));
    const swapped = Math.max(off(sizeCm.width, expected.depthCm), off(sizeCm.depth, expected.widthCm));
    const h = off(sizeCm.height, expected.heightCm);
    if (Math.min(direct, swapped) > 0.15 || h > 0.15)
      warnings.push(
        `Kích thước trong file (${sizeCm.width}×${sizeCm.depth}×${sizeCm.height} cm) lệch hơn 15% so với số đo đã nhập (${expected.widthCm}×${expected.depthCm}×${expected.heightCm} cm). Studio sẽ co giãn mô hình theo số đo đã nhập; kiểm tra lại nếu hình bị méo.`,
      );
  }
  return { bytes: bytes.byteLength, sizeCm, triangles, warnings };
}
