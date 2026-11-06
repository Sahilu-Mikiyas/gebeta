import type { CSSProperties } from "react";
import { menuUrl, qrSvg } from "@/lib/qr";
import { PrintBar } from "../Bar";
import { printContext } from "../data";

export const metadata = { title: "Window poster · Gebeta" };

export default async function Poster() {
  const { cafe, appUrl, tr } = await printContext();
  const svg = await qrSvg(menuUrl(appUrl, cafe.slug));
  const style = (cafe.brandColor ? { ["--pill" as string]: cafe.brandColor } : {}) as CSSProperties;
  return (
    <>
      <PrintBar back={tr("Back", "ተመለስ")} hint={tr("Page 1: A4 window poster. Page 2: four small Wi-Fi cards.", "ገጽ 1፦ A4 የመስኮት ፖስተር። ገጽ 2፦ አራት ትናንሽ የዋይፋይ ካርዶች።")} label={tr("Print", "አትም")} />
      <div className="poster" data-t={cafe.template} style={style}>
        <div className="poster-tab">
          {cafe.logoId ? <img src={`/media/${cafe.logoId}`} alt="" /> : null}
          <b>{cafe.nameEn}</b>
          {cafe.nameAm ? <span>{cafe.nameAm}</span> : null}
        </div>
        <h1>Scan for<br />our menu</h1>
        <h2>ምናሌያችንን ይቃኙ</h2>
        <div className="poster-qr" dangerouslySetInnerHTML={{ __html: svg }} />
        <p>Open your phone camera and point it at the code · የስልክዎን ካሜራ ከፍተው ወደ ኮዱ ያዙሩት</p>
        {cafe.wifiName ? <div className="poster-wifi"><b>Free Wi-Fi</b> {cafe.wifiName}{cafe.wifiPass ? <> · <code>{cafe.wifiPass}</code></> : null}</div> : null}
      </div>
      <div className="sheet wifi-sheet">
        {Array.from({ length: 4 }, (_, i) => (
          <div className="card wifi-card" key={i}>
            <b className="wf-title">Wi-Fi · ዋይፋይ</b>
            <span className="wf-k">Network · ኔትወርክ</span>
            <b className="wf-v">{cafe.wifiName || "—"}</b>
            <span className="wf-k">Password · የይለፍ ቃል</span>
            <b className="wf-v mono">{cafe.wifiPass || "—"}</b>
            <div className="card-qr small" dangerouslySetInnerHTML={{ __html: svg }} />
            <span className="wf-k">Menu · ምናሌ</span>
            <span className="card-foot">{cafe.nameEn}</span>
          </div>
        ))}
      </div>
    </>
  );
}
