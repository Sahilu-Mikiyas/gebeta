import { handleBotMessage } from "@/lib/bot";

// Telegram webhook. Telegram sends the secret we registered in a header.
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) return new Response("forbidden", { status: 403 });
  const update = await req.json().catch(() => null);
  const msg = update?.message ?? update?.edited_message;
  if (msg?.chat?.id) {
    try {
      await handleBotMessage(msg);
    } catch (e) {
      console.error("bot", e);
    }
  }
  return Response.json({ ok: true });
}
