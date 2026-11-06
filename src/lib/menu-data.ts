import { prisma } from "./db";
import { applyPercent, isSoldOut } from "./menu";
import { activeSpecial, addisMinutes, inWindow } from "./pricing";
import { fastingToday } from "./ethiopia";
import { effectivePlan } from "./plans";
import { photoSrc } from "./library";
import type { MenuDTO, Option } from "./types";

// Apply scheduled price changes whose time has come. Runs before any menu is shown,
// so there is no background job to keep alive.
export async function applyDuePriceChanges(cafeId: string) {
  const due = await prisma.priceChange.findMany({ where: { cafeId, appliedAt: null, effectiveAt: { lte: new Date() } }, orderBy: { effectiveAt: "asc" } });
  for (const pc of due) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.priceChange.updateMany({ where: { id: pc.id, appliedAt: null }, data: { appliedAt: new Date() } });
      if (!claimed.count) return; // another request applied it
      const items = await tx.item.findMany({ where: { cafeId, ...(pc.categoryId ? { categoryId: pc.categoryId } : {}) } });
      for (const i of items) {
        const variants = (i.variants as Option[]).map((v) => ({ ...v, price: applyPercent(v.price, pc.percent) }));
        await tx.item.update({ where: { id: i.id }, data: { price: applyPercent(i.price, pc.percent), variants } });
      }
    });
  }
}

const asOptions = (v: unknown): Option[] =>
  Array.isArray(v) ? v.filter((o) => o && typeof o.nameEn === "string" && Number.isFinite(o.price)).map((o) => ({ nameEn: o.nameEn, nameAm: o.nameAm ?? "", price: Math.round(o.price) })) : [];

export async function loadMenu(where: { id: string } | { slug: string }, opts: { publicView?: boolean } = {}): Promise<MenuDTO | null> {
  const base = await prisma.cafe.findUnique({ where, select: { id: true } });
  if (!base) return null;
  await applyDuePriceChanges(base.id);

  const since = new Date(Date.now() - 14 * 86_400_000);
  const [cafe, views] = await Promise.all([
    prisma.cafe.findUnique({
      where: { id: base.id },
      include: {
        categories: { orderBy: { position: "asc" }, include: { items: { orderBy: { position: "asc" }, include: { specials: true } } } },
        slides: { orderBy: { position: "asc" } },
      },
    }),
    prisma.itemView.groupBy({ by: ["itemId"], where: { cafeId: base.id, at: { gte: since } }, _count: true, orderBy: { _count: { itemId: "desc" } }, take: 3 }),
  ]);
  if (!cafe) return null;
  const popular = new Set(views.filter((v) => v._count >= 3).map((v) => v.itemId));
  const now = new Date();
  const minute = addisMinutes(now);
  const fast = fastingToday(now);
  const fastingNow = cafe.fastingMode === "on" ? fast.season ?? { en: "Fasting menu", am: "የጾም ምናሌ" } : cafe.fastingMode === "auto" && fast.fasting ? fast.season : null;

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
      coverId: cafe.coverId,
      brandColor: cafe.brandColor,
      accentColor: cafe.accentColor,
      phone: cafe.phone,
      mapUrl: cafe.mapUrl,
      instagram: cafe.instagram,
      tiktok: cafe.tiktok,
      telegram: cafe.telegram,
      facebook: cafe.facebook,
      wifiName: cafe.wifiName,
      wifiPass: cafe.wifiPass,
      fastingMode: cafe.fastingMode,
      fastingNow,
      tableCount: cafe.tableCount,
      orderingOn: cafe.orderingOn,
      callsOn: cafe.callsOn,
      plan: effectivePlan(cafe.plan, cafe.planUntil, now),
      screenSeconds: cafe.screenSeconds,
      screenLang: cafe.screenLang,
      screenPortrait: cafe.screenPortrait,
      slides: cafe.slides.map((s) => s.imageId),
    },
    categories: cafe.categories.map((c) => ({
      id: c.id,
      nameEn: c.nameEn,
      nameAm: c.nameAm,
      fromMin: c.fromMin,
      toMin: c.toMin,
      showOnScreen: c.showOnScreen,
      availableNow: inWindow(minute, c.fromMin, c.toMin),
      items: c.items
        .filter((i) => !opts.publicView || !i.hidden)
        .map((i) => {
          const sp = activeSpecial(i.specials, now);
          const variants = asOptions(i.variants);
          return {
            id: i.id,
            categoryId: i.categoryId,
            nameEn: i.nameEn,
            nameAm: i.nameAm,
            descEn: i.descEn,
            descAm: i.descAm,
            price: variants.length ? variants[0].price : i.price,
            fasting: i.fasting,
            soldOut: isSoldOut(i.soldOutUntil, now),
            imageId: i.imageId,
            libraryPhoto: i.libraryPhoto,
            photo: photoSrc(i.imageId, i.libraryPhoto),
            tags: i.tags,
            variants,
            addons: asOptions(i.addons),
            hidden: i.hidden,
            special: sp ? { price: sp.price, labelEn: sp.labelEn, labelAm: sp.labelAm } : null,
            popular: popular.has(i.id),
          };
        }),
    })),
  };
}
