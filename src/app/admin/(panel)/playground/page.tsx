import { getT } from "@/lib/i18n/server";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Globe2,
  Palette,
} from "lucide-react";
import { requireSession } from "@/infrastructure/auth/session";
import { app } from "@/infrastructure/container";
import { metaByKind } from "@/bots/catalog";
import { ChatWidget } from "@/components/widget/ChatWidget";
import { PageHeader } from "@/components/admin/ui";

export default async function PlaygroundPage() {
  const { t } = await getT();
  const s = await requireSession(),
    c = await app(),
    tenant = (await c.tenants.byId(s.tenantId))!,
    meta = metaByKind(tenant.kind);
  return (
    <>
      <PageHeader
        title={t("Thử một cuộc trò chuyện")}
        subtitle={t("Chatbot thật, dùng chính dữ liệu cửa hàng của bạn. Các cuộc hội thoại thử cũng được lưu trong workspace.")}
      />
      <div className="grid items-start gap-8 xl:grid-cols-[1fr_430px]">
        <div className="order-2 xl:order-1">
          <div className="rounded-3xl bg-white p-7 ring-1 ring-zinc-200">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800">
              <CheckCircle2 className="size-4" />
              {meta.shortName}
            </span>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight">
              {t("Khách hỏi thế này,")}
              <br />
              {t("bot sẽ trả lời ra sao?")}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-600">
              {t("Thử các tình huống thực tế: tìm sản phẩm theo ngân sách, hỏi chính sách đổi trả, đặt lịch hoặc yêu cầu gặp nhân viên. Chưa có dữ liệu? Thêm trước để bot có cơ sở trả lời.")}
            </p>
            <div className="mt-6 space-y-3">
              {meta.sampleQuestions.map((q) => (
                <p
                  key={q}
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700"
                >
                  “{q}”
                </p>
              ))}
            </div>
          </div>
          <div className="mt-5 space-y-2">
            {[
              {
                Icon: BookOpen,
                href: "/admin/settings",
                title: t("Bổ sung kiến thức & chính sách"),
              },
              {
                Icon: Palette,
                href: "/admin/widget",
                title: t("Chỉnh giao diện theo thương hiệu"),
              },
              {
                Icon: Globe2,
                href: "/admin/billing",
                title: t("Xác minh domain & đưa lên website"),
              },
            ].map(({ Icon, href, title }) => (
              <Link
                key={href}
                href={href}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-medium"
              >
                <Icon className="size-4 text-brand-700" />
                {title}
                <ArrowRight className="ml-auto size-4 text-zinc-400" />
              </Link>
            ))}
          </div>
        </div>
        <div className="order-1 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-lift xl:order-2">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 text-xs text-zinc-500">
            <span>{t("Xem từ góc nhìn của khách")}</span>
            <span className="text-emerald-800">{t("Phiên thử trực tiếp")}</span>
          </div>
          <div className="h-[650px] max-h-[80dvh]">
            <ChatWidget
              tenant={tenant.slug}
              visitorId={`test-${s.userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 45)}`}
            />
          </div>
        </div>
      </div>
    </>
  );
}
