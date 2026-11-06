"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCafe, CAFE_COOKIE } from "@/lib/access";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { logChange } from "@/lib/history";
import { PLANS, STANDS, effectivePlan, standTotal, type StandId } from "@/lib/plans";
import { uniqueSlug } from "./actions";
import { slugify } from "@/lib/slug";
import { notifyCafe } from "@/lib/notify";
import { botUsername, telegramEnabled } from "@/lib/telegram";

const text = (n: number) => z.string().trim().max(n);
const minutes = z.number().int().min(0).max(1440);

// ---------- specials & scheduled prices ----------

export async function saveSpecial(input: { id?: string; itemId: string; price: number; days: number; fromMin: number; toMin: number; labelEn: string; labelAm: string; active: boolean }) {
  const { cafe, user } = await requireCafe("manager");
  const d = z
    .object({ id: z.string().optional(), itemId: z.string(), price: z.number().int().min(0).max(1_000_000), days: z.number().int().min(1).max(127), fromMin: minutes, toMin: minutes, labelEn: text(60), labelAm: text(60), active: z.boolean() })
    .parse(input);
  const item = await prisma.item.findFirst({ where: { id: d.itemId, cafeId: cafe.id } });
  if (!item) throw new Error("Item not found");
  const { id, ...data } = d;
  if (id) {
    const own = await prisma.special.findFirst({ where: { id, cafeId: cafe.id } });
    if (!own) throw new Error("Special not found");
    await prisma.special.update({ where: { id }, data });
  } else await prisma.special.create({ data: { ...data, cafeId: cafe.id } });
  await logChange(cafe.id, user.name, "special", `Special: ${item.nameEn} at ${d.price} birr`);
  return listSpecials();
}

export async function deleteSpecial(id: string) {
  const { cafe } = await requireCafe("manager");
  await prisma.special.deleteMany({ where: { id, cafeId: cafe.id } });
  return listSpecials();
}

export async function listSpecials() {
  const { cafe } = await requireCafe("staff");
  return prisma.special.findMany({ where: { cafeId: cafe.id }, include: { item: { select: { nameEn: true, nameAm: true, price: true } } }, orderBy: { item: { nameEn: "asc" } } });
}

export async function schedulePriceChange(percent: number, categoryId: string | null, effectiveAt: string) {
  const { cafe, user } = await requireCafe("manager");
  const pct = z.number().int().min(-50).max(100).refine((n) => n !== 0).parse(percent);
  const when = new Date(effectiveAt);
  if (isNaN(when.getTime()) || when < new Date()) throw new Error("Pick a time in the future");
  if (categoryId && !(await prisma.category.findFirst({ where: { id: categoryId, cafeId: cafe.id } }))) throw new Error("Section not found");
  await prisma.priceChange.create({ data: { cafeId: cafe.id, categoryId, percent: pct, effectiveAt: when } });
  await logChange(cafe.id, user.name, "price", `Scheduled ${pct > 0 ? "+" : ""}${pct}% for ${when.toISOString().slice(0, 16)}`);
  return listPriceChanges();
}

export async function cancelPriceChange(id: string) {
  const { cafe } = await requireCafe("manager");
  await prisma.priceChange.deleteMany({ where: { id, cafeId: cafe.id, appliedAt: null } });
  return listPriceChanges();
}

export async function listPriceChanges() {
  const { cafe } = await requireCafe("staff");
  return prisma.priceChange.findMany({ where: { cafeId: cafe.id }, orderBy: { effectiveAt: "desc" }, take: 20 });
}

// ---------- live orders & calls ----------

export async function liveFeed() {
  const { cafe } = await requireCafe("staff");
  const since = new Date(Date.now() - 18 * 3_600_000);
  const [orders, calls] = await Promise.all([
    prisma.order.findMany({ where: { cafeId: cafe.id, createdAt: { gte: since } }, include: { lines: true }, orderBy: { createdAt: "desc" }, take: 80 }),
    prisma.serviceCall.findMany({ where: { cafeId: cafe.id, doneAt: null, createdAt: { gte: since } }, orderBy: { createdAt: "asc" } }),
  ]);
  return { orders, calls, now: Date.now() };
}

export async function setOrderStatus(id: string, status: string, payMethod?: string) {
  const { cafe } = await requireCafe("staff");
  const s = z.enum(["new", "preparing", "served", "paid", "cancelled"]).parse(status);
  const pm = payMethod ? z.enum(["cash", "telebirr", "cbe", "chapa"]).parse(payMethod) : undefined;
  await prisma.order.updateMany({ where: { id, cafeId: cafe.id }, data: { status: s, ...(s === "paid" ? { paidAt: new Date(), payMethod: pm ?? "cash" } : {}) } });
  return liveFeed();
}

export async function doneCall(id: string) {
  const { cafe } = await requireCafe("staff");
  await prisma.serviceCall.updateMany({ where: { id, cafeId: cafe.id }, data: { doneAt: new Date() } });
  return liveFeed();
}

// ---------- team ----------

export async function createInvite(role: "manager" | "staff") {
  const { cafe } = await requireCafe("owner");
  const r = z.enum(["manager", "staff"]).parse(role);
  const plan = PLANS[effectivePlan(cafe.plan, cafe.planUntil)];
  const count = await prisma.cafeMember.count({ where: { cafeId: cafe.id } });
  if (count >= plan.staff) throw new Error("PLAN_STAFF");
  const token = crypto.randomBytes(18).toString("base64url");
  await prisma.invite.create({ data: { cafeId: cafe.id, role: r, token } });
  return token;
}

