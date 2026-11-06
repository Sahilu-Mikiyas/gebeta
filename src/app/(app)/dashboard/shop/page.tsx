import { prisma } from "@/lib/db";
import { requireCafe } from "@/lib/access";
import { effectivePlan, paymentAccounts } from "@/lib/plans";
import { displayPhone } from "@/lib/phone";
import { Shop } from "./Shop";

export const metadata = { title: "Shop & plan · Gebeta" };

export default async function ShopPage() {
  const { cafe, user } = await requireCafe("owner");
  const [orders, payments] = await Promise.all([
    prisma.shopOrder.findMany({ where: { cafeId: cafe.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.planPayment.findMany({ where: { cafeId: cafe.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <Shop
      plan={effectivePlan(cafe.plan, cafe.planUntil)}
      planUntil={cafe.planUntil?.toISOString() ?? null}
      accounts={paymentAccounts()}
      defaultPhone={displayPhone(user.phone)}
      defaultAddress={cafe.area}
      orders={orders.map((o) => ({ id: o.id, kind: o.kind, qty: o.qty, total: o.total, status: o.status, at: o.createdAt.toISOString() }))}
      payments={payments.map((p) => ({ id: p.id, plan: p.plan, months: p.months, amount: p.amount, status: p.status, at: p.createdAt.toISOString() }))}
    />
  );
}
