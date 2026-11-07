import { localizeMeta } from "@/bots/localize";
import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import Link from "next/link";
import { BOT_METAS, metaBySlug } from "@/bots/catalog";
import { Container } from "@/components/site/Container";
import { SignupForm } from "@/components/site/SignupForm";
import { getSession } from "@/infrastructure/auth/session";
import { Mail, ShieldCheck } from "lucide-react";
import { hubAccessToken } from "@/infrastructure/hub/client";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
  title: t("Đăng ký dùng thử"),
  description:
    t("Tạo tài khoản và chatbot đầu tiên trong 1 phút. Dùng thử 14 ngày, không cần thẻ."),
};
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ bot?: string }>;
}) {
  const { t } = await getT();
  const preset =
    metaBySlug((await searchParams).bot ?? "")?.kind ?? BOT_METAS[0].kind;
  const session = await getSession();
  const linked =
    session && process.env.HUB_CLIENT_ID
      ? await hubAccessToken(session.accountId).catch(() => null)
      : null;
  return (
    <section className="aurora flex-1 py-12 sm:py-20">
      <Container className="grid items-start gap-10 lg:grid-cols-2">
        <div>
          <p className="eyebrow">{t("Dùng thử 14 ngày")}</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-white [text-wrap:balance]">
            {t("Tạo chatbot đầu tiên của bạn")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-zinc-600 dark:text-white/65">
            {t("Chọn loại chatbot, đặt tên cửa hàng và vào thẳng trang quản trị. Bạn có thể thêm chatbot khác trong cùng tài khoản bất cứ lúc nào.")}
          </p>
          <ul className="mt-6 space-y-2 text-sm text-zinc-700 dark:text-white/75">
            <li>{t("Không cần thẻ thanh toán")}</li>
            <li>{t("Đầy đủ tính năng gói Chuyên nghiệp trong 14 ngày")}</li>
            <li>{t("Nhập sản phẩm bằng file CSV mẫu hoặc thêm từng mục")}</li>
          </ul>
          <p className="mt-6 text-sm text-zinc-600 dark:text-white/65">
            {t("Đã có tài khoản?")}{" "}
            <Link
              href="/admin/login"
              className="font-semibold text-brand-700 underline dark:text-brand-300"
            >
              {t("Đăng nhập")}
            </Link>
          </p>
        </div>
        {process.env.HUB_CLIENT_ID && !linked ? (
          <div className="rounded-3xl border border-brand-200 bg-white p-8 shadow-lift">
            <Mail className="size-10 text-brand-700" />
            <h2 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-950">
              {t("Một email. Cả không gian cửa hàng.")}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              {t("Dùng tài khoản trung tâm để tạo chatbot, quản lý website và thanh toán. Sau đăng nhập, bạn chọn chatbot và đăng ký domain tại đây.")}
            </p>
            <a
              href={`/api/auth/hub/start?${new URLSearchParams({ ...(session ? { link: "1" } : {}), returnTo: `/signup?bot=${BOT_METAS.find((m) => m.kind === preset)?.slug ?? "avi"}` })}`}
              className="btn-primary mt-7 w-full"
            >
              {t("Tiếp tục với tài khoản email")}
            </a>
            <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-zinc-500">
              <ShieldCheck className="size-4 shrink-0" />
              {t("Không yêu cầu thẻ. Mỗi domain chỉ có một tài khoản sở hữu và một thời gian dùng thử.")}
            </p>
          </div>
        ) : (
          <SignupForm
            kinds={BOT_METAS.map((raw) => localizeMeta(raw, t)).map((m) => ({
              kind: m.kind,
              name: m.name,
              tagline: m.tagline,
            }))}
            defaultKind={preset}
            signedIn={!!session}
          />
        )}
      </Container>
    </section>
  );
}
