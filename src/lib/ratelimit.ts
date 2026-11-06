import { prisma } from "./db";

// Counts attempts per key in Postgres so the limit holds across restarts and servers.
export async function tooManyAttempts(key: string, limit = 8, windowMs = 15 * 60_000): Promise<boolean> {
  const now = new Date();
  const row = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!row || row.resetAt < now) {
    await prisma.loginAttempt.upsert({
      where: { key },
      create: { key, count: 1, resetAt: new Date(now.getTime() + windowMs) },
      update: { count: 1, resetAt: new Date(now.getTime() + windowMs) },
    });
    return false;
  }
  const updated = await prisma.loginAttempt.update({ where: { key }, data: { count: { increment: 1 } } });
  return updated.count > limit;
}

export async function clearAttempts(key: string) {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}
