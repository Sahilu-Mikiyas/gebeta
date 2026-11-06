import { prisma } from "./db";
import { esc, tgSend, telegramEnabled } from "./telegram";

// Tell everyone on a cafe's team who linked Telegram.
export async function notifyCafe(cafeId: string, text: string) {
  if (!telegramEnabled()) return;
  const cafe = await prisma.cafe.findUnique({
    where: { id: cafeId },
    select: { nameEn: true, owner: { select: { telegramChatId: true } }, members: { select: { user: { select: { telegramChatId: true } } } } },
  });
  if (!cafe) return;
  const chats = new Set([cafe.owner.telegramChatId, ...cafe.members.map((m) => m.user.telegramChatId)].filter(Boolean) as string[]);
  await Promise.all([...chats].map((c) => tgSend(c, `<b>${esc(cafe.nameEn)}</b>\n${text}`)));
}
