/**
 * Chạy migration (idempotent) trên database trong DATABASE_URL, hoặc PGlite nếu để trống.
 *   npm run db:migrate
 * Các lệnh DDL nằm ở src/infrastructure/db/schema.ts (mảng DDL) và cũng tự chạy khi app khởi động.
 */
import { sql } from "drizzle-orm";
import { getDb } from "../src/infrastructure/db/client";

const db = await getDb(); // chạy DDL + seed/bootstrap
const target = process.env.DATABASE_URL ? `Postgres (${new URL(process.env.DATABASE_URL).hostname})` : "PGlite ./data/pglite";
const rows = await db.execute(sql`SELECT table_name, (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS cols FROM information_schema.tables t WHERE table_schema = 'public' ORDER BY table_name`);
const list = (rows as unknown as { rows: { table_name: string; cols: string }[] }).rows ?? (rows as unknown as { table_name: string; cols: string }[]);
console.log(`Migration xong trên ${target}:`);
for (const r of list) {
  const countRes = await db.execute(sql.raw(`SELECT count(*) as c FROM "${r.table_name}"`));
  const count = (countRes as unknown as { rows: { c: string }[] }).rows?.[0]?.c ?? (countRes as unknown as { c: string }[])[0]?.c ?? "?";
  console.log(`  - ${r.table_name} (${r.cols} cột, ${count} dòng)`);
}
process.exit(0);
