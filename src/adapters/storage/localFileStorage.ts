import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import type { FileStorage } from "@/application/ports";

const ROOT = process.env.STORAGE_DIR
  ? path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_DIR)
  : Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT)
    ? path.join(tmpdir(), "storage")
    : path.join(process.cwd(), "storage");

export const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/** Lưu file trên ổ đĩa, phục vụ qua /api/files/<key>. Khi chạy thật thay bằng R2/S3 adapter cùng interface. */
export class LocalFileStorage implements FileStorage {
  async put(key: string, bytes: Uint8Array, _contentType: string): Promise<string> {
    const full = resolveSafe(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, bytes);
    return `/api/files/${key.split("/").map(encodeURIComponent).join("/")}`;
  }

  get(key: string) {
    return readStoredFile(key);
  }
}

export function resolveSafe(key: string): string {
  const full = path.resolve(/*turbopackIgnore: true*/ ROOT, key);
  if (!full.startsWith(ROOT + path.sep)) throw new Error("Invalid path");
  return full;
}

export async function readStoredFile(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const ext = path.extname(key).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return null;
  try {
    return { bytes: await readFile(resolveSafe(key)), contentType };
  } catch {
    return null;
  }
}
