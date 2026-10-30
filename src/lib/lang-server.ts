import { cookies } from "next/headers";
import type { Lang } from "./i18n";

export const UI_LANG_COOKIE = "gebeta_lang";

export async function getUiLang(): Promise<Lang> {
  return (await cookies()).get(UI_LANG_COOKIE)?.value === "am" ? "am" : "en";
}
