import { menuUrl, qrSvg } from "@/lib/qr";
import { PrintBar } from "../Bar";
import { Card } from "../Card";
import { printContext } from "../data";

export const metadata = { title: "Table cards · Gebeta" };

export default async function CardsPage() {
  const { cafe, appUrl, tr } = await printContext();
  const svg = await qrSvg(menuUrl(appUrl, cafe.slug));
  const short = `${appUrl.replace(/^https?:\/\//, "")}/m/${cafe.slug}`;
  return (
    <>
      <PrintBar back={tr("Back", "ተመለስ")} hint={tr("4 cards per A4 page. Cut along the dashed lines.", "በአንድ A4 ገጽ 4 ካርዶች። በነጠብጣብ መስመሮቹ ይቁረጡ።")} label={tr("Print", "አትም")} />
      <div className="sheet">
        {Array.from({ length: 4 }, (_, i) => <Card key={i} name={cafe.nameEn} nameAm={cafe.nameAm} svg={svg} url={short} logo={cafe.logoId} color={cafe.brandColor} />)}
      </div>
    </>
  );
}
