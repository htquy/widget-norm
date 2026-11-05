import { and, desc, eq, gte } from "drizzle-orm";
import { DECISION_LABEL_TEXT, type DecisionLabel } from "@/domain/decision";
import { HANDLED_BY_LABELS } from "@/application/use-cases/insights";
import type { HandledBy } from "@/application/ports";
import { getSession } from "@/infrastructure/auth/session";
import { getDb } from "@/infrastructure/db/client";
import { messageInsights } from "@/infrastructure/db/schema";
import { csvResponse, toCsv } from "../csv";

/** Toàn bộ câu hỏi đã phân loại — để shop tự phân tích thêm trong Excel/Sheets */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return new Response("Unauthorized", { status: 401 });
  const days = [7, 30, 90].includes(Number(new URL(req.url).searchParams.get("days"))) ? Number(new URL(req.url).searchParams.get("days")) : 30;
  const db = await getDb();
  const rows = await db
    .select()
    .from(messageInsights)
    .where(and(eq(messageInsights.tenantId, s.tenantId), gte(messageInsights.createdAt, new Date(Date.now() - days * 86_400_000))))
    .orderBy(desc(messageInsights.createdAt))
    .limit(20_000);
  return csvResponse(
    `cau-hoi-khach-${days}-ngay.csv`,
    toCsv(
      ["Thời gian", "Câu hỏi", "Ý định", "Độ tin cậy", "Chủ đề", "Nhu cầu", "Cảm xúc", "Xử lý bởi", "Chưa trả lời được"],
      rows.map((r) => [
        r.createdAt.toISOString(),
        r.text,
        DECISION_LABEL_TEXT[r.label as DecisionLabel] ?? r.label,
        r.confidence.toFixed(2),
        r.topic,
        r.need,
        r.sentiment,
        HANDLED_BY_LABELS[r.handledBy as HandledBy] ?? r.handledBy,
        r.unanswered ? "có" : "",
      ]),
    ),
  );
}
