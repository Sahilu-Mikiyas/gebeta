// Sends server errors to the admin's Telegram chat (when configured).
export async function onRequestError(err: unknown, request: { path: string; method: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { alertAdmin } = await import("./lib/telegram");
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  await alertAdmin(`${request.method} ${request.path}\n${message}`);
}
