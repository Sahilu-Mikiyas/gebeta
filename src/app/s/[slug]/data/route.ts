import { loadMenu } from "@/lib/menu-data";

// The TV polls this every 30 seconds so price and sold-out changes show up without a reload.
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const menu = await loadMenu({ slug }, { publicView: true });
  if (!menu) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json(menu, { headers: { "Cache-Control": "no-store" } });
}