export async function removeMember(memberId: string) {
  const { cafe } = await requireCafe("owner");
  await prisma.cafeMember.deleteMany({ where: { id: memberId, cafeId: cafe.id } });
}

export async function setMemberRole(memberId: string, role: "manager" | "staff") {
  const { cafe } = await requireCafe("owner");
  await prisma.cafeMember.updateMany({ where: { id: memberId, cafeId: cafe.id }, data: { role: z.enum(["manager", "staff"]).parse(role) } });
}

// ---------- branches ----------

export async function createBranch(nameEn: string, area: string, copyMenu: boolean) {
  const { cafe, user, role } = await requireCafe("owner");
  if (role !== "owner") throw new Error("Only the owner can add branches");
  const name = text(80).min(2).parse(nameEn);
  const owned = await prisma.cafe.count({ where: { ownerId: user.id } });
  if (owned >= PLANS[effectivePlan(cafe.plan, cafe.planUntil)].branches) throw new Error("PLAN_BRANCHES");
  const source = copyMenu ? await prisma.category.findMany({ where: { cafeId: cafe.id }, include: { items: true }, orderBy: { position: "asc" } }) : [];
  const branch = await prisma.$transaction(async (tx) => {
    const b = await tx.cafe.create({
      data: {
        ownerId: user.id,
        slug: await uniqueSlug(slugify(name)),
        nameEn: name,
        nameAm: cafe.nameAm,
        area: text(80).parse(area),
        template: cafe.template,
        brandColor: cafe.brandColor,
        accentColor: cafe.accentColor,
        logoId: null,
        plan: cafe.plan,
        planUntil: cafe.planUntil,
      },
    });
    for (const c of source) {
      await tx.category.create({
        data: {
          cafeId: b.id, nameEn: c.nameEn, nameAm: c.nameAm, position: c.position, fromMin: c.fromMin, toMin: c.toMin, showOnScreen: c.showOnScreen,
          items: {
            create: c.items.map((i) => ({
              cafeId: b.id, nameEn: i.nameEn, nameAm: i.nameAm, descEn: i.descEn, descAm: i.descAm, price: i.price, fasting: i.fasting, tags: i.tags,
              variants: i.variants ?? [], addons: i.addons ?? [], hidden: i.hidden, libraryPhoto: i.libraryPhoto, position: i.position,
            })),
          },
        },
      });
    }
    return b;
  });
  (await cookies()).set(CAFE_COOKIE, branch.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return branch.id;
}

// ---------- shop & plans ----------

const payMethod = z.enum(["telebirr", "cbe", "delivery", "chapa"]);

export async function orderStands(input: { kind: string; qty: number; ledColor: string; address: string; phone: string; payMethod: string; payRef: string }) {
  const { cafe, user } = await requireCafe("owner");
  const d = z
    .object({ kind: z.enum(Object.keys(STANDS) as [StandId, ...StandId[]]), qty: z.number().int().min(1).max(100), ledColor: text(20), address: text(200).min(4), phone: text(30).min(9), payMethod, payRef: text(60) })
    .parse(input);
  const { total } = standTotal(d.kind, d.qty);
  const order = await prisma.shopOrder.create({ data: { ...d, cafeId: cafe.id, total } });
  await logChange(cafe.id, user.name, "shop", `Ordered ${d.qty} × ${STANDS[d.kind].en}`);
  const { alertAdmin } = await import("@/lib/telegram");
  await alertAdmin(`New stand order from ${cafe.nameEn}: ${d.qty} × ${d.kind}, ${total} birr, ${d.payMethod} ${d.payRef}`);
  return order.id;
}

export async function requestPlan(input: { plan: string; months: number; payMethod: string; payRef: string }) {
  const { cafe } = await requireCafe("owner");
  const d = z.object({ plan: z.enum(["cafe", "group"]), months: z.number().int().min(1).max(12), payMethod: payMethod.exclude(["delivery"]), payRef: text(60) }).parse(input);
  if (d.payMethod !== "chapa" && d.payRef.length < 3) throw new Error("Missing transaction number");
  const amount = PLANS[d.plan].price * d.months;
  const row = await prisma.planPayment.create({ data: { ...d, amount, cafeId: cafe.id } });
  const { alertAdmin } = await import("@/lib/telegram");
  if (d.payMethod !== "chapa") await alertAdmin(`Plan payment to check: ${cafe.nameEn} → ${d.plan} × ${d.months} months, ${amount} birr via ${d.payMethod}, ref ${d.payRef}`);
  return row.id;
}

// ---------- account ----------

export async function telegramLinkUrl(): Promise<string | null> {
  const { user } = await requireCafe("staff");
  if (!telegramEnabled() || !botUsername()) return null;
  const code = crypto.randomBytes(9).toString("base64url");
  await prisma.telegramLink.create({ data: { code, ownerId: user.id, expiresAt: new Date(Date.now() + 15 * 60_000) } });
  return `https://t.me/${botUsername()}?start=${code}`;
}

export async function unlinkTelegram() {
  const { user } = await requireCafe("staff");
  await prisma.owner.update({ where: { id: user.id }, data: { telegramChatId: null } });
}

export async function changePassword(current: string, next: string): Promise<"ok" | "wrong" | "short"> {
  const { user } = await requireCafe("staff");
  if (next.length < 8) return "short";
  if (!(await verifyPassword(current, user.passwordHash))) return "wrong";
  await prisma.owner.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return "ok";
}

export async function testNotify() {
  const { cafe } = await requireCafe("staff");
  await notifyCafe(cafe.id, "Test message from Gebeta ✅ · ከገበታ የሙከራ መልእክት");
}
