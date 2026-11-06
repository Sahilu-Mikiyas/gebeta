import { prisma } from "@/lib/db";
import { requireCafe } from "@/lib/access";
import { Specials } from "./Specials";

export const metadata = { title: "Specials & timing · Gebeta" };

export default async function SpecialsPage() {
  const { cafe } = await requireCafe("manager");
  const [items, categories, specials, changes] = await Promise.all([
    prisma.item.findMany({ where: { cafeId: cafe.id }, select: { id: true, nameEn: true, nameAm: true, price: true }, orderBy: { nameEn: "asc" } }),
    prisma.category.findMany({ where: { cafeId: cafe.id }, select: { id: true, nameEn: true, nameAm: true, fromMin: true, toMin: true }, orderBy: { position: "asc" } }),
    prisma.special.findMany({ where: { cafeId: cafe.id }, include: { item: { select: { nameEn: true, nameAm: true, price: true } } } }),
    prisma.priceChange.findMany({ where: { cafeId: cafe.id }, orderBy: { effectiveAt: "desc" }, take: 20 }),
  ]);
  return <Specials items={items} categories={categories} initialSpecials={specials} initialChanges={changes} />;
}
