import { prisma } from "./db";
import { isSoldOut } from "./menu";
import type { MenuDTO } from "./types";

export async function loadMenu(where: { id: string } | { slug: string }): Promise<MenuDTO | null> {
  const cafe = await prisma.cafe.findUnique({
    where,
    include: {
      categories: {
        orderBy: { position: "asc" },
        include: { items: { orderBy: { position: "asc" } } },
      },
    },
  });
  if (!cafe) return null;
  const now = new Date();
  return {
    cafe: {
      id: cafe.id,
      slug: cafe.slug,
      nameEn: cafe.nameEn,
      nameAm: cafe.nameAm,
      area: cafe.area,
      hoursEn: cafe.hoursEn,
      hoursAm: cafe.hoursAm,
      template: cafe.template,
      logoId: cafe.logoId,
    },
    categories: cafe.categories.map((c) => ({
      id: c.id,
      nameEn: c.nameEn,
      nameAm: c.nameAm,
      items: c.items.map((i) => ({
        id: i.id,
        categoryId: i.categoryId,
        nameEn: i.nameEn,
        nameAm: i.nameAm,
        descEn: i.descEn,
        descAm: i.descAm,
        price: i.price,
        fasting: i.fasting,
        soldOut: isSoldOut(i.soldOutUntil, now),
        imageId: i.imageId,
      })),
    })),
  };
}
