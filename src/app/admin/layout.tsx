import { ThemeProvider } from "@/components/site/ThemeProvider";

/** Mọi trang quản trị dùng chung chế độ sáng/tối với website (khoá wn_theme); [data-admin] áp token màu trong globals.css */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div data-admin className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
        {children}
      </div>
    </ThemeProvider>
  );
}
