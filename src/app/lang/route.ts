import { NextResponse, type NextRequest } from "next/server";
import { UI_LANG_COOKIE } from "@/lib/lang-server";

// GET /lang?to=am&back=/dashboard — switches the owner UI language.
export function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to") === "am" ? "am" : "en";
  const backParam = req.nextUrl.searchParams.get("back") ?? "/";
  const back = backParam.startsWith("/") && !backParam.startsWith("//") ? backParam : "/";
  const res = NextResponse.redirect(new URL(back, req.url), 303);
  res.cookies.set(UI_LANG_COOKIE, to, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
