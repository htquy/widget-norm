import { NextResponse } from "next/server";
import { requireAccount } from "@/infrastructure/auth/session";
import { allKeys, missingKeys, type Scope } from "@/lib/i18n/coverage";
import { LANGUAGES, languageByCode } from "@/lib/i18n/languages";

export const dynamic = "force-dynamic";

/**
 * Tải file JSON các câu CHƯA dịch của một ngôn ngữ để gửi người dịch: { "câu tiếng Việt gốc": "" }.
 * ?lang=ja&scope=ui|widget  (thêm &all=1 để lấy cả câu đã dịch kèm bản dịch hiện có làm tham chiếu — không dùng ở đây)
 */
export async function GET(req: Request) {
  await requireAccount();
  const u = new URL(req.url);
  const lang = u.searchParams.get("lang") ?? "";
  const scope: Scope = u.searchParams.get("scope") === "widget" ? "widget" : "ui";
  const def = languageByCode(lang);
  if (!def || !LANGUAGES.some((l) => l.code === def.code)) return NextResponse.json({ error: "Ngôn ngữ không hợp lệ" }, { status: 400 });
  const keys = u.searchParams.get("all") === "1" ? allKeys(scope) : missingKeys(scope, def.code);
  const body = Object.fromEntries(keys.map((k) => [k, ""]));
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="translations-${scope}-${def.code}.json"`,
    },
  });
}
