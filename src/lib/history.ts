import { Prisma } from "@prisma/client";
import { prisma } from "./db";

// What to write back to undo a change.
export type Undo =
  | { kind: "items"; rows: { id: string; data: Record<string, unknown> }[] }
  | { kind: "restoreItem"; item: Record<string, unknown> }
  | { kind: "category"; id: string; data: Record<string, unknown> }
  | { kind: "cafe"; data: Record<string, unknown> };

export async function logChange(cafeId: string, userName: string, action: string, summary: string, undo?: Undo) {
  await prisma.changeLog.create({
    data: { cafeId, userName, action, summary, undo: undo ? (undo as unknown as Prisma.InputJsonValue) : Prisma.JsonNull },
  });
}

export async function undoChange(cafeId: string, id: string): Promise<boolean> {
  const entry = await prisma.changeLog.findFirst({ where: { id, cafeId, undoneAt: null } });
  if (!entry || !entry.undo) return false;
  const u = entry.undo as unknown as Undo;
  await prisma.$transaction(async (tx) => {
    if (u.kind === "items") {
      for (const r of u.rows) await tx.item.updateMany({ where: { id: r.id, cafeId }, data: reviveDates(r.data) });
    } else if (u.kind === "restoreItem") {
      const data = reviveDates(u.item) as Prisma.ItemUncheckedCreateInput;
      const categoryOk = await tx.category.findFirst({ where: { id: data.categoryId, cafeId } });
      if (categoryOk) await tx.item.create({ data: { ...data, cafeId, imageId: null } });
    } else if (u.kind === "category") {
      await tx.category.updateMany({ where: { id: u.id, cafeId }, data: u.data });
    } else if (u.kind === "cafe") {
      await tx.cafe.update({ where: { id: cafeId }, data: u.data });
    }
    await tx.changeLog.update({ where: { id }, data: { undoneAt: new Date() } });
  });
  return true;
}

function reviveDates(data: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...data };
  if (typeof out.soldOutUntil === "string") out.soldOutUntil = new Date(out.soldOutUntil);
  return out;
}
