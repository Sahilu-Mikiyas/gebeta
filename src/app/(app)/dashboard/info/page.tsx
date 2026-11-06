import { requireCafe } from "@/lib/access";
import { loadMenu } from "@/lib/menu-data";
import { appUrlFromHeaders } from "@/lib/url";
import { Info } from "./Info";

export const metadata = { title: "Cafe info · Gebeta" };

export default async function InfoPage() {
  const { cafe, role } = await requireCafe("manager");
  const menu = (await loadMenu({ id: cafe.id }))!;
  return <Info cafe={menu.cafe} appUrl={await appUrlFromHeaders()} canEditLink={role === "owner"} />;
}
