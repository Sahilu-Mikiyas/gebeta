"use client";

import { CountUp, PageHead, useTr } from "@/components/ui";

type Props = {
  days: { key: string; label: string; count: number }[];
  hours: number[];
  thisWeek: number;
  lastWeek: number;
  amPct: number;
  tables: [string, number][];
  viewed: { name: string; count: number }[];
  sold: [string, number][];
  sales: number;
  feedback: { id: string; rating: number; comment: string; table: string; at: string }[];
  prices: { name: string; mine: number; avg: number; cafes: number }[];
  area: string;
};

function Bars({ values, labels, highlightMax = true }: { values: number[]; labels: string[]; highlightMax?: boolean }) {
  const max = Math.max(...values, 1);
  return (
    <div className="chart">
      <div className="bars" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
        {values.map((v, i) => (
          <div key={i} className={`bar${highlightMax && v === max && v > 0 ? " top" : ""}`} style={{ ["--i" as string]: i }}>
            {values.length <= 12 ? <span>{v}</span> : null}
            <i style={{ height: `${(v / max) * 86}%` }} title={`${labels[i]}: ${v}`} />
          </div>
        ))}
      </div>
      <div className="days" style={{ gridTemplateColumns: `repeat(${values.length}, 1fr)` }}>
        {labels.map((l, i) => <span key={i}>{l}</span>)}
      </div>
    </div>
  );
}

function Rank({ rows, unit }: { rows: [string, number][]; unit: string }) {
  const max = Math.max(...rows.map((r) => r[1]), 1);
  return (
    <ul className="rank">
      {rows.map(([name, n], i) => (
        <li key={name} style={{ ["--i" as string]: i }}>
          <span className="rk">{i + 1}</span>
          <span className="nm">{name}</span>
          <span className="meter"><i style={{ width: `${(n / max) * 100}%` }} /></span>
          <b>{n} {unit}</b>
        </li>
      ))}
    </ul>
  );
}

