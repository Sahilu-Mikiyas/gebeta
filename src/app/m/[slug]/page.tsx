import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { loadMenu } from "@/lib/menu-data";
import { pick, type Lang } from "@/lib/i18n";
import { MenuView } from "@/components/MenuView";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { slug }, select: { nameEn: true, nameAm: true } });
  if (!cafe) return { title: "Menu not found" };
  return { title: `${cafe.nameEn} · Menu`, description: cafe.nameAm || undefined };
}

export default async function PublicMenu({ params, searchParams }: Params) {
  const { slug } = await params;
  const sp = await searchParams;
  const menu = await loadMenu({ slug });
  if (!menu) notFound();

  const lang: Lang = sp.lang === "am" ? "am" : "en";
  const fast = sp.fast === "1";

  // Count a scan only when the visit comes from the printed QR code (it carries ?src=qr).
  if (sp.src === "qr") {
    await prisma.scan.create({ data: { cafeId: menu.cafe.id, lang } }).catch(() => {});
  }

  const href = (l: Lang, f: boolean) => `/m/${slug}?lang=${l}${f ? "&fast=1" : ""}`;
  return (
    <main className="pm-page" data-t={menu.cafe.template}>
      {/* Only the two Latin display faces load here; Ethiopic uses the phone's built-in font. */}
      <link
        rel="stylesheet"
        precedence="default"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@700;800&display=swap"
      />
      <title>{`${pick(lang, menu.cafe.nameEn, menu.cafe.nameAm)} · Menu`}</title>
      <MenuView
        cafe={menu.cafe}
        categories={menu.categories}
        lang={lang}
        fastOnly={fast}
        showJumpNav
        controls={{ kind: "links", en: href("en", fast), am: href("am", fast), fastToggle: href(lang, !fast) }}
      />
    </main>
  );
}
