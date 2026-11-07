import type { Metadata, Viewport } from "next";
import { siteConfig } from "@/lib/site";
import { I18nProvider } from "@/lib/i18n/client";
import { getLocale, getT } from "@/lib/i18n/server";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  const tagline = t(siteConfig.tagline);
  const description = t(siteConfig.description);
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: `${siteConfig.name} — ${tagline}`, template: `%s · ${siteConfig.name}` },
    description,
    openGraph: { type: "website", siteName: siteConfig.name, title: `${siteConfig.name} — ${tagline}`, description, url: siteConfig.url },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning className="dark">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('wn_theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
