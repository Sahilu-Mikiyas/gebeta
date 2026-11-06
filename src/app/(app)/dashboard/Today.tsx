"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CountUp, PageHead, Toggle, useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { AnimatePresence, Sparkline, bouncy, m } from "@/components/motion";
import { pick } from "@/lib/i18n";
import type { Role } from "@/lib/access";
import type { MenuDTO } from "@/lib/types";
import { setSoldOut } from "./actions";
import { LiveFeed } from "./orders/LiveFeed";

export function Today({
  menu,
  role,
  userName,
  stats,
  checklist,
  spark,
}: {
  spark: number[];
  menu: MenuDTO;
  role: Role;
  userName: string;
  stats: { scansToday: number; scansYesterday: number; orders: number; sales: number; rating: number | null; reviews: number };
  checklist: { done: boolean; en: string; am: string; href: string }[];
}) {
  const { tr, lang } = useTr();
  const { run, toast } = useToast();
  const [cats, setCats] = useState(menu.categories);
  const [q, setQ] = useState("");
  const hour = new Date().getHours();
  const greet = hour < 12 ? tr("Good morning", "እንደምን አደሩ") : hour < 18 ? tr("Good afternoon", "እንደምን ዋሉ") : tr("Good evening", "እንደምን አመሹ");
  const done = checklist.filter((c) => c.done).length;
  const specials = cats.flatMap((c) => c.items.filter((i) => i.special));
  const soldOutCount = cats.reduce((n, c) => n + c.items.filter((i) => i.soldOut).length, 0);
  const diff = stats.scansYesterday ? Math.round(((stats.scansToday - stats.scansYesterday) / stats.scansYesterday) * 100) : null;
  const filtered = useMemo(
    () => cats.map((c) => ({ ...c, items: c.items.filter((i) => !q || `${i.nameEn} ${i.nameAm}`.toLowerCase().includes(q.toLowerCase())) })).filter((c) => c.items.length),
    [cats, q],
  );

  const flip = async (id: string, on: boolean, name: string) => {
    setCats((cs) => cs.map((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, soldOut: on } : i)) })));
    const ok = await run(async () => (await setSoldOut(id, on), true));
    if (ok) toast(on ? tr(`${name} is sold out until 6:00 AM`, `${name} እስከ ጠዋት 12 ሰዓት አልቋል`) : tr(`${name} is back on the menu`, `${name} ተመልሷል`));
  };

  return (
    <div className="stagger">
      <PageHead kicker={new Date().toLocaleDateString(lang === "am" ? "am-ET" : "en-GB", { weekday: "long", day: "numeric", month: "long" })} title={`${greet}, ${userName.split(" ")[0]}`}>
        <Link className="btn red" href="/dashboard/menu">
          <Icon name="menu" /> {tr("Edit menu", "ምናሌ አስተካክል")}
        </Link>
      </PageHead>

      {menu.cafe.fastingNow ? (
        <div className="banner green">
          <Icon name="sparkle" />
          <span>
            <b>{tr(`Today: ${menu.cafe.fastingNow.en}`, `ዛሬ፦ ${menu.cafe.fastingNow.am}`)}</b>
            {" · "}
            {tr("Your menu highlights fasting dishes for customers today.", "ምናሌዎ ዛሬ የጾም ምግቦችን ለደንበኞች ያጎላል።")}
          </span>
        </div>
      ) : null}

      <section className="kpis">
        <m.div className="kpi" whileHover={{ y: -5, rotate: -0.6 }} transition={bouncy}>
          <small>{tr("Menu scans today", "የዛሬ ስካኖች")}</small>
          <b><CountUp value={stats.scansToday} /></b>
          <Sparkline values={spark} color="#d7261e" />
          {diff !== null ? <em className={diff >= 0 ? "up" : "down"}>{diff >= 0 ? "▲" : "▼"} {Math.abs(diff)}% {tr("vs yesterday", "ከትናንት")}</em> : <em>{tr("Last 24 hours", "ያለፉት 24 ሰዓታት")}</em>}
        </m.div>
        <m.div className="kpi" whileHover={{ y: -5, rotate: -0.6 }} transition={bouncy}>
          <small>{tr("Table orders", "የጠረጴዛ ትዕዛዞች")}</small>
          <b><CountUp value={stats.orders} /></b>
          <em>{stats.sales ? <><CountUp value={stats.sales} /> {tr("birr", "ብር")}</> : menu.cafe.orderingOn ? tr("None yet today", "ዛሬ ገና የለም") : tr("Ordering is off", "ትዕዛዝ ጠፍቷል")}</em>
        </m.div>
        <m.div className="kpi" whileHover={{ y: -5, rotate: -0.6 }} transition={bouncy}>
          <small>{tr("Sold out now", "አሁን ያለቁ")}</small>
          <b><CountUp value={soldOutCount} /></b>
          <em>{tr("Back at 6:00 AM", "ጠዋት 12 ሰዓት ይመለሳሉ")}</em>
        </m.div>
        <m.div className="kpi" whileHover={{ y: -5, rotate: -0.6 }} transition={bouncy}>
          <small>{tr("Rating, 30 days", "ደረጃ፣ 30 ቀናት")}</small>
          <b>{stats.rating ? stats.rating.toFixed(1) : "—"}</b>
          <em>{stats.reviews ? tr(`${stats.reviews} review${stats.reviews === 1 ? "" : "s"}`, `${stats.reviews} አስተያየቶች`) : tr("No reviews yet", "ገና አስተያየት የለም")}</em>
        </m.div>
      </section>

      {done < checklist.length && role !== "staff" ? (
        <section className="box">
          <div className="box-h">
            <h2>{tr("Finish setting up", "ማዘጋጀቱን ይጨርሱ")}</h2>
            <span className="pill-count">{done}/{checklist.length}</span>
          </div>
          <div className="progress"><m.i initial={{ width: 0 }} animate={{ width: `${(done / checklist.length) * 100}%` }} transition={{ ...bouncy, delay: 0.3 }} /></div>
          <ul className="checklist">
            {checklist.map((c) => (
              <li key={c.en} className={c.done ? "done" : ""}>
                <span className="tick"><Icon name="check" size={14} /></span>
                {c.done ? <span>{tr(c.en, c.am)}</span> : <Link href={c.href}>{tr(c.en, c.am)} →</Link>}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="two-col">
        <section className="box">
          <div className="box-h">
            <h2>{tr("Sold out?", "አልቋል?")}</h2>
            <input className="inp search" placeholder={tr("Find an item", "ምግብ ፈልግ")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <p className="sub">{tr("One tap hides it on every phone and screen until 6:00 AM.", "አንድ ንክኪ በሁሉም ስልክና ስክሪን እስከ ጠዋት 12 ሰዓት ያሳያል።")}</p>
          <div className="quick-list">
            {filtered.map((c) => (
              <div key={c.id} className="quick-sec">
                <span className="quick-cat">{pick(lang, c.nameEn, c.nameAm)}</span>
                {c.items.map((i) => (
                  <m.div key={i.id} layout className={`quick-it${i.soldOut ? " out" : ""}`} animate={{ backgroundColor: i.soldOut ? "#fff4f3" : "rgba(255,255,255,0)" }} transition={{ duration: 0.3 }}>
                    {i.photo ? <img src={i.photo} alt="" /> : <span className="ph-dot" />}
                    <span className="nm">{pick(lang, i.nameEn, i.nameAm)}</span>
                    <Toggle tone="red" big checked={i.soldOut} onChange={(v) => flip(i.id, v, i.nameEn)} label={i.soldOut ? tr("Sold out", "አልቋል") : tr("Available", "አለ")} />
                  </m.div>
                ))}
              </div>
            ))}
          </div>
        </section>

        <div className="col">
          <section className="box">
            <div className="box-h">
              <h2>{tr("Live now", "አሁን")}</h2>
              <Link href="/dashboard/orders" className="btn sm">{tr("All orders", "ሁሉም ትዕዛዞች")} →</Link>
            </div>
            <LiveFeed compact />
          </section>
          <section className="box">
            <div className="box-h">
              <h2>{tr("Specials running", "አሁን ያሉ ልዩ ዋጋዎች")}</h2>
              {role !== "staff" ? <Link href="/dashboard/specials" className="btn sm">{tr("Manage", "አስተዳድር")}</Link> : null}
            </div>
            {specials.length ? (
              <ul className="spec-list">
                {specials.map((i) => (
                  <li key={i.id}>
                    <b>{pick(lang, i.nameEn, i.nameAm)}</b>
                    <s>{i.price}</s> <span className="hot">{i.special!.price} {tr("birr", "ብር")}</span>
                    {i.special!.labelEn ? <em>{pick(lang, i.special!.labelEn, i.special!.labelAm)}</em> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">{tr("No special is running right now. Happy hours and dish-of-the-day prices show here while they're on.", "አሁን ልዩ ዋጋ የለም። የደስታ ሰዓትና የዕለቱ ምግብ ዋጋዎች በሚሠሩበት ጊዜ እዚህ ይታያሉ።")}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
