import { prisma } from "@/lib/db";
import { requireCafe } from "@/lib/access";
import { addisDayKey } from "@/lib/menu";
import { getUiLang } from "@/lib/lang-server";
import { DAY_NAMES } from "@/lib/i18n";
import { Insights } from "./Insights";

export const metadata = { title: "Insights · Gebeta" };

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

export default async function InsightsPage() {
  const { cafe } = await requireCafe("manager");
  const lang = await getUiLang();
  const now = Date.now();
  const D = 86_400_000;
  const [scans, views, feedback, items, orders] = await Promise.all([
    prisma.scan.findMany({ where: { cafeId: cafe.id, at: { gte: new Date(now - 14 * D) } }, select: { at: true, lang: true, table: true } }),
    prisma.itemView.groupBy({ by: ["itemId"], where: { cafeId: cafe.id, at: { gte: new Date(now - 30 * D) } }, _count: true, orderBy: { _count: { itemId: "desc" } }, take: 10 }),
    prisma.feedback.findMany({ where: { cafeId: cafe.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.item.findMany({ where: { cafeId: cafe.id }, select: { id: true, nameEn: true, nameAm: true, price: true } }),
    prisma.order.findMany({ where: { cafeId: cafe.id, createdAt: { gte: new Date(now - 30 * D) }, status: { not: "cancelled" } }, select: { total: true, lines: { select: { name: true, qty: true } } } }),
  ]);

  const week = (offset: number) => scans.filter((s) => s.at.getTime() >= now - (offset + 7) * D && s.at.getTime() < now - offset * D);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * D);
    const key = addisDayKey(d);
    return { key, label: DAY_NAMES[lang][new Date(d.getTime() + 3 * 3_600_000).getUTCDay()], count: scans.filter((s) => addisDayKey(s.at) === key).length };
  });
  const hours = Array.from({ length: 24 }, (_, h) => scans.filter((s) => (s.at.getUTCHours() + 3) % 24 === h).length);
  const tables = Object.entries(week(0).reduce<Record<string, number>>((m, s) => (s.table ? { ...m, [s.table]: (m[s.table] ?? 0) + 1 } : m), {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const sold = Object.entries(orders.flatMap((o) => o.lines).reduce<Record<string, number>>((m, l) => ({ ...m, [l.name]: (m[l.name] ?? 0) + l.qty }), {}))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Price insight: compare with the same item name in other cafes in the same area (needs at least 3 cafes).
  const others = cafe.area.trim()
    ? await prisma.item.findMany({ where: { cafeId: { not: cafe.id }, cafe: { area: { contains: cafe.area.split(",")[0].trim(), mode: "insensitive" } } }, select: { nameEn: true, price: true, cafeId: true } })
    : [];
  const byName = new Map<string, { sum: number; cafes: Set<string> }>();
  for (const o of others) {
    const k = norm(o.nameEn);
    const e = byName.get(k) ?? { sum: 0, cafes: new Set() };
    e.sum += o.price;
    e.cafes.add(o.cafeId);
    byName.set(k, e);
  }
  const prices = items
    .map((i) => {
      const e = byName.get(norm(i.nameEn));
      return e && e.cafes.size >= 3 ? { name: i.nameEn, mine: i.price, avg: Math.round(e.sum / [...others].filter((o) => norm(o.nameEn) === norm(i.nameEn)).length), cafes: e.cafes.size } : null;
    })
    .filter(Boolean) as { name: string; mine: number; avg: number; cafes: number }[];

  return (
    <Insights
      days={days}
      hours={hours}
      thisWeek={week(0).length}
      lastWeek={week(7).length}
      amPct={week(0).length ? Math.round((week(0).filter((s) => s.lang === "am").length / week(0).length) * 100) : 0}
      tables={tables}
      viewed={views.map((v) => ({ name: items.find((i) => i.id === v.itemId)?.nameEn ?? "—", count: v._count }))}
      sold={sold}
      sales={orders.reduce((s, o) => s + o.total, 0)}
      feedback={feedback.map((f) => ({ id: f.id, rating: f.rating, comment: f.comment, table: f.table, at: f.createdAt.toISOString() }))}
      prices={prices}
      area={cafe.area}
    />
  );
}
