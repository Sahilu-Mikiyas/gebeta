"use server";

import { prisma } from "@/lib/db";
import { requireCafe } from "@/lib/access";

export async function recentChanges() {
  const { cafe } = await requireCafe("manager");
  return prisma.changeLog.findMany({ where: { cafeId: cafe.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, userName: true, action: true, summary: true, createdAt: true, undoneAt: true, undo: true } });
}
