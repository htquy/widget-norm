import type { Notifier } from "@/application/ports";
import type { Tenant } from "@/domain/tenant";

/**
 * Gửi thông báo (lead, lịch hẹn, khách cần hỗ trợ) tới webhook shop cấu hình (Zalo bot, Slack, Google Chat, n8n/Make...).
 * Payload: { kind, text, ...data } — `text` đọc được ngay, phần còn lại có cấu trúc.
 */
export class WebhookNotifier implements Notifier {
  async notify(tenant: Tenant, kind: "lead" | "booking" | "handoff", text: string, data: Record<string, unknown>): Promise<void> {
    const url = tenant.settings.webhookUrl;
    if (!url) {
      console.info(`[notify:${kind}]`, text.replace(/\n/g, " | "));
      return;
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, shop: tenant.slug, text, ...data }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Webhook trả về ${res.status}`);
  }
}
