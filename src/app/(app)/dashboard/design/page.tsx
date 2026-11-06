import { requireCafe } from "@/lib/access";
import { loadMenu } from "@/lib/menu-data";
import { Design } from "./Design";

export const metadata = { title: "Design · Gebeta" };

export default async function DesignPage() {
  const { cafe } = await requireCafe("manager");
  return <Design initial={(await loadMenu({ id: cafe.id }))!} />;
}
