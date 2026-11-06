// Minimal Telegram Bot API client. Everything is a no-op until TELEGRAM_BOT_TOKEN is set.
const API = "https://api.telegram.org";

export const telegramEnabled = () => !!process.env.TELEGRAM_BOT_TOKEN;
export const botUsername = () => process.env.TELEGRAM_BOT_USERNAME ?? "";

export async function tgCall(method: string, body: Record<string, unknown>): Promise<unknown> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${API}/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    console.error("telegram", method, e);
    return null;
  }
}

export function tgSend(chatId: string | number, text: string) {
  return tgCall("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true });
}

export const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

// Platform error alerts go to the admin chat.
export function alertAdmin(text: string) {
  const chat = process.env.ADMIN_TELEGRAM_CHAT_ID;
  if (chat) return tgSend(chat, `⚠️ ${esc(text).slice(0, 3500)}`);
}
