import { requireCafe } from "@/lib/access";
import { loadMenu } from "@/lib/menu-data";
import { PLANS, effectivePlan } from "@/lib/plans";
import { MenuEditor } from "./MenuEditor";

export const metadata = { title: "Menu · Gebeta" };

export default async function MenuPage() {
  const { cafe } = await requireCafe("manager");
  const menu = (await loadMenu({ id: cafe.id }))!;
  const limit = PLANS[effectivePlan(cafe.plan, cafe.planUntil)].items;
  return <MenuEditor initial={menu} itemLimit={limit === Infinity ? null : limit} />;
}
