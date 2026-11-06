import { requireCafe } from "@/lib/access";
import { loadMenu } from "@/lib/menu-data";
import { appUrlFromHeaders } from "@/lib/url";
import { ScreenSettings } from "./ScreenSettings";

export const metadata = { title: "Menu screen · Gebeta" };

export default async function ScreenPage() {
  const { cafe } = await requireCafe("manager");
  return <ScreenSettings initial={(await loadMenu({ id: cafe.id }))!} appUrl={await appUrlFromHeaders()} />;
}
