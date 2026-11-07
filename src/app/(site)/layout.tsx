import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ThemeProvider } from "@/components/site/ThemeProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="flex min-h-dvh flex-col bg-white text-zinc-900 transition-colors duration-200 dark:bg-[#07080b] dark:text-[#f4f5f7]">
        <SiteHeader />
        <main className="flex flex-1 flex-col">{children}</main>
        <SiteFooter />
      </div>
    </ThemeProvider>
  );
}
