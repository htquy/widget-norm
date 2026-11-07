import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, isLocale, localeFromAcceptLanguage, type Locale } from "./config";
import { makeT, type Translate } from "./translate";

/** Ngôn ngữ của người đang xem: cookie → Accept-Language → mặc định */
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  return localeFromAcceptLanguage((await headers()).get("accept-language"));
}

export async function getT(): Promise<{ t: Translate; locale: Locale }> {
  const locale = await getLocale();
  return { t: makeT(locale), locale };
}
