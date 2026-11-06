import { prisma } from "./db";
import { esc, tgSend } from "./telegram";
import { nextMorningReset, isSoldOut } from "./menu";
import { logChange } from "./history";
import { createResetCode } from "./reset";

type Msg = { chat: { id: number }; text?: string; from?: { first_name?: string } };

const HELP = `<b>Gebeta bot</b> · ገበታ
/menu — your menu and prices
/price macchiato 100 — change a price
/soldout chechebsa — mark sold out until 6 AM
/available chechebsa — back on the menu
/stats — scans and orders today
/cafe — switch cafe if you have more than one
/reset — get a password reset code`;

// Handles one incoming Telegram message.
export async function handleBotMessage(msg: Msg) {
  const chatId = String(msg.chat.id);
  const text = (msg.text ?? "").trim();
  const [cmdRaw, ...rest] = text.split(/\s+/);
  const cmd = cmdRaw.toLowerCase().replace(/@.*$/, "");
  const arg = rest.join(" ");

  if (cmd === "/start") {
    if (!arg) return tgSend(chatId, `${HELP}\n\nTo connect your account, open Gebeta → Account → Connect Telegram.`);
    const link = await prisma.telegramLink.findUnique({ where: { code: arg } });
    if (!link || link.expiresAt < new Date()) return tgSend(chatId, "That link has expired. Open Gebeta → Account → Connect Telegram again.");
    await prisma.$transaction([
      prisma.owner.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } }),
      prisma.owner.update({ where: { id: link.ownerId }, data: { telegramChatId: chatId } }),
      prisma.telegramLink.delete({ where: { code: arg } }),
    ]);
    return tgSend(chatId, `Connected ✅ ተገናኝቷል\n\n${HELP}`);
  }

  const user = await prisma.owner.findUnique({ where: { telegramChatId: chatId } });
  if (!user) return tgSend(chatId, "This chat isn't connected yet. Open Gebeta → Account → Connect Telegram.");

  if (cmd === "/reset") {
    const code = await createResetCode(user.id);
    return tgSend(chatId, `Your password reset code: <b>${code}</b>\nIt works for 15 minutes. Enter it on the “Forgot password” page.`);
  }

  // The cafe this chat works on: the one picked with /cafe, else the first.
  const cafes = await prisma.cafe.findMany({
    where: { OR: [{ ownerId: user.id }, { members: { some: { userId: user.id, role: { in: ["manager", "staff"] } } } }] },
    orderBy: { createdAt: "asc" },
  });
  if (!cafes.length) return tgSend(chatId, "You don't have a cafe yet. Create one on the website first.");
  const pref = await prisma.telegramLink.findUnique({ where: { code: `cafe:${chatId}` } });
  const cafe = cafes.find((c) => c.id === pref?.ownerId) ?? cafes[0];
  const role = cafe.ownerId === user.id ? "owner" : (await prisma.cafeMember.findUnique({ where: { cafeId_userId: { cafeId: cafe.id, userId: user.id } } }))?.role ?? "staff";

  if (cmd === "/cafe") {
    const n = parseInt(arg, 10);
    if (n >= 1 && n <= cafes.length) {
      await prisma.telegramLink.upsert({
        where: { code: `cafe:${chatId}` },
        create: { code: `cafe:${chatId}`, ownerId: cafes[n - 1].id, expiresAt: new Date("2100-01-01") },
        update: { ownerId: cafes[n - 1].id },
      });
      return tgSend(chatId, `Now working on <b>${esc(cafes[n - 1].nameEn)}</b>.`);
    }
    return tgSend(chatId, cafes.map((c, i) => `${i + 1}. ${esc(c.nameEn)}${c.id === cafe.id ? " ← current" : ""}`).join("\n") + "\n\nSend /cafe 2 to switch.");
  }

  const items = await prisma.item.findMany({ where: { cafeId: cafe.id }, include: { category: true }, orderBy: [{ category: { position: "asc" } }, { position: "asc" }] });
  const find = (q: string) => {
    const s = q.toLowerCase().trim();
    return items.find((i) => i.nameEn.toLowerCase() === s || i.nameAm === q.trim()) ?? items.find((i) => i.nameEn.toLowerCase().includes(s) || (i.nameAm && i.nameAm.includes(q.trim())));
  };

  if (cmd === "/menu") {
    if (!items.length) return tgSend(chatId, "Your menu is empty.");
    let out = `<b>${esc(cafe.nameEn)}</b>`;
    let last = "";
    for (const i of items) {
      if (i.category.nameEn !== last) out += `\n\n<b>${esc(i.category.nameEn)}</b>`;
      last = i.category.nameEn;
      out += `\n${isSoldOut(i.soldOutUntil) ? "❌ " : ""}${esc(i.nameEn)} — ${i.price} ብር`;
    }
    return tgSend(chatId, out.slice(0, 4000));
  }

  if (cmd === "/price") {
    if (role === "staff") return tgSend(chatId, "Only owners and managers can change prices.");
    const m = arg.match(/^(.*\S)\s+(\d{1,7})$/);
    if (!m) return tgSend(chatId, "Send it like this: /price macchiato 100");
    const item = find(m[1]);
    if (!item) return tgSend(chatId, `I couldn't find “${esc(m[1])}”. Send /menu to see the names.`);
    const price = parseInt(m[2], 10);
    await prisma.item.update({ where: { id: item.id }, data: { price } });
    await logChange(cafe.id, `${user.name} (Telegram)`, "price", `${item.nameEn}: ${item.price} → ${price} birr`, { kind: "items", rows: [{ id: item.id, data: { price: item.price } }] });
    return tgSend(chatId, `Done ✅ <b>${esc(item.nameEn)}</b> is now <b>${price} ብር</b> on every table and screen.`);
  }

  if (cmd === "/soldout" || cmd === "/available") {
    const item = find(arg);
    if (!arg || !item) return tgSend(chatId, `Send it like this: ${cmd} chechebsa`);
    const out = cmd === "/soldout";
    await prisma.item.update({ where: { id: item.id }, data: { soldOutUntil: out ? nextMorningReset() : null } });
    await logChange(cafe.id, `${user.name} (Telegram)`, "soldout", `${item.nameEn}: ${out ? "sold out" : "available"}`, { kind: "items", rows: [{ id: item.id, data: { soldOutUntil: item.soldOutUntil } }] });
    return tgSend(chatId, out ? `<b>${esc(item.nameEn)}</b> is sold out until 6:00 AM. ❌` : `<b>${esc(item.nameEn)}</b> is back on the menu. ✅`);
  }

  if (cmd === "/stats") {
    const since = new Date(Date.now() - 86_400_000);
    const [scans, orders, calls] = await Promise.all([
      prisma.scan.count({ where: { cafeId: cafe.id, at: { gte: since } } }),
      prisma.order.findMany({ where: { cafeId: cafe.id, createdAt: { gte: since }, status: { not: "cancelled" } }, select: { total: true } }),
      prisma.serviceCall.count({ where: { cafeId: cafe.id, createdAt: { gte: since } } }),
    ]);
    const sales = orders.reduce((s, o) => s + o.total, 0);
    return tgSend(chatId, `<b>${esc(cafe.nameEn)}</b> · last 24 hours\n📱 ${scans} menu scans\n🧾 ${orders.length} orders · ${sales.toLocaleString("en-US")} ብር\n🙋 ${calls} waiter calls`);
  }

  return tgSend(chatId, HELP);
}
