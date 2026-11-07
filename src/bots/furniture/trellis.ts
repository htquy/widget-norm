import { DomainError } from "@/domain/errors";

/**
 * Tạo mô hình 3D (.glb) từ ảnh sản phẩm bằng TRELLIS.2 (Microsoft, MIT) chạy trên máy chủ GPU RIÊNG của bạn
 * (Modal, RunPod, Replicate… — xem scripts/trellis-worker/README.md). Widget Norm chỉ gọi qua HTTP:
 *
 *   POST {TRELLIS_API_URL}/generate   { image_base64, mime }        → { job_id }
 *   GET  {TRELLIS_API_URL}/jobs/{id}                                → { status: "pending"|"running"|"done"|"failed", glb_url?, glb_base64?, error? }
 *
 * Header: Authorization: Bearer {TRELLIS_API_KEY} (nếu có). Mô hình sinh ra luôn ở trạng thái "review":
 * nhân viên xem lại trên trang admin rồi mới duyệt cho khách thấy.
 */
export interface ModelJobState {
  status: "pending" | "done" | "failed";
  glb?: Uint8Array;
  error?: string;
}

export interface ModelGenerator {
  start(image: Uint8Array, mime: string): Promise<{ jobId: string }>;
  poll(jobId: string): Promise<ModelJobState>;
}

export function trellisFromEnv(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): ModelGenerator | null {
  const base = env.TRELLIS_API_URL?.replace(/\/$/, "");
  if (!base) return null;
  if (!/^https:\/\//.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(base)) throw new Error("TRELLIS_API_URL phải dùng HTTPS");
  const headers = (extra: Record<string, string> = {}) => ({ ...(env.TRELLIS_API_KEY ? { Authorization: `Bearer ${env.TRELLIS_API_KEY}` } : {}), ...extra });
  const call = async (path: string, init: RequestInit = {}) => {
    const res = await fetchImpl(`${base}${path}`, { ...init, signal: AbortSignal.timeout(60_000), cache: "no-store" });
    if (!res.ok) throw new DomainError("TRELLIS_ERROR", `Máy chủ tạo 3D trả lỗi ${res.status}`);
    return res;
  };
  return {
    async start(image, mime) {
      const res = await call("/generate", { method: "POST", headers: headers({ "Content-Type": "application/json" }), body: JSON.stringify({ image_base64: Buffer.from(image).toString("base64"), mime }) });
      const j = (await res.json()) as { job_id?: string };
      if (!j.job_id) throw new DomainError("TRELLIS_ERROR", "Máy chủ tạo 3D không trả mã công việc");
      return { jobId: j.job_id };
    },
    async poll(jobId) {
      const j = (await (await call(`/jobs/${encodeURIComponent(jobId)}`, { headers: headers() })).json()) as { status?: string; glb_url?: string; glb_base64?: string; error?: string };
      if (j.status === "failed") return { status: "failed", error: j.error ?? "Máy chủ báo lỗi" };
      if (j.status !== "done") return { status: "pending" };
      if (j.glb_base64) return { status: "done", glb: new Uint8Array(Buffer.from(j.glb_base64, "base64")) };
      if (j.glb_url) {
        const u = new URL(j.glb_url);
        if (u.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(u.hostname)) throw new DomainError("TRELLIS_ERROR", "Link file .glb phải dùng HTTPS");
        const r = await fetchImpl(u, { signal: AbortSignal.timeout(120_000) });
        if (!r.ok) throw new DomainError("TRELLIS_ERROR", `Không tải được file .glb (${r.status})`);
        return { status: "done", glb: new Uint8Array(await r.arrayBuffer()) };
      }
      return { status: "failed", error: "Công việc xong nhưng không có file .glb" };
    },
  };
}
