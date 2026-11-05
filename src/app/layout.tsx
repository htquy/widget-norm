import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Widget Norm — Trợ lý chat bán hàng cho cửa hàng",
  description: "Chatbot AI tư vấn sản phẩm, đặt lịch, chuyển nhân viên và phân tích nhu cầu khách cho mọi cửa hàng.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
