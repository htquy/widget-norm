import "server-only";
import { LocalFileStorage } from "@/adapters/storage/localFileStorage";
import { R2FileStorage, r2ConfigFromEnv } from "@/adapters/storage/r2FileStorage";
import type { FileStorage } from "@/application/ports";

/** Có đủ 4 biến R2_* → dùng Cloudflare R2; không thì lưu đĩa cục bộ (dev). */
export function createStorage(): FileStorage & { kind: "r2" | "local" } {
  const r2 = r2ConfigFromEnv();
  if (r2) return Object.assign(new R2FileStorage(r2), { kind: "r2" as const });
  return Object.assign(new LocalFileStorage(), { kind: "local" as const });
}
