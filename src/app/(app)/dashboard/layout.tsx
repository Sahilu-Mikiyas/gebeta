import { requireCafe, isAdminPhone } from "@/lib/access";
import { getUiLang } from "@/lib/lang-server";
import { prisma } from "@/lib/db";
import { effectivePlan } from "@/lib/plans";
import { Shell } from "./Shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, cafe, role, cafes } = await requireCafe();
  const lang = await getUiLang();
  const since = new Date(Date.now() - 18 * 3_600_000);
  const [openOrders, openCalls] = await Promise.all([
    prisma.order.count({ where: { cafeId: cafe.id, status: { in: ["new", "preparing"] }, createdAt: { gte: since } } }),
    prisma.serviceCall.count({ where: { cafeId: cafe.id, doneAt: null, createdAt: { gte: since } } }),
  ]);
  return (
    <Shell
      lang={lang}
      role={role}
      user={{ name: user.name }}
      cafe={{ id: cafe.id, slug: cafe.slug, nameEn: cafe.nameEn, nameAm: cafe.nameAm, plan: effectivePlan(cafe.plan, cafe.planUntil) }}
      cafes={cafes.map((c) => ({ id: c.id, nameEn: c.nameEn, role: c.role }))}
      badges={{ orders: openOrders + openCalls }}
      admin={isAdminPhone(user.phone)}
    >
      {children}
    </Shell>
  );
}
