import { requireCafe } from "@/lib/access";
import { getUiLang } from "@/lib/lang-server";
import { appUrlFromHeaders } from "@/lib/url";

export async function printContext() {
  const { cafe } = await requireCafe("manager");
  const lang = await getUiLang();
  return { cafe, lang, appUrl: await appUrlFromHeaders(), tr: (en: string, am: string) => (lang === "am" ? am : en) };
}
