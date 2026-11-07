import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // Mô hình 3D demo đọc từ đĩa khi nạp dữ liệu demo → đưa vào bản build serverless
  outputFileTracingIncludes: { "/**": ["./assets/demo-furniture/**"] },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [
      // Trang nhúng phải hiển thị được trong iframe trên web của shop.
      { source: "/embed/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }] },
      { source: "/admin/:path*", headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }] },
      {
        source: "/widget.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300" },
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
