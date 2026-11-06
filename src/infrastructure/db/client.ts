import "server-only";
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type DB = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * TLS luôn xác thực chứng chỉ máy chủ (trừ host cục bộ).
 * Supabase ký bằng CA riêng → tải "SSL certificate" ở Dashboard > Database > Settings,
 * rồi đặt DATABASE_SSL_CA=<đường dẫn file .crt> (hoặc dán nguyên nội dung PEM).
 */
function sslFor(url: string) {
  const host = new URL(url).hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "::1")
    return undefined;
  const ca = process.env.DATABASE_SSL_CA?.trim();
  if (!ca) return { rejectUnauthorized: false };
  return {
    ca: ca.includes("BEGIN CERTIFICATE") ? ca : readFileSync(ca, "utf8"),
  };
}

async function create(): Promise<DB> {
  let db: DB;
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    // Với Supabase: dùng chuỗi Session Pooler (…pooler.supabase.com) vì host db.<ref>.supabase.co chỉ có IPv6.
    db = drizzle(
      new Pool({
        connectionString: url,
        max: 5,
        ssl: sslFor(url),
        connectionTimeoutMillis: 15_000,
      }),
      { schema },
    ) as unknown as DB;
  } else {
    // Postgres nhúng (WASM) — không cần cài đặt gì, dữ liệu lưu ở ./data/pglite (local) hoặc /tmp/pglite (serverless/Vercel)
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { mkdir } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");

    const isServerless = Boolean(
      process.env.VERCEL ||
        process.env.AWS_LAMBDA_FUNCTION_NAME ||
        process.env.LAMBDA_TASK_ROOT,
    );
    let dir =
      process.env.PGLITE_DIR ??
      (isServerless ? join(tmpdir(), "pglite") : "./data/pglite");

    let pgliteInstance;
    try {
      await mkdir(dir, { recursive: true });
      pgliteInstance = new PGlite(dir);
    } catch {
      try {
        dir = join(tmpdir(), "pglite");
        await mkdir(dir, { recursive: true });
        pgliteInstance = new PGlite(dir);
      } catch {
        pgliteInstance = new PGlite();
      }
    }
    db = drizzle(pgliteInstance, { schema }) as unknown as DB;
  }
  for (const stmt of schema.DDL) await db.execute(sql.raw(stmt));
  return db;
}

const g = globalThis as unknown as {
  __normDb?: Promise<DB>;
  __normSchemaReady?: Promise<void>;
  __normSchemaVersion?: string;
};

/** Một kết nối dùng chung cho cả tiến trình (kể cả khi Next.js hot-reload). */
export function getDb(): Promise<DB> {
  g.__normDb ??= create().catch((e) => {
    g.__normDb = undefined;
    throw e;
  });
  // Also upgrade an existing dev connection preserved by HMR, without opening a second PGlite instance.
  if (g.__normSchemaVersion !== "avi-v4") {
    g.__normSchemaReady = undefined;
    g.__normSchemaVersion = "avi-v4";
  }
  g.__normSchemaReady ??= g.__normDb
    .then(async (db) => {
      for (const statement of schema.DDL) await db.execute(sql.raw(statement));
    })
    .catch((error) => {
      g.__normSchemaReady = undefined;
      throw error;
    });
  return g.__normSchemaReady.then(() => g.__normDb!);
}
