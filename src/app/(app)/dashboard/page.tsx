import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { getUiLang } from "@/lib/lang-server";
import { loadMenu } from "@/lib/menu-data";
import { addisDayKey } from "@/lib/menu";
import { DAY_NAMES } from "@/lib/i18n";
import { Editor, type Stats } from "./Editor";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Dashboard · Gebeta" };

export default async function DashboardPage() {
  const owner = await requireOwner();
  const lang = await getUiLang();
  const cafe = await prisma.cafe.findFirst({ where: { ownerId: owner.id }, orderBy: { createdAt: "asc" } });
  if (!cafe) return <Onboarding lang={lang} ownerName={owner.name} />;

  const menu = await loadMenu({ id: cafe.id });
  if (!menu) throw new Error("Cafe disappeared");

  // Scans for the last 7 days, bucketed by Addis Ababa calendar day.
  const now = Date.now();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86_400_000);
    const local = new Date(d.getTime() + 3 * 3_600_000);
    return { key: addisDayKey(d), label: DAY_NAMES[lang][local.getUTCDay()], count: 0 };
  });
  const scans = await prisma.scan.findMany({
    where: { cafeId: cafe.id, at: { gte: new Date(now - 8 * 86_400_000) } },
    select: { at: true, lang: true },
  });
  let total = 0;
  let amharic = 0;
  for (const s of scans) {
    const day = days.find((d) => d.key === addisDayKey(s.at));
    if (!day) continue;
    day.count++;
    total++;
    if (s.lang === "am") amharic++;
  }
  const stats: Stats = { days, total, amharicPct: total ? Math.round((amharic / total) * 100) : 0 };

  const h = await headers();
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return <Editor initial={menu} stats={stats} appUrl={appUrl} lang={lang} />;
}
