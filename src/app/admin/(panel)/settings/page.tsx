import { headers } from "next/headers";
import Link from "next/link";
import { requireSession } from "@/infrastructure/auth/session";
import { app, config } from "@/infrastructure/container";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { Card, PageHeader } from "@/components/admin/ui";

export default async function SettingsPage() {
  const s = await requireSession();
  const c = await app();
  const tenant = await c.tenants.byId(s.tenantId);
  if (!tenant) return null;
  const h = await headers();
  const base = process.env.PUBLIC_BASE_URL ? config.baseUrl : `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const snippet = `<script src="${base}/widget.js" data-tenant="${tenant.slug}" async></script>`;
  const link = `${base}/embed/${tenant.slug}`;
  const m = c.chat.describeModels();

  return (
    <>
      <PageHeader title="Cài đặt & mã nhúng" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SettingsForm settings={tenant.settings} />
        </div>
        <div className="space-y-4">
          <Card title="Nhúng vào website">
            <p className="mb-2 text-[13px] text-[var(--fg-muted)]">Dán trước thẻ &lt;/body&gt; (WordPress, Haravan, Sapo, Shopify, LadiPage…). Đổi màu/vị trí ở <Link href="/admin/widget" className="underline">Giao diện widget</Link>, không cần dán lại.</p>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-neutral-900 p-3 text-[12px] text-neutral-100">{snippet}</pre>
            <p className="mt-2 text-[12.5px] text-[var(--fg-muted)]">
              Mở chat bằng nút của bạn: <code>{"onclick=\"WidgetNorm.open()\""}</code>
            </p>
          </Card>
          <Card title="Link chat (Zalo OA, Messenger, QR)">
            <a href={link} target="_blank" rel="noreferrer" className="break-all text-[13px] text-[var(--accent)] underline">
              {link}
            </a>
          </Card>
          <Card title="Trợ lý AI">
            <dl className="space-y-2 text-[13px]">
              <div>
                <dt className="text-[var(--fg-muted)]">Tầng quyết định (Phase 2C)</dt>
                <dd className="font-mono">{m.decision}</dd>
              </div>
              <div>
                <dt className="text-[var(--fg-muted)]">LLM câu dễ</dt>
                <dd className="font-mono">{m.simple}</dd>
              </div>
              <div>
                <dt className="text-[var(--fg-muted)]">LLM câu khó</dt>
                <dd className="font-mono">{m.complex}</dd>
              </div>
            </dl>
            {config.llmProvider === "rules" && <p className="mt-2 text-[13px] text-amber-800">Chưa có OPENROUTER_API_KEY — đang chạy bot theo luật. Thêm key vào .env.local rồi khởi động lại.</p>}
          </Card>
        </div>
      </div>
    </>
  );
}
