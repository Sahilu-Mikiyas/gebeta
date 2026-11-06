import Link from "next/link";
import { requireCafe } from "@/lib/access";
import { getUiLang } from "@/lib/lang-server";
import { appUrlFromHeaders } from "@/lib/url";
import { Icon } from "@/components/Icon";

export const metadata = { title: "QR & print · Gebeta" };

export default async function PrintHub() {
  const { cafe } = await requireCafe("manager");
  const lang = await getUiLang();
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const url = `${await appUrlFromHeaders()}/m/${cafe.slug}`;
  const cards = [
    { href: "/print/cards", icon: "qr", en: "Table cards", am: "የጠረጴዛ ካርዶች", sub: ["4 per A4 page, same QR on each. Good for stands.", "በአንድ A4 4 ካርዶች፣ ተመሳሳይ QR። ለመቆሚያዎች ጥሩ ነው።"] },
    { href: "/print/tables", icon: "orders", en: "One card per table", am: "ለእያንዳንዱ ጠረጴዛ ካርድ", sub: cafe.tableCount ? [`Cards for tables 1–${cafe.tableCount}. Calls and orders arrive with the table number.`, `ለጠረጴዛ 1–${cafe.tableCount} ካርዶች። ጥሪና ትዕዛዝ ከጠረጴዛ ቁጥር ጋር ይመጣሉ።`] : ["Set your number of tables in Cafe info first.", "መጀመሪያ በካፌ መረጃ የጠረጴዛዎችን ቁጥር ያስገቡ።"] },
    { href: "/print/menu", icon: "menu", en: "Paper menu (A4)", am: "የወረቀት ምናሌ (A4)", sub: ["Your full menu on paper, in your style. For the window and regulars.", "ሙሉ ምናሌዎ በወረቀት፣ በዲዛይንዎ። ለመስኮትና ለቋሚ ደንበኞች።"] },
    { href: "/print/poster", icon: "wifi", en: "Window poster & Wi-Fi card", am: "የመስኮት ፖስተርና የዋይፋይ ካርድ", sub: ["A big “Scan for our menu” poster with your Wi-Fi details.", "ትልቅ «ምናሌውን ይቃኙ» ፖስተር ከዋይፋይ መረጃ ጋር።"] },
  ];
  return (
    <div className="stagger">
      <header className="page-head">
        <div>
          <h1>{tr("QR & print", "QR እና ህትመት")}</h1>
          <p>{tr("Your QR code always opens your latest menu, so you only print once.", "QR ኮድዎ ሁልጊዜ የቅርብ ጊዜውን ምናሌ ይከፍታል፤ አንድ ጊዜ ብቻ ያትማሉ።")}</p>
        </div>
      </header>
      <section className="box qr-wrap">
        <img src={`/m/${cafe.slug}/qr?format=svg`} alt={url} width={220} height={220} className="qr-img" />
        <div className="col">
          <span className="qr-link">{url}</span>
          <div className="row">
            <a className="btn mus sm" href={`/m/${cafe.slug}/qr?format=png&download=1`}>{tr("Download PNG", "PNG አውርድ")}</a>
            <a className="btn sm" href={`/m/${cafe.slug}/qr?format=svg&download=1`}>{tr("SVG for printers", "SVG ለማተሚያ ቤት")}</a>
          </div>
          <p className="hint">{tr("Taking it to a print shop? Give them the SVG file: it stays sharp at any size.", "ወደ ማተሚያ ቤት ይወስዳሉ? SVG ፋይሉን ይስጧቸው፤ በማንኛውም መጠን ጥርት ብሎ ይታያል።")}</p>
        </div>
      </section>
      <div className="print-grid">
        {cards.map((c, i) => (
          <Link key={c.href} href={c.href} target="_blank" className="print-card" style={{ ["--i" as string]: i }}>
            <span className="pc-ic"><Icon name={c.icon} size={28} /></span>
            <b>{tr(c.en, c.am)}</b>
            <span>{tr(c.sub[0], c.sub[1])}</span>
            <em>{tr("Open & print", "ክፈትና አትም")} ↗</em>
          </Link>
        ))}
      </div>
      <section className="box">
        <h3>{tr("Want ready-made stands?", "የተዘጋጁ መቆሚያዎች ይፈልጋሉ?")}</h3>
        <p className="sub">{tr("Acrylic, wanza wood and LED stands with your QR printed on, delivered in Addis.", "QR ኮድዎ የታተመባቸው የአክሪሊክ፣ የዋንዛ እንጨትና የLED መቆሚያዎች፣ በአዲስ አበባ የሚደርሱ።")}</p>
        <Link className="btn red" href="/dashboard/shop">{tr("Order stands", "መቆሚያ እዘዝ")} →</Link>
      </section>
    </div>
  );
}
