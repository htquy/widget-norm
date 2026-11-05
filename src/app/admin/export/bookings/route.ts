import { BOOKING_STATUS_LABELS, addDays, atLocal, localDate, localTime } from "@/domain/booking";
import { getSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { csvResponse, toCsv } from "../csv";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return new Response("Unauthorized", { status: 401 });
  const url = new URL(req.url);
  const from = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("from") ?? "") ? url.searchParams.get("from")! : localDate(new Date());
  const days = Math.min(366, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const c = await app();
  const [list, services] = await Promise.all([c.bookings.list(s.tenantId, { range: { from: atLocal(from, "00:00"), to: atLocal(addDays(from, days), "00:00") } }), c.services.list(s.tenantId)]);
  const name = new Map(services.map((x) => [x.id, x.name]));
  return csvResponse(
    `lich-hen-${from}.csv`,
    toCsv(
      ["Ngày", "Giờ", "Dịch vụ", "Tên", "SĐT", "Trạng thái", "Ghi chú"],
      list.map((b) => [localDate(b.startAt), localTime(b.startAt), name.get(b.serviceId) ?? "", b.name, b.phone, BOOKING_STATUS_LABELS[b.status], b.note]),
    ),
  );
}
