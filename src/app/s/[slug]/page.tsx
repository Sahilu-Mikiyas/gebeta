import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadMenu } from "@/lib/menu-data";
import { ScreenBoard } from "./ScreenBoard";
import "./screen.css";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const menu = await loadMenu({ slug });
  return { title: menu ? `${menu.cafe.nameEn} · Menu screen` : "Menu screen", robots: { index: false } };
}

// /s/[slug] — full-screen menu board for a TV. ?embed=1 is used by the dashboard preview.
export default async function ScreenPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const sp = await searchParams;
  const menu = await loadMenu({ slug });
  if (!menu) notFound();
  return (
    <>
      <link
        rel="stylesheet"
        precedence="default"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@500;600&family=Barlow+Condensed:wght@700;800&family=Kaushan+Script&family=Noto+Sans+Ethiopic:wght@600;800&display=swap"
      />
      <ScreenBoard initial={menu} slug={slug} embed={sp.embed === "1"} />
    </>
  );
}