export function Insights(p: Props) {
  const { tr, lang } = useTr();
  const diff = p.lastWeek ? Math.round(((p.thisWeek - p.lastWeek) / p.lastWeek) * 100) : null;
  const avg = p.feedback.length ? p.feedback.reduce((s, f) => s + f.rating, 0) / p.feedback.length : 0;
  const peak = p.hours.indexOf(Math.max(...p.hours));
  return (
    <div className="stagger">
      <PageHead title={tr("Insights", "ትንታኔ")} sub={tr("What your customers look at, when they come and what they think.", "ደንበኞችዎ ምን እንደሚመለከቱ፣ መቼ እንደሚመጡና ምን እንደሚያስቡ።")} />
      <section className="kpis">
        <div className="kpi"><small>{tr("Scans this week", "የዚህ ሳምንት ስካኖች")}</small><b><CountUp value={p.thisWeek} /></b><em className={diff != null && diff < 0 ? "down" : "up"}>{diff == null ? tr("First week", "የመጀመሪያ ሳምንት") : `${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff)}% ${tr("vs last week", "ካለፈው ሳምንት")}`}</em></div>
        <div className="kpi"><small>{tr("Busiest hour", "የሚጨናነቅበት ሰዓት")}</small><b>{p.hours[peak] ? `${String(peak).padStart(2, "0")}:00` : "—"}</b><em>{tr("Addis time", "የአዲስ አበባ ሰዓት")}</em></div>
        <div className="kpi"><small>{tr("Read in Amharic", "በአማርኛ ያነበቡ")}</small><b><CountUp value={p.amPct} />%</b><em>{tr("This week", "በዚህ ሳምንት")}</em></div>
        <div className="kpi"><small>{tr("Table orders, 30 days", "የጠረጴዛ ትዕዛዞች፣ 30 ቀናት")}</small><b><CountUp value={p.sales} /></b><em>{tr("birr", "ብር")}</em></div>
      </section>
      <div className="two-col">
        <section className="box"><h2>{tr("Scans per day", "በቀን ስካኖች")}</h2><Bars values={p.days.map((d) => d.count)} labels={p.days.map((d) => d.label)} /></section>
        <section className="box"><h2>{tr("By hour, last 14 days", "በሰዓት፣ ያለፉት 14 ቀናት")}</h2><Bars values={p.hours} labels={p.hours.map((_, h) => (h % 3 === 0 ? String(h) : ""))} /></section>
      </div>
      <div className="two-col">
        <section className="box">
          <h2>{tr("Most viewed dishes", "በብዛት የታዩ ምግቦች")}</h2>
          <p className="sub">{tr("Times customers opened a dish on their phone, last 30 days. The top three get a “Popular” badge.", "ደንበኞች ምግብን በስልካቸው የከፈቱበት ብዛት፣ ያለፉት 30 ቀናት። ሦስቱ የመጀመሪያዎቹ «ተወዳጅ» ምልክት ያገኛሉ።")}</p>
          {p.viewed.length ? <Rank rows={p.viewed.map((v) => [v.name, v.count])} unit={tr("views", "እይታ")} /> : <p className="empty">{tr("No views yet.", "ገና እይታ የለም።")}</p>}
        </section>
        <section className="box">
          <h2>{tr("Best sellers (table orders)", "በብዛት የተሸጡ (የጠረጴዛ ትዕዛዝ)")}</h2>
          {p.sold.length ? <Rank rows={p.sold} unit={tr("sold", "ተሸጧል")} /> : <p className="empty">{tr("No table orders yet.", "ገና የጠረጴዛ ትዕዛዝ የለም።")}</p>}
        </section>
      </div>
      <div className="two-col">
        <section className="box">
          <h2>{tr("Scans by table, this week", "በጠረጴዛ ስካኖች፣ በዚህ ሳምንት")}</h2>
          {p.tables.length ? <Rank rows={p.tables.map(([t, n]) => [tr(`Table ${t}`, `ጠረጴዛ ${t}`), n])} unit="" /> : <p className="empty">{tr("Print one QR per table to see which tables scan most.", "የትኛው ጠረጴዛ በብዛት እንደሚቃኝ ለማየት ለእያንዳንዱ ጠረጴዛ QR ያትሙ።")}</p>}
        </section>
        <section className="box">
          <h2>{tr("Your prices vs the area", "ዋጋዎ ከአካባቢው ጋር")}</h2>
          {p.prices.length ? (
            <ul className="rank">
              {p.prices.map((r) => {
                const d = Math.round(((r.mine - r.avg) / r.avg) * 100);
                return <li key={r.name}><span className="nm">{r.name}</span><b>{r.mine}</b><span className={`delta ${d > 0 ? "up" : d < 0 ? "down" : ""}`}>{d === 0 ? tr("same as average", "ከአማካዩ ጋር እኩል") : `${d > 0 ? "+" : ""}${d}% ${tr(`vs ${r.avg} avg`, `ከአማካይ ${r.avg}`)}`}</span></li>;
              })}
            </ul>
          ) : <p className="empty">{p.area ? tr(`We compare once at least 3 other Gebeta cafes in ${p.area} sell the same item.`, `በ${p.area} ቢያንስ 3 ሌሎች የገበታ ካፌዎች ተመሳሳይ ምግብ ሲሸጡ እናነጻጽራለን።`) : tr("Add your area in Cafe info to compare prices with nearby cafes.", "በአቅራቢያ ካሉ ካፌዎች ጋር ዋጋ ለማነጻጸር በካፌ መረጃ አካባቢዎን ያስገቡ።")}</p>}
        </section>
      </div>
      <section className="box">
        <div className="box-h"><h2>{tr("Reviews", "አስተያየቶች")}</h2>{p.feedback.length ? <span className="pill-count">★ {avg.toFixed(1)} · {p.feedback.length}</span> : null}</div>
        {p.feedback.length ? (
          <ul className="reviews">
            {p.feedback.map((f) => (
              <li key={f.id}>
                <span className="stars-sm">{"★".repeat(f.rating)}<i>{"★".repeat(5 - f.rating)}</i></span>
                <span>{f.comment || <em className="muted">{tr("No comment", "አስተያየት የለም")}</em>}</span>
                <small>{f.table ? tr(`Table ${f.table} · `, `ጠረጴዛ ${f.table} · `) : ""}{new Date(f.at).toLocaleDateString(lang === "am" ? "am-ET" : "en-GB", { day: "numeric", month: "short" })}</small>
              </li>
            ))}
          </ul>
        ) : <p className="empty">{tr("Customers can rate their visit from the bottom of your menu. Reviews are private to you.", "ደንበኞች ከምናሌዎ ግርጌ ጉብኝታቸውን መገምገም ይችላሉ። አስተያየቶቹ ለእርስዎ ብቻ ናቸው።")}</p>}
      </section>
    </div>
  );
}
