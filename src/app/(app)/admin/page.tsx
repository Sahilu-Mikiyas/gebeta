import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { isAdminPhone } from "@/lib/access";
import { effectivePlan } from "@/lib/plans";
import { displayPhone } from "@/lib/phone";
import { appUrlFromHeaders } from "@/lib/url";
import { telegramEnabled } from "@/lib/telegram";
import { Admin } from "./Admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin · Gebeta" };

export default async function AdminPage() {
  const u = await requireOwner();
  if (!isAdminPhone(u.phone)) notFound();
  const [cafes, payments, orders, owners, scans] = await Promise.all([
    prisma.cafe.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { owner: { select: { name: true, phone: true } }, _count: { select: { items: true, scans: true, orders: true } } } }),
    prisma.planPayment.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { cafe: { select: { nameEn: true } } } }),
    prisma.shopOrder.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { cafe: { select: { nameEn: true } } } }),
    prisma.owner.count(),
    prisma.scan.count({ where: { at: { gte: new Date(Date.now() - 7 * 86_400_000) } } }),
  ]);
  return (
    <Admin
      appUrl={await appUrlFromHeaders()}
      bot={telegramEnabled()}
      totals={{ cafes: cafes.length, owners, scans }}
      cafes={cafes.map((c) => ({ id: c.id, name: c.nameEn, slug: c.slug, owner: c.owner.name, phone: displayPhone(c.owner.phone), plan: effectivePlan(c.plan, c.planUntil), until: c.planUntil?.toISOString() ?? null, items: c._count.items, scans: c._count.scans, orders: c._count.orders, at: c.createdAt.toISOString() }))}
      payments={payments.map((p) => ({ id: p.id, cafe: p.cafe.nameEn, plan: p.plan, months: p.months, amount: p.amount, method: p.payMethod, ref: p.payRef, status: p.status, at: p.createdAt.toISOString() }))}
      orders={orders.map((o) => ({ id: o.id, cafe: o.cafe.nameEn, kind: o.kind, qty: o.qty, led: o.ledColor, total: o.total, address: o.address, phone: o.phone, method: o.payMethod, ref: o.payRef, status: o.status, at: o.createdAt.toISOString() }))}
    />
  );
}
