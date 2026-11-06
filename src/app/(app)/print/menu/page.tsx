import type { CSSProperties } from "react";
import { loadMenu } from "@/lib/menu-data";
import { menuUrl, qrSvg } from "@/lib/qr";
import { formatBirr } from "@/lib/menu";
import { PrintBar } from "../Bar";
import { printContext } from "../data";

export const metadata = { title: "Paper menu · Gebeta" };

// A4 paper menu in two columns, built from the live menu. "Print → Save as PDF" makes a PDF.
export default async function PaperMenu() {
  const { cafe, appUrl, tr } = await printContext();
  const menu = (await loadMenu({ id: cafe.id }, { publicView: true }))!;
  const svg = await qrSvg(menuUrl(appUrl, cafe.slug));
  const style = { ...(cafe.brandColor ? { ["--pill" as string]: cafe.brandColor } : {}), ...(cafe.accentColor ? { ["--acc" as string]: cafe.accentColor } : {}) } as CSSProperties;
  return (
    <>
      <PrintBar back={tr("Back", "ተመለስ")} hint={tr("Tip: choose “Save as PDF” in the print window to get a PDF file.", "ጠቃሚ ምክር፦ ፒዲኤፍ ለማግኘት በማተሚያ መስኮቱ «Save as PDF»ን ይምረጡ።")} label={tr("Print", "አትም")} />
      <div className="paper" data-t={cafe.template} style={style}>
        <header className="paper-h">
          {cafe.logoId ? <img src={`/media/${cafe.logoId}`} alt="" /> : null}
          <div>
            <h1>{cafe.nameEn}</h1>
            {cafe.nameAm ? <h2>{cafe.nameAm}</h2> : null}
            <p>{[cafe.hoursEn, cafe.area, cafe.phone].filter(Boolean).join(" · ")}</p>
          </div>
        </header>
        <div className="paper-cols">
          {menu.categories.filter((c) => c.items.length).map((c) => (
            <section key={c.id} className="paper-sec">
              <h3>{c.nameEn}{c.nameAm ? <span> · {c.nameAm}</span> : null}</h3>
              {c.items.map((i) => (
                <div key={i.id} className="paper-it">
                  <div className="leader">
                    <span><b>{i.nameEn}</b>{i.nameAm ? <em> {i.nameAm}</em> : null}{i.fasting ? <small className="ft"> ጾም</small> : null}</span>
                    <i className="dots" />
                    <span className="price">{i.variants.length > 1 ? i.variants.map((v) => formatBirr(v.price)).join(" / ") : formatBirr(i.price)}</span>
                  </div>
                  {i.descEn ? <p>{i.descEn}{i.descAm ? ` · ${i.descAm}` : ""}</p> : null}
                  {i.variants.length > 1 ? <p className="sizes">{i.variants.map((v) => v.nameEn).join(" / ")}</p> : null}
                </div>
              ))}
            </section>
          ))}
        </div>
        <footer className="paper-f">
          <div className="paper-qr" dangerouslySetInnerHTML={{ __html: svg }} />
          <div>
            <b>Scan for the live menu · ምናሌውን ይቃኙ</b>
            <span>Prices in birr, VAT included · ዋጋዎቹ በብር፣ ተ.እ.ታን ያካትታሉ</span>
            {cafe.wifiName ? <span>Wi-Fi: {cafe.wifiName}{cafe.wifiPass ? ` · ${cafe.wifiPass}` : ""}</span> : null}
          </div>
        </footer>
      </div>
    </>
  );
}
