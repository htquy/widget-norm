import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DomainError } from "@/domain/errors";

/** Chuyển lỗi thành response JSON thống nhất cho API công khai. */
export function errorResponse(e: unknown, headers?: HeadersInit) {
  if (e instanceof DomainError) {
    const status = e.code.endsWith("NOT_FOUND") ? 404 : e.code === "SLOT_TAKEN" ? 409 : 400;
    return NextResponse.json({ error: e.message, code: e.code }, { status, headers });
  }
  if (e instanceof ZodError) return NextResponse.json({ error: "Dữ liệu không hợp lệ", issues: e.issues }, { status: 400, headers });
  console.error(e);
  return NextResponse.json({ error: "Lỗi hệ thống, bạn thử lại sau nhé." }, { status: 500, headers });
}

/** Giới hạn tần suất trong bộ nhớ (1 server; nhiều server → Redis). */
const buckets = new Map<string, { count: number; resetAt: number }>();
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 50_000) for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    return true;
  }
  b.count++;
  return b.count <= limit;
}
