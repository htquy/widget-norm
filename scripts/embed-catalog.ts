/**
 * Tính vector CLIP (512 chiều) cho ảnh của các món nội thất chưa có vector — để khách "tìm món giống ảnh".
 * Dùng cho dữ liệu cũ hoặc demo (shop mới tải ảnh qua trang admin thì trình duyệt tự tính).
 * Chạy: npm run embed:catalog   (cần `npm run models`)
 */
import { join } from "node:path";
import { AutoProcessor, CLIPVisionModelWithProjection, RawImage, env } from "@huggingface/transformers";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { app } from "../src/infrastructure/container";
import { getDb } from "../src/infrastructure/db/client";
import { tenants } from "../src/infrastructure/db/schema";

env.allowRemoteModels = false;
env.localModelPath = join(process.cwd(), "public/models/");
const ID = "Xenova/clip-vit-base-patch32";
const model = await CLIPVisionModelWithProjection.from_pretrained(ID, { dtype: "q8" });
const processor = await AutoProcessor.from_pretrained(ID, {});

const c = await app();
let done = 0;
const db = await getDb();
for (const t of await db.select({ id: tenants.id, name: tenants.name }).from(tenants).where(eq(tenants.kind, "furniture"))) {
  for (const item of await c.furnitureCatalog.list(t.id)) {
    if (item.embedding) continue;
    const src = item.imageUrl || item.cutoutUrl;
    const m = src.match(/^\/api\/files\/(.+)$/);
    let bytes: Uint8Array | undefined;
    if (m) bytes = (await c.files.get(m[1].split("/").map(decodeURIComponent).join("/")))?.bytes;
    else if (/^https:\/\//.test(src)) bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
    if (!bytes) continue;
    // Ảnh tách nền/SVG có nền trong suốt → đặt lên nền trắng để CLIP nhìn giống ảnh sản phẩm
    const png = await sharp(Buffer.from(bytes), { density: 150 }).flatten({ background: "#ffffff" }).resize(512, 512, { fit: "inside" }).png().toBuffer();
    const image = await RawImage.fromBlob(new Blob([new Uint8Array(png)], { type: "image/png" }));
    const { image_embeds } = (await model(await processor(image))) as { image_embeds: { data: Float32Array } };
    const v = Array.from(image_embeds.data);
    const n = Math.hypot(...v);
    await c.furnitureCatalog.update(t.id, item.id, { embedding: v.map((x) => Math.round((x / n) * 1e5) / 1e5) });
    done++;
    console.log(`✓ ${t.name} / ${item.sku}`);
  }
}
console.log(`Đã tính vector cho ${done} món.`);
process.exit(0);
