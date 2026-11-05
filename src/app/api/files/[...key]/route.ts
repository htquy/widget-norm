import { app } from "@/infrastructure/container";

export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key } = await ctx.params;
  try {
    const c = await app();
    const file = await c.files.get(key.map(decodeURIComponent).join("/"));
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        // SVG do shop tải lên không được chạy script
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response("Bad request", { status: 400 });
  }
}
