// Máy chủ TRELLIS GIẢ để thử cả luồng "Tạo 3D nháp từ ảnh" khi chưa có GPU: trả về một khối hộp .glb sau vài giây.
// Chạy: node scripts/trellis-worker/mock-server.mjs   rồi đặt TRELLIS_API_URL=http://localhost:8787 trong .env.local
import { createServer } from "node:http";
import { Document, NodeIO } from "@gltf-transform/core";

async function box() {
  const doc = new Document();
  const buf = doc.createBuffer();
  const [x, y, z] = [0.8, 0.4, 0.4];
  const pos = new Float32Array([-x, 0, -z, x, 0, -z, x, y * 2, -z, -x, y * 2, -z, -x, 0, z, x, 0, z, x, y * 2, z, -x, y * 2, z]);
  const idx = new Uint16Array([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 1, 2, 6, 1, 6, 5, 0, 3, 7, 0, 7, 4]);
  const mesh = doc.createMesh().addPrimitive(doc.createPrimitive().setAttribute("POSITION", doc.createAccessor().setType("VEC3").setBuffer(buf).setArray(pos)).setIndices(doc.createAccessor().setType("SCALAR").setBuffer(buf).setArray(idx)));
  doc.createScene().addChild(doc.createNode().setMesh(mesh));
  return Buffer.from(await new NodeIO().writeBinary(doc)).toString("base64");
}

const jobs = new Map();
createServer(async (req, res) => {
  const send = (code, body) => (res.writeHead(code, { "Content-Type": "application/json" }), res.end(JSON.stringify(body)));
  if (req.method === "POST" && req.url === "/generate") {
    let n = 0;
    for await (const c of req) n += c.length;
    const id = crypto.randomUUID();
    jobs.set(id, Date.now());
    console.log(`job ${id} (${n} bytes ảnh)`);
    return send(200, { job_id: id });
  }
  const m = req.url?.match(/^\/jobs\/(.+)$/);
  if (req.method === "GET" && m) {
    const t = jobs.get(m[1]);
    if (!t) return send(404, { error: "no job" });
    return Date.now() - t < 6000 ? send(200, { status: "running" }) : send(200, { status: "done", glb_base64: await box() });
  }
  send(404, { error: "not found" });
}).listen(8787, () => console.log("TRELLIS mock tại http://localhost:8787"));
