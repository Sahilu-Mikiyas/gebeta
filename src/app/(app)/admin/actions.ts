"use server";

import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { isAdminPhone } from "@/lib/access";
import { normalizePhone } from "@/lib/phone";
import { createResetCode } from "@/lib/reset";
import { tgCall } from "@/lib/telegram";

async function requireAdmin() {
  const u = await requireOwner();
  if (!isAdminPhone(u.phone)) throw new Error("Admins only");
  return u;
}

export async function approvePlan(id: string, approve: boolean) {
  await requireAdmin();
  const p = await prisma.planPayment.findUnique({ where: { id } });
  if (!p || p.status !== "pending") return;
  if (!approve) return void (await prisma.planPayment.update({ where: { id }, data: { status: "rejected" } }));
  const cafe = await prisma.cafe.findUniqueOrThrow({ where: { id: p.cafeId } });
  const from = cafe.planUntil && cafe.planUntil > new Date() ? cafe.planUntil : new Date();
  const until = new Date(from.getTime() + p.months * 30 * 86_400_000);
  // A Group plan covers every branch the owner has.
  await prisma.$transaction([
    prisma.planPayment.update({ where: { id }, data: { status: "paid" } }),
    prisma.cafe.updateMany({ where: p.plan === "group" ? { ownerId: cafe.ownerId } : { id: cafe.id }, data: { plan: p.plan, planUntil: until } }),
  ]);
}

export async function setShopStatus(id: string, status: string) {
  await requireAdmin();
  if (!["pending", "paid", "making", "delivered", "cancelled"].includes(status)) return;
  await prisma.shopOrder.update({ where: { id }, data: { status } });
}

export async function grantPlan(cafeId: string, plan: "free" | "cafe" | "group", days: number) {
  await requireAdmin();
  await prisma.cafe.update({ where: { id: cafeId }, data: { plan, planUntil: plan === "free" ? null : new Date(Date.now() + days * 86_400_000) } });
}

export async function supportResetCode(phone: string): Promise<string | null> {
  await requireAdmin();
  const p = normalizePhone(phone);
  const owner = p ? await prisma.owner.findUnique({ where: { phone: p } }) : null;
  return owner ? createResetCode(owner.id) : null;
}

export async function connectBot(appUrl: string): Promise<string> {
  await requireAdmin();
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_SECRET) return "Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET on the server first.";
  const r = (await tgCall("setWebhook", { url: `${appUrl}/api/telegram`, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message"] })) as { ok?: boolean; description?: string } | null;
  await tgCall("setMyCommands", {
    commands: [
      { command: "menu", description: "Your menu and prices" },
      { command: "price", description: "Change a price: /price macchiato 100" },
      { command: "soldout", description: "Mark sold out: /soldout chechebsa" },
      { command: "available", description: "Back on the menu" },
      { command: "stats", description: "Scans and orders today" },
      { command: "reset", description: "Password reset code" },
    ],
  });
  return r?.ok ? "Bot connected ✓" : `Telegram said: ${r?.description ?? "no answer"}`;
}
