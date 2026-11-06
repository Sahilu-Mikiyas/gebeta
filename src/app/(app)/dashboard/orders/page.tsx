import { requireCafe } from "@/lib/access";
import { OrdersBoard } from "./OrdersBoard";

export const metadata = { title: "Orders & calls · Gebeta" };

export default async function OrdersPage() {
  const { cafe } = await requireCafe();
  return <OrdersBoard orderingOn={cafe.orderingOn} callsOn={cafe.callsOn} tables={cafe.tableCount} />;
}
