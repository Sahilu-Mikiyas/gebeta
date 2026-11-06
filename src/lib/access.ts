import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { requireOwner } from "./auth";

export type Role = "owner" | "manager" | "staff";
const RANK: Record<Role, number> = { staff: 1, manager: 2, owner: 3 };
export const CAFE_COOKIE = "gebeta_cafe";

export function isAdminPhone(phone: string): boolean {
  return (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(phone);
}

// Every cafe this user can open, with their role in it.
export async function myCafes(userId: string) {
  const [owned, member] = await Promise.all([
    prisma.cafe.findMany({ where: { ownerId: userId }, orderBy: { createdAt: "asc" }, select: { id: true, slug: true, nameEn: true, nameAm: true } }),
    prisma.cafeMember.findMany({ where: { userId }, include: { cafe: { select: { id: true, slug: true, nameEn: true, nameAm: true } } } }),
  ]);
  return [
    ...owned.map((c) => ({ ...c, role: "owner" as Role })),
    ...member.filter((m) => !owned.some((o) => o.id === m.cafeId)).map((m) => ({ ...m.cafe, role: m.role as Role })),
  ];
}

// The signed-in user, the cafe they are working on (remembered in a cookie) and their role there.
// Redirects to onboarding when they have no cafe yet.
export async function requireCafe(min: Role = "staff") {
  const user = await requireOwner();
  const cafes = await myCafes(user.id);
  if (cafes.length === 0) redirect("/welcome");
  const wanted = (await cookies()).get(CAFE_COOKIE)?.value;
  const pick = cafes.find((c) => c.id === wanted) ?? cafes[0];
  // Staff who open a manager page are sent back to Today rather than shown an error.
  if (RANK[pick.role] < RANK[min]) redirect("/dashboard");
  const cafe = await prisma.cafe.findUniqueOrThrow({ where: { id: pick.id } });
  return { user, cafe, role: pick.role, cafes };
}

export function can(role: Role, min: Role) {
  return RANK[role] >= RANK[min];
}
