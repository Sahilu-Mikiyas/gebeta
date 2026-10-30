import { prisma } from "@/lib/db";
import { appUrlFrom, menuUrl, qrPng, qrSvg } from "@/lib/qr";

// GET /m/[slug]/qr?format=svg|png&download=1
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { slug }, select: { slug: true } });
  if (!cafe) return new Response("Not found", { status: 404 });

  const sp = new URL(req.url).searchParams;
  const url = menuUrl(appUrlFrom(req), cafe.slug);
  const download = sp.get("download") === "1";
  const headers: Record<string, string> = { "Cache-Control": "private, max-age=300" };

  if (sp.get("format") === "png") {
    if (download) headers["Content-Disposition"] = `attachment; filename="${cafe.slug}-qr.png"`;
    return new Response(new Uint8Array(await qrPng(url)), { headers: { ...headers, "Content-Type": "image/png" } });
  }
  if (download) headers["Content-Disposition"] = `attachment; filename="${cafe.slug}-qr.svg"`;
  return new Response(await qrSvg(url), { headers: { ...headers, "Content-Type": "image/svg+xml" } });
}
