import { LEAD_SOURCE_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS, type LeadStatus } from "@/domain/lead";
import { getSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { csvResponse, toCsv } from "../csv";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return new Response("Unauthorized", { status: 401 });
  const st = new URL(req.url).searchParams.get("status") ?? "";
  const status = (LEAD_STATUSES as readonly string[]).includes(st) ? (st as LeadStatus) : undefined;
  const leads = await (await app()).leads.list(s.tenantId, { status });
  return csvResponse(
    "khach-tiem-nang.csv",
    toCsv(
      ["Thời gian", "Tên", "SĐT", "Email", "Nguồn", "Trạng thái", "Giá trị chốt", "Ghi chú"],
      leads.map((l) => [l.createdAt.toISOString(), l.name, l.phone, l.email, LEAD_SOURCE_LABELS[l.source], LEAD_STATUS_LABELS[l.status], l.wonValue, l.note]),
    ),
  );
}
