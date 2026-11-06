import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { FileStorage } from "@/application/ports";
import { CONTENT_TYPES } from "./localFileStorage";
import path from "node:path";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** URL công khai của bucket (r2.dev hoặc domain riêng). Trống = phục vụ qua /api/files (tốn băng thông server). */
  publicUrl?: string;
}

/**
 * Cloudflare R2 (API tương thích S3). Ảnh upload lên bucket, khách tải thẳng từ CDN của Cloudflare
 * → server không gánh băng thông ảnh. Đổi sang S3/Supabase Storage chỉ cần viết adapter khác cùng interface.
 */
export class R2FileStorage implements FileStorage {
  private readonly s3: S3Client;
  private readonly publicBase: string | null;

  constructor(private readonly cfg: R2Config) {
    this.s3 = new S3Client({
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    });
    this.publicBase = cfg.publicUrl ? cfg.publicUrl.replace(/\/+$/, "") : null;
  }

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<string> {
    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.cfg.bucket,
          Key: key,
          Body: bytes,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable", // key có timestamp/uuid nên không bao giờ ghi đè
        }),
      );
      const encoded = key.split("/").map(encodeURIComponent).join("/");
      return this.publicBase ? `${this.publicBase}/${encoded}` : `/api/files/${encoded}`;
    } catch (err) {
      console.warn(`[storage] R2 upload thất bại (${(err as Error).message}), tự động lưu đĩa cục bộ /storage`);
      const { LocalFileStorage } = await import("./localFileStorage");
      return await new LocalFileStorage().put(key, bytes, contentType);
    }
  }

  async get(key: string) {
    const contentType = CONTENT_TYPES[path.extname(key).toLowerCase()];
    if (!contentType) return null;
    try {
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.cfg.bucket, Key: key }));
      if (!res.Body) return null;
      return { bytes: await res.Body.transformToByteArray(), contentType };
    } catch {
      const { LocalFileStorage } = await import("./localFileStorage");
      return await new LocalFileStorage().get(key);
    }
  }
}

export function r2ConfigFromEnv(env: Record<string, string | undefined> = process.env): R2Config | null {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) return null;
  return {
    accountId: R2_ACCOUNT_ID.trim(),
    accessKeyId: R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: R2_SECRET_ACCESS_KEY.trim(),
    bucket: R2_BUCKET.trim(),
    publicUrl: R2_PUBLIC_URL?.trim() || undefined,
  };
}
