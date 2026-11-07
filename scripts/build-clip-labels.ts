/**
 * Tính sẵn vector văn bản CLIP cho nhãn loại phòng + phong cách của bot nội thất.
 * Trình duyệt chỉ cần nạp vision model (89 MB) rồi so cosine với các vector này — không phải tải text model.
 * Chạy lại khi đổi nhãn: npx tsx scripts/build-clip-labels.ts   (cần `npm run models` trước)
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AutoTokenizer, CLIPTextModelWithProjection, env } from "@huggingface/transformers";
import { STYLES, STYLE_INFO } from "../src/bots/furniture/design";
import { ROOMS } from "../src/bots/furniture/domain";

const ROOM_PROMPTS: Record<(typeof ROOMS)[number], string> = {
  living: "a photo of a living room",
  bedroom: "a photo of a bedroom",
  dining: "a photo of a dining room",
  office: "a photo of a home office",
  kitchen: "a photo of a kitchen",
  kids: "a photo of a kids bedroom",
};

env.allowRemoteModels = false;
env.localModelPath = join(process.cwd(), "public/models/");
const ID = "Xenova/clip-vit-base-patch32";
const tokenizer = await AutoTokenizer.from_pretrained(ID);
const model = await CLIPTextModelWithProjection.from_pretrained(ID, { dtype: "q8" });

async function embed(texts: string[]): Promise<number[][]> {
  const inputs = tokenizer(texts, { padding: true, truncation: true });
  const { text_embeds } = await model(inputs);
  const dim = text_embeds.dims[1];
  const data = text_embeds.data as Float32Array;
  return texts.map((_, i) => {
    const v = Array.from(data.slice(i * dim, (i + 1) * dim));
    const n = Math.hypot(...v);
    return v.map((x) => Math.round((x / n) * 1e4) / 1e4);
  });
}

const rooms = await embed(ROOMS.map((r) => ROOM_PROMPTS[r]));
const styles = await embed(STYLES.map((s) => STYLE_INFO[s].clip));
const out = {
  model: ID,
  rooms: Object.fromEntries(ROOMS.map((r, i) => [r, rooms[i]])),
  styles: Object.fromEntries(STYLES.map((s, i) => [s, styles[i]])),
};
await writeFile(join(process.cwd(), "src/bots/furniture/vision/labels.json"), JSON.stringify(out));
console.log(`Đã ghi ${ROOMS.length} nhãn phòng + ${STYLES.length} phong cách (${rooms[0].length} chiều).`);
