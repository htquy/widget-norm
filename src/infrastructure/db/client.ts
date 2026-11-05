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
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return undefined;
  const ca = process.env.DATABASE_SSL_CA?.trim();
  if (!ca) return { rejectUnauthorized: false };
  return { ca: ca.includes("BEGIN CERTIFICATE") ? ca : readFileSync(ca, "utf8") };
}

async function create(): Promise<DB> {
  let db: DB;
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    // Với Supabase: dùng chuỗi Session Pooler (…pooler.supabase.com) vì host db.<ref>.supabase.co chỉ có IPv6.
    db = drizzle(new Pool({ connectionString: url, max: 5, ssl: sslFor(url), connectionTimeoutMillis: 15_000 }), { schema }) as unknown as DB;
  } else {
    // Postgres nhúng (WASM) — không cần cài đặt gì, dữ liệu lưu ở ./data/pglite
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const { mkdir } = await import("node:fs/promises");
    const dir = process.env.PGLITE_DIR ?? "./data/pglite";
    await mkdir(dir, { recursive: true });
    db = drizzle(new PGlite(dir), { schema }) as unknown as DB;
  }
  for (const stmt of schema.DDL) await db.execute(sql.raw(stmt));
  const { seedIfEmpty } = await import("./seed");
  await seedIfEmpty(db);
  return db;
}

const g = globalThis as unknown as { __normDb?: Promise<DB> };

/** Một kết nối dùng chung cho cả tiến trình (kể cả khi Next.js hot-reload). */
export function getDb(): Promise<DB> {
  g.__normDb ??= create().catch((e) => {
    g.__normDb = undefined;
    throw e;
  });
  return g.__normDb;
}
