import { prisma } from "@/lib/db";
import { requireCafe } from "@/lib/access";
import { loadMenu } from "@/lib/menu-data";
import { Today } from "./Today";

export const metadata = { title: "Today · Gebeta" };

export default async function TodayPage() {
  const { cafe, role, user } = await requireCafe();
  const menu = (await loadMenu({ id: cafe.id }))!;
  const day = 86_400_000;
  const now = Date.now();
  const [scansToday, scansYesterday, ordersToday, feedback, scansEver] = await Promise.all([
    prisma.scan.count({ where: { cafeId: cafe.id, at: { gte: new Date(now - day) } } }),
    prisma.scan.count({ where: { cafeId: cafe.id, at: { gte: new Date(now - 2 * day), lt: new Date(now - day) } } }),
    prisma.order.findMany({ where: { cafeId: cafe.id, createdAt: { gte: new Date(now - day) }, status: { not: "cancelled" } }, select: { total: true } }),
    prisma.feedback.aggregate({ where: { cafeId: cafe.id, createdAt: { gte: new Date(now - 30 * day) } }, _avg: { rating: true }, _count: true }),
    prisma.scan.count({ where: { cafeId: cafe.id } }),
  ]);
  const items = menu.categories.flatMap((c) => c.items);
  const checklist = [
    { done: items.length >= 3, en: "Add your menu items", am: "ምግቦችዎን ይጨምሩ", href: "/dashboard/menu" },
    { done: items.some((i) => i.photo), en: "Add photos to a few items", am: "ለጥቂት ምግቦች ፎቶ ይጨምሩ", href: "/dashboard/menu" },
    { done: !!cafe.logoId, en: "Upload your logo", am: "አርማዎን ይጫኑ", href: "/dashboard/design" },
    { done: !!(cafe.hoursEn || cafe.phone || cafe.wifiName), en: "Add hours, phone and Wi-Fi", am: "ሰዓት፣ ስልክና ዋይፋይ ይጨምሩ", href: "/dashboard/info" },
    { done: scansEver > 0, en: "Print your QR and put it on a table", am: "QR ኮድዎን አትመው ጠረጴዛ ላይ ያድርጉ", href: "/dashboard/print" },
    { done: !!user.telegramChatId, en: "Connect Telegram for alerts", am: "ለማሳወቂያ ቴሌግራምን ያገናኙ", href: "/dashboard/account" },
  ];
  return (
    <Today
      menu={menu}
      role={role}
      userName={user.name}
      stats={{ scansToday, scansYesterday, orders: ordersToday.length, sales: ordersToday.reduce((s, o) => s + o.total, 0), rating: feedback._avg.rating, reviews: feedback._count }}
      checklist={checklist}
    />
  );
}
