import { prisma } from "@/lib/db";
import { requireCafe } from "@/lib/access";
import { PLANS, effectivePlan } from "@/lib/plans";
import { appUrlFromHeaders } from "@/lib/url";
import { displayPhone } from "@/lib/phone";
import { Team } from "./Team";

export const metadata = { title: "Team · Gebeta" };

export default async function TeamPage() {
  const { cafe, user } = await requireCafe("owner");
  const members = await prisma.cafeMember.findMany({ where: { cafeId: cafe.id }, include: { user: { select: { name: true, phone: true, telegramChatId: true } } }, orderBy: { createdAt: "asc" } });
  return (
    <Team
      owner={{ name: user.name, phone: displayPhone(user.phone) }}
      members={members.map((m) => ({ id: m.id, name: m.user.name, phone: displayPhone(m.user.phone), role: m.role as "manager" | "staff", telegram: !!m.user.telegramChatId }))}
      limit={PLANS[effectivePlan(cafe.plan, cafe.planUntil)].staff}
      appUrl={await appUrlFromHeaders()}
    />
  );
}
