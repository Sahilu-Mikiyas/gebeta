import { prisma } from "@/lib/db";
import { notifyCafe } from "@/lib/notify";

// Weekly summary to every cafe's Telegram. Called by the scheduled GitHub workflow with CRON_SECRET.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("forbidden", { status: 403 });
  const week = new Date(Date.now() - 7 * 86_400_000);
  const prev = new Date(Date.now() - 14 * 86_400_000);
  const cafes = await prisma.cafe.findMany({ select: { id: true } });
  let sent = 0;
  for (const c of cafes) {
    const [scans, scansPrev, orders, top, fb] = await Promise.all([
      prisma.scan.count({ where: { cafeId: c.id, at: { gte: week } } }),
      prisma.scan.count({ where: { cafeId: c.id, at: { gte: prev, lt: week } } }),
      prisma.order.findMany({ where: { cafeId: c.id, createdAt: { gte: week }, status: { not: "cancelled" } }, select: { total: true } }),
      prisma.itemView.groupBy({ by: ["itemId"], where: { cafeId: c.id, at: { gte: week } }, _count: true, orderBy: { _count: { itemId: "desc" } }, take: 3 }),
      prisma.feedback.aggregate({ where: { cafeId: c.id, createdAt: { gte: week } }, _avg: { rating: true }, _count: true }),
    ]);
    if (!scans && !orders.length) continue;
    const names = await prisma.item.findMany({ where: { id: { in: top.map((t) => t.itemId) } }, select: { id: true, nameEn: true } });
    const diff = scansPrev ? Math.round(((scans - scansPrev) / scansPrev) * 100) : 0;
    const lines = [
      `📊 <b>Your week</b> · ሳምንትዎ`,
      `📱 ${scans} menu scans${scansPrev ? ` (${diff >= 0 ? "+" : ""}${diff}% vs last week)` : ""}`,
      orders.length ? `🧾 ${orders.length} table orders · ${orders.reduce((s, o) => s + o.total, 0).toLocaleString("en-US")} ብር` : "",
      top.length ? `🔥 Most viewed: ${top.map((t) => names.find((n) => n.id === t.itemId)?.nameEn).filter(Boolean).join(", ")}` : "",
      fb._count ? `⭐ ${fb._avg.rating?.toFixed(1)} average from ${fb._count} reviews` : "",
    ].filter(Boolean);
    await notifyCafe(c.id, lines.join("\n"));
    sent++;
  }
  return Response.json({ ok: true, sent });
}
