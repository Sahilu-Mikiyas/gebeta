import { headers } from "next/headers";

// Public address of the site: APP_URL when set, otherwise from the request.
export async function appUrlFromHeaders(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  return `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
}
