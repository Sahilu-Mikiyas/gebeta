import crypto from "node:crypto";
import { prisma } from "./db";

const hash = (code: string) => crypto.createHash("sha256").update(code).digest("hex");

export async function createResetCode(ownerId: string): Promise<string> {
  const code = String(crypto.randomInt(100000, 1000000));
  await prisma.resetCode.create({ data: { ownerId, codeHash: hash(code), expiresAt: new Date(Date.now() + 15 * 60_000) } });
  return code;
}

// True and marks the code used when it matches an unexpired, unused code for this owner.
export async function consumeResetCode(ownerId: string, code: string): Promise<boolean> {
  const row = await prisma.resetCode.findFirst({
    where: { ownerId, codeHash: hash(code.trim()), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!row) return false;
  await prisma.resetCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return true;
}
