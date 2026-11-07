import { describe, expect, it } from "vitest";
import { trellisFromEnv } from "./trellis";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("tạo 3D bằng TRELLIS (máy chủ GPU riêng)", () => {
  it("không cấu hình → không có tính năng", () => {
    expect(trellisFromEnv({})).toBeNull();
  });
  it("từ chối địa chỉ http không phải localhost", () => {
    expect(() => trellisFromEnv({ TRELLIS_API_URL: "http://gpu.example.com" })).toThrow();
  });
  it("gửi ảnh, hỏi trạng thái, nhận .glb (base64)", async () => {
    const seen: { url: string; auth: string | null; body?: string }[] = [];
    const glb = Buffer.from("glTF-bytes").toString("base64");
    const fake: typeof fetch = async (input, init) => {
      const url = String(input);
      seen.push({ url, auth: new Headers(init?.headers).get("authorization"), body: typeof init?.body === "string" ? init.body : undefined });
      if (url.endsWith("/generate")) return json({ job_id: "j1" });
      return seen.filter((s) => s.url.includes("/jobs/")).length < 2 ? json({ status: "running" }) : json({ status: "done", glb_base64: glb });
    };
    const g = trellisFromEnv({ TRELLIS_API_URL: "https://gpu.example.com/", TRELLIS_API_KEY: "k" }, fake)!;
    expect((await g.start(new Uint8Array([1, 2, 3]), "image/png")).jobId).toBe("j1");
    expect(seen[0].auth).toBe("Bearer k");
    expect(JSON.parse(seen[0].body!)).toEqual({ image_base64: "AQID", mime: "image/png" });
    expect((await g.poll("j1")).status).toBe("pending");
    const done = await g.poll("j1");
    expect(done.status).toBe("done");
    expect(Buffer.from(done.glb!).toString()).toBe("glTF-bytes");
  });
  it("báo lỗi của máy chủ", async () => {
    const g = trellisFromEnv({ TRELLIS_API_URL: "https://gpu.example.com" }, async () => json({ status: "failed", error: "OOM" }))!;
    expect(await g.poll("x")).toEqual({ status: "failed", error: "OOM" });
  });
});
