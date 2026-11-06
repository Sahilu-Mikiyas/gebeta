import { menuUrl, qrSvg } from "@/lib/qr";
import { PrintBar } from "../Bar";
import { Card } from "../Card";
import { printContext } from "../data";

export const metadata = { title: "Table QR cards · Gebeta" };

export default async function TablesPage() {
  const { cafe, appUrl, tr } = await printContext();
  const n = Math.max(cafe.tableCount, 0);
  const short = `${appUrl.replace(/^https?:\/\//, "")}/m/${cafe.slug}`;
  const svgs = await Promise.all(Array.from({ length: n }, (_, i) => qrSvg(menuUrl(appUrl, cafe.slug, i + 1))));
  const pages = Array.from({ length: Math.ceil(n / 4) }, (_, p) => svgs.slice(p * 4, p * 4 + 4));
  return (
    <>
      <PrintBar back={tr("Back", "ተመለስ")} hint={n ? tr(`${n} tables, 4 cards per A4 page. Each QR tells us the table number.`, `${n} ጠረጴዛዎች፣ በአንድ A4 4 ካርዶች። እያንዳንዱ QR የጠረጴዛውን ቁጥር ይነግረናል።`) : tr("Set your number of tables in Cafe info first.", "መጀመሪያ በካፌ መረጃ የጠረጴዛዎችን ቁጥር ያስገቡ።")} label={tr("Print", "አትም")} />
      {pages.map((page, p) => (
        <div className="sheet" key={p}>
          {page.map((svg, i) => <Card key={i} name={cafe.nameEn} nameAm={cafe.nameAm} svg={svg} url={short} table={p * 4 + i + 1} logo={cafe.logoId} color={cafe.brandColor} />)}
        </div>
      ))}
    </>
  );
}
