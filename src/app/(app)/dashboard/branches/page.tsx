import { prisma } from "@/lib/db";
import { requireCafe } from "@/lib/access";
import { PLANS, effectivePlan } from "@/lib/plans";
import { Branches } from "./Branches";

export const metadata = { title: "Branches · Gebeta" };

export default async function BranchesPage() {
  const { cafe, user } = await requireCafe("owner");
  const owned = await prisma.cafe.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" }, include: { _count: { select: { items: true, scans: true } } } });
  return (
    <Branches
      current={cafe.id}
      branches={owned.map((c) => ({ id: c.id, nameEn: c.nameEn, area: c.area, slug: c.slug, items: c._count.items, scans: c._count.scans }))}
      limit={PLANS[effectivePlan(cafe.plan, cafe.planUntil)].branches}
    />
  );
}
