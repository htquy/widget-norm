// Tải các model ONNX về public/models/<repo>/... để Transformers.js / ONNX Runtime Web nạp từ máy chủ của mình.
// Chạy: node scripts/download-models.mjs [--commercial-only]
import { readFile, mkdir, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cfg = JSON.parse(await readFile(join(root, "scripts/models.json"), "utf8"));
const commercialOnly = process.argv.includes("--commercial-only");

for (const m of cfg.models) {
  if (commercialOnly && !m.commercial) { console.log(`skip ${m.id} (không dùng thương mại)`); continue; }
  for (const f of m.files) {
    const out = join(root, "public/models", m.id, f);
    try { await stat(out); console.log(`có sẵn  ${m.id}/${f}`); continue; } catch {}
    await mkdir(dirname(out), { recursive: true });
    const res = await fetch(`${cfg.baseUrl}/${m.id}/resolve/main/${f}`);
    if (!res.ok) throw new Error(`${res.status} ${m.id}/${f}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(out));
    const { size } = await stat(out);
    console.log(`đã tải  ${m.id}/${f}  ${(size / 1e6).toFixed(1)} MB`);
  }
}

// ONNX Runtime WASM tự host (không phụ thuộc CDN): chép từ node_modules sang public/ort/
import { copyFile } from "node:fs/promises";
await mkdir(join(root, "public/ort"), { recursive: true });
for (const f of ["ort-wasm-simd-threaded.asyncify.mjs", "ort-wasm-simd-threaded.asyncify.wasm"]) {
  await copyFile(join(root, "node_modules/onnxruntime-web/dist", f), join(root, "public/ort", f));
}
console.log("đã chép ONNX Runtime WASM → public/ort/");
