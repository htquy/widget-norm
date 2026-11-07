"use client";

import * as THREE from "three";
import { colorTint } from "../design";

/**
 * Đồng bộ màu mô hình 3D với màu trong catalogue: chỉ đổi màu vật liệu CHIẾM DIỆN TÍCH LỚN NHẤT (bọc nệm, mặt gỗ chính…),
 * giữ nguyên chân, kim loại, chi tiết nhỏ. Giữ độ sáng tối của hoạ tiết gốc (đường chỉ, vân gỗ, nếp da): màu mới × (độ sáng điểm ảnh / độ sáng trung bình).
 * Không đụng vật liệu gốc dùng chung — vật liệu được nhân bản trước khi sửa. Món nhiều màu ("trắng - đen") hoặc màu lạ thì giữ màu gốc.
 */
const avgCache = new WeakMap<THREE.Texture, number>();

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

/** Độ sáng trung bình (tuyến tính) của ảnh vân, lấy mẫu 24×24 */
function meanLuminance(tex: THREE.Texture): number {
  const hit = avgCache.get(tex);
  if (hit !== undefined) return hit;
  let l = 0.5;
  try {
    const img = tex.image as CanvasImageSource | undefined;
    if (img) {
      const c = document.createElement("canvas");
      c.width = c.height = 24;
      const ctx = c.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, 24, 24);
      const d = ctx.getImageData(0, 0, 24, 24).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += 0.2126 * toLinear(d[i] / 255) + 0.7152 * toLinear(d[i + 1] / 255) + 0.0722 * toLinear(d[i + 2] / 255);
      l = Math.max(0.02, sum / (d.length / 4));
    }
  } catch {
    /* ảnh không đọc được (CORS…) → coi như trung bình */
  }
  avgCache.set(tex, l);
  return l;
}

/** Diện tích bề mặt (đơn vị mô hình) của từng vật liệu */
function areaByMaterial(root: THREE.Object3D): Map<THREE.Material, number> {
  const areas = new Map<THREE.Material, number>();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  root.updateWorldMatrix(true, true);
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    const pos = m.geometry.getAttribute("position");
    if (!pos) return;
    const idx = m.geometry.getIndex();
    const n = idx ? idx.count : pos.count;
    let area = 0;
    for (let i = 0; i < n; i += 3) {
      const [i0, i1, i2] = idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2];
      a.fromBufferAttribute(pos, i0).applyMatrix4(m.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(m.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(m.matrixWorld);
      area += b.sub(a).cross(c.sub(a)).length() / 2;
    }
    areas.set(m.material, (areas.get(m.material) ?? 0) + area);
  });
  return areas;
}

/** Đổi màu vật liệu chính của `root` (nên là bản clone) sang màu catalogue. Trả về true nếu đã đổi. */
export function applyCatalogColor(root: THREE.Object3D, color: string | undefined): boolean {
  const hex = color ? colorTint(color) : null;
  if (!hex) return false;
  const areas = areaByMaterial(root);
  let best: THREE.Material | null = null;
  let max = 0;
  for (const [m, ar] of areas) if (ar > max && (m as THREE.MeshStandardMaterial).isMeshStandardMaterial) ((best = m), (max = ar));
  if (!best) return false;
  const src = best as THREE.MeshStandardMaterial;
  const mat = src.clone();
  const target = new THREE.Color(hex);
  mat.color.set(0xffffff);
  const avg = src.map ? meanLuminance(src.map) : 1;
  if (!src.map) mat.color.copy(target);
  else {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTint = { value: new THREE.Vector3(target.r, target.g, target.b) };
      shader.uniforms.uAvgL = { value: avg };
      shader.fragmentShader = shader.fragmentShader
        .replace("void main() {", "uniform vec3 uTint;\nuniform float uAvgL;\nvoid main() {")
        .replace(
          "#include <map_fragment>",
          `#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  float tl = dot( sampledDiffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  float tk = clamp( tl / uAvgL, 0.35, 1.7 );
  diffuseColor.rgb = uTint * tk;
  diffuseColor.a *= sampledDiffuseColor.a;
#endif`,
        );
    };
    mat.customProgramCacheKey = () => `tint-${hex}`;
  }
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && m.material === best) m.material = mat;
  });
  return true;
}
