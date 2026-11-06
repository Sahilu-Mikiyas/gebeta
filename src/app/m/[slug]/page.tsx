import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { loadMenu } from "@/lib/menu-data";
import { pick, type Lang } from "@/lib/i18n";
import { PublicMenu } from "./PublicMenu";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const cafe = await prisma.cafe.findUnique({ where: { slug }, select: { nameEn: true, nameAm: true, area: true } });
  if (!cafe) return { title: "Menu not found" };
  return { title: `${cafe.nameEn} · Menu`, description: [cafe.nameAm, cafe.area].filter(Boolean).join(" · ") || undefined };
}

export default async function PublicMenuPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const sp = await searchParams;
  const menu = await loadMenu({ slug }, { publicView: true });
  if (!menu) notFound();

  // Language: the link's choice, else the phone's language setting.
  const acceptsAmharic = /(^|,)\s*am\b/i.test((await headers()).get("accept-language") ?? "");
  const lang: Lang = sp.lang === "am" ? "am" : sp.lang === "en" ? "en" : acceptsAmharic ? "am" : "en";
  const rawTable = typeof sp.t === "string" ? sp.t.replace(/[^0-9a-zA-Z-]/g, "").slice(0, 6) : "";
  const table = rawTable && (menu.cafe.tableCount === 0 || Number(rawTable) <= menu.cafe.tableCount || isNaN(Number(rawTable))) ? rawTable : "";

  // Count a scan only when the visit comes from a printed QR code (it carries ?src=qr).
  if (sp.src === "qr") {
    await prisma.scan.create({ data: { cafeId: menu.cafe.id, lang, table } }).catch(() => {});
  }

  return (
    <main className="pm-page" data-t={menu.cafe.template}>
      {/* Only the two Latin display faces load here; Ethiopic uses the phone's built-in font. */}
      <link rel="stylesheet" precedence="default" href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow+Condensed:wght@700;800&display=swap" />
      <title>{`${pick(lang, menu.cafe.nameEn, menu.cafe.nameAm)} · Menu`}</title>
      <PublicMenu menu={menu} initialLang={lang} initialFast={sp.fast === "1"} table={table} />
    </main>
  );
}
