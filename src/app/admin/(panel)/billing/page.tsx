import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import { Globe2, ShieldCheck, CreditCard } from "lucide-react";
import { requireSession } from "@/infrastructure/auth/session";
import { listDomains } from "@/infrastructure/domains";
import { checkEntitlement, licensedBot } from "@/infrastructure/hub/billing";
import { app } from "@/infrastructure/container";
import { BOT_PRICING } from "@/domain/bot-pricing";
import {
  DomainForm,
  VerifyDomainForm,
  ActivateLicenseForm,
} from "@/components/admin/DomainForm";
import { Card, PageHeader, btnPrimary } from "@/components/admin/ui";
import { CheckoutPanel } from "@/components/admin/CheckoutPanel";
import { listHubPrices } from "@/infrastructure/hub/payments";
import type { HubPrice } from "@/infrastructure/hub/payment-types";

export default async function BillingPage() {
  const { t } = await getT();
  const s = await requireSession(),
    c = await app();
  const tenant = (await c.tenants.byId(s.tenantId))!;
  const domains = await listDomains(s.accountId);
  let access = null,
    error = "";
  let prices: HubPrice[] = [];
  try {
    access = await checkEntitlement(s.accountId, tenant.kind);
    if (access) prices = await listHubPrices(tenant.kind);
  } catch {
    error =
      t("Chưa kiểm tra được gói với trung tâm. Hãy đăng nhập lại hoặc thử lại sau.");
  }
  const price = BOT_PRICING[tenant.kind];
  const activated = (await licensedBot(s.accountId, tenant.kind)) === tenant.id;
  return (
    <>
      <PageHeader
        title={t("Domain & thanh toán")}
        subtitle={t("Một tài khoản trung tâm, quyền sở hữu website rõ ràng.")}
      />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card
            title={t("Kết nối website")}
            right={<Globe2 className="size-5 text-brand-700" />}
          >
            <DomainForm />
          </Card>
          {domains.map((d) => (
            <Card
              key={d.domain}
              title={d.domain}
              right={
                <span
                  className={`text-xs font-semibold ${d.verifiedAt ? "text-emerald-800" : "text-amber-800"}`}
                >
                  {d.verifiedAt ? t("Đã xác minh") : t("Chờ DNS")}
                </span>
              }
            >
              <p className="text-sm text-zinc-600">
                {t("Thêm bản ghi TXT trong phần quản lý DNS của website:")}
              </p>
              <dl className="mt-3 space-y-2 rounded-xl bg-zinc-50 p-4 text-sm">
                <dt className="text-zinc-500">{t("Tên")}</dt>
                <dd className="break-all font-mono">_avi-verify.{d.domain}</dd>
                <dt className="text-zinc-500">{t("Giá trị")}</dt>
                <dd className="break-all font-mono">
                  avi-verification={d.token}
                </dd>
              </dl>
              <VerifyDomainForm domain={d.domain} />
            </Card>
          ))}
        </div>
        <Card
          title={t("Gói chatbot đang chọn")}
          right={<CreditCard className="size-5 text-brand-700" />}
        >
          <p className="text-3xl font-bold">
            {price.monthly.toLocaleString("vi-VN")} ₫
            <span className="text-sm font-normal text-zinc-500">
              {" "}
              /tháng, gói Cơ bản
            </span>
          </p>
          <ul className="my-5 space-y-3">
            {price.includes.map((item) => (
              <li key={item} className="flex gap-2 text-sm">
                <ShieldCheck className="size-4 shrink-0 text-emerald-700" />
                {t(item)}
              </li>
            ))}
          </ul>
          <p className="mb-4 text-sm text-zinc-600">
            {access?.hasActiveSubscription
              ? `${activated ? t("Đã kích hoạt cho bot này") : t("Đã thanh toán, cần chọn bot kích hoạt")}: ${access.subscription?.planName ?? t("Gói trả phí")}`
              : t("Chưa có gói trả phí được xác nhận từ trung tâm.")}
          </p>
          {error && (
            <p role="alert" className="mb-4 text-sm text-amber-900">
              {error}
            </p>
          )}
          {access?.hasActiveSubscription && <ActivateLicenseForm />}
          {access ? (
            <CheckoutPanel prices={prices} />
          ) : (
            <Link
              href="/api/auth/hub/start?link=1"
              className={`${btnPrimary} w-full`}
            >
              {t("Liên kết tài khoản trung tâm")}
            </Link>
          )}
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            {t("Gói, đơn hàng và mã QR lấy qua API Skill Pages. Trạng thái thanh toán được kiểm tra tự động; tiền và quyền sử dụng do trung tâm xác nhận.")}
          </p>
        </Card>
      </div>
    </>
  );
}
