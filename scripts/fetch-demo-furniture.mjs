/**
 * Tải mô hình nội thất THẬT (quét 3D, giấy phép CC0) từ Poly Haven về `assets/demo-furniture/<sku>.glb`
 * để shop demo có đồ 3D xoay được thay cho khối hộp ghép. Chạy lại được; bỏ qua file đã có.
 *
 *   node scripts/fetch-demo-furniture.mjs            # tải những file chưa có
 *   node scripts/fetch-demo-furniture.mjs --force    # tải lại tất cả
 *
 * SKU demo → mã model Poly Haven (https://polyhaven.com/models). Chọn theo tỉ lệ gần nhất với số đo demo;
 * số đo trong catalogue vẫn là chuẩn (studio co giãn từng trục về đúng số đo).
 */
import { mkdir, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";

const MAP = {
  "SF-L3-XAM": "sofa_02",
  "SF-LG-KEM": "sofa_03",
  "SF-2-JP": "Sofa_01",
  "SF-3-IND": "chinese_sofa",
  "BA-6-OC": "painted_wooden_table",
  "BA-4-TRON": "round_wooden_table_02",
  "GH-AN-BE": "dining_chair_02",
  "GH-MAY": "gallinera_chair",
  "GI-16-SOI": "GothicBed_01",
  "GI-18-JP": "GothicBed_01",
  "TQA-3C": "vintage_cabinet_01",
  "BLV-120": "metal_office_desk",
  "KS-5T": "Shelf_01",
  "BTR-80": "coffee_table_round_01",
  "BTR-LOFT": "modern_coffee_table_01",
  "BTR-JP": "WoodenTable_01",
  "KTV-180": "modern_wooden_cabinet",
  "KTV-IND": "chinese_console_table",
};

const force = process.argv.includes("--force");
const out = join(process.cwd(), "assets", "demo-furniture");
await mkdir(out, { recursive: true });

const exists = (p) => access(p).then(() => true, () => false);
const fetchBuf = async (url) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return Buffer.from(await r.arrayBuffer());
};

const cache = new Map(); // mã Poly Haven → GLB (nhiều SKU dùng chung một model)
for (const [sku, id] of Object.entries(MAP)) {
  const dest = join(out, `${sku}.glb`);
  if (!force && (await exists(dest))) {
    console.log("có sẵn", sku);
    continue;
  }
  let glb = cache.get(id);
  if (!glb) {
    const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
    const g = files.gltf?.["1k"]?.gltf;
    if (!g) throw new Error(`${id}: không có bản glTF 1k`);
    const dir = join(tmpdir(), `ph-${id}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, `${id}.gltf`), await fetchBuf(g.url));
    for (const [rel, f] of Object.entries(g.include ?? {})) {
      const p = join(dir, rel);
      await mkdir(join(p, ".."), { recursive: true });
      await writeFile(p, await fetchBuf(f.url));
    }
    const doc = await new NodeIO().read(join(dir, `${id}.gltf`));
    glb = Buffer.from(await new NodeIO().writeBinary(doc));
    await rm(dir, { recursive: true, force: true });
    cache.set(id, glb);
  }
  await writeFile(dest, glb);
  console.log("đã tải", sku, "←", id, `${(glb.length / 1024 / 1024).toFixed(1)} MB`);
}
