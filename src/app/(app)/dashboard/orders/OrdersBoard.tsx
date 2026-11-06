"use client";

import Link from "next/link";
import { useState } from "react";
import { PageHead, useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { doneCall, setOrderStatus } from "../more-actions";
import { ago, useLiveFeed } from "./LiveFeed";

const COLS = [
  { id: "new", en: "New", am: "አዲስ" },
  { id: "preparing", en: "Preparing", am: "በዝግጅት ላይ" },
  { id: "served", en: "Served, not paid", am: "ቀርቧል፣ አልተከፈለም" },
] as const;

export function OrdersBoard({ orderingOn, callsOn, tables }: { orderingOn: boolean; callsOn: boolean; tables: number }) {
  const { tr } = useTr();
  const { run } = useToast();
  const { feed, setFeed, fresh } = useLiveFeed();
  const [kitchen, setKitchen] = useState(false);
  const [payFor, setPayFor] = useState<string | null>(null);

  const act = async (fn: () => Promise<Awaited<ReturnType<typeof setOrderStatus>>>) => {
    const f = await run(fn);
    if (f) setFeed(f);
  };

  const enterKitchen = () => {
    setKitchen(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const paidToday = feed ? feed.orders.filter((o) => o.status === "paid") : [];
  const intro = !orderingOn && !callsOn;

  return (
    <div className={kitchen ? "kitchen" : "stagger"}>
      <PageHead title={tr("Orders & calls", "ትዕዛዞችና ጥሪዎች")} sub={tr("Updates every 5 seconds. Keep this open on a tablet behind the counter; a chime plays for each new order or call.", "በየ5 ሰከንዱ ይታደሳል። ይህን ከካውንተሩ ጀርባ ባለ ታብሌት ላይ ክፍት ያድርጉት፤ ለእያንዳንዱ አዲስ ትዕዛዝ ወይም ጥሪ ድምፅ ይሰማል።")}>
        {kitchen ? (
          <button className="btn" type="button" onClick={() => { setKitchen(false); document.exitFullscreen?.().catch(() => {}); }}>
            {tr("Exit kitchen view", "ከኩሽና እይታ ውጣ")}
          </button>
        ) : (
          <button className="btn ink" type="button" onClick={enterKitchen}>
            <Icon name="screen" /> {tr("Kitchen view", "የኩሽና እይታ")}
          </button>
        )}
      </PageHead>

      {intro ? (
        <div className="banner">
          <Icon name="info" />
          <span>
            {tr("Table ordering and waiter calls are off. Turn them on and set your number of tables in ", "የጠረጴዛ ትዕዛዝና የአስተናጋጅ ጥሪ ጠፍተዋል። በ")}
            <Link href="/dashboard/info">{tr("Cafe info", "የካፌ መረጃ")}</Link>
            {tr(".", " ውስጥ ያብሩዋቸውና የጠረጴዛዎችን ቁጥር ያስገቡ።")}
          </span>
        </div>
      ) : tables === 0 ? (
        <div className="banner">
          <Icon name="qr" />
          <span>
            {tr("Set how many tables you have, then print a QR for each table so orders arrive with the table number. ", "የጠረጴዛዎችን ቁጥር ያስገቡ፣ ከዚያ ትዕዛዞች ከጠረጴዛ ቁጥር ጋር እንዲመጡ ለእያንዳንዱ ጠረጴዛ QR ያትሙ። ")}
            <Link href="/dashboard/print">{tr("Print table QR codes", "የጠረጴዛ QR አትም")}</Link>
          </span>
        </div>
      ) : null}

      {feed && feed.calls.length ? (
        <section className="calls-strip">
          {feed.calls.map((c) => (
            <button key={c.id} type="button" className={`call-chip ${c.kind}${fresh.has(c.id) ? " fresh" : ""}`} onClick={() => act(() => doneCall(c.id))}>
              <Icon name={c.kind === "bill" ? "bill" : "bell"} />
              <b>{tr(`Table ${c.table}`, `ጠረጴዛ ${c.table}`)}</b>
              <span>{c.kind === "bill" ? tr("Bill", "ሂሳብ") : tr("Waiter", "አስተናጋጅ")} · {ago(feed.now - new Date(c.createdAt).getTime(), tr)}</span>
              <em>{tr("Tap when done", "ሲጨርሱ ይንኩ")}</em>
            </button>
          ))}
        </section>
      ) : null}

      <div className="kanban">
        {COLS.map((col) => {
          const list = feed ? feed.orders.filter((o) => o.status === col.id).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)) : [];
          return (
            <section key={col.id} className={`lane ${col.id}`}>
              <h2>
                {tr(col.en, col.am)} <span className="pill-count">{list.length}</span>
              </h2>
              {list.length === 0 ? <p className="empty">{feed ? "—" : tr("Loading…", "በመጫን ላይ…")}</p> : null}
              {list.map((o) => (
                <article key={o.id} className={`ticket${fresh.has(o.id) ? " fresh" : ""}`}>
                  <header>
                    <b>#{o.number}</b>
                    <span className="tk-table">{tr(`Table ${o.table}`, `ጠረጴዛ ${o.table}`)}</span>
                    <small>{ago(feed!.now - new Date(o.createdAt).getTime(), tr)}</small>
                  </header>
                  <ul>
                    {o.lines.map((l) => (
                      <li key={l.id}>
                        <b>{l.qty}×</b> {l.name}
                        {l.variant ? <em> · {l.variant}</em> : null}
                        {l.addons ? <em> + {l.addons}</em> : null}
                      </li>
                    ))}
                  </ul>
                  {o.note ? <p className="note">{tr("Note", "ማስታወሻ")}: {o.note}</p> : null}
                  <footer>
                    <span className="total">{o.total.toLocaleString("en-US")} {tr("birr", "ብር")}</span>
                    {o.status === "new" ? (
                      <>
                        <button className="btn sm ghost" type="button" onClick={() => act(() => setOrderStatus(o.id, "cancelled"))}>{tr("Cancel", "ሰርዝ")}</button>
                        <button className="btn sm mus" type="button" onClick={() => act(() => setOrderStatus(o.id, "preparing"))}>{tr("Start", "ጀምር")} →</button>
                      </>
                    ) : o.status === "preparing" ? (
                      <button className="btn sm mus" type="button" onClick={() => act(() => setOrderStatus(o.id, "served"))}>{tr("Served", "ቀርቧል")} →</button>
                    ) : payFor === o.id ? (
                      <span className="pay-pick">
                        {(["cash", "telebirr", "cbe"] as const).map((m) => (
                          <button key={m} className="btn sm" type="button" onClick={() => { setPayFor(null); act(() => setOrderStatus(o.id, "paid", m)); }}>
                            {m === "cash" ? tr("Cash", "ጥሬ ገንዘብ") : m === "telebirr" ? "Telebirr" : "CBE"}
                          </button>
                        ))}
                      </span>
                    ) : (
                      <button className="btn sm red" type="button" onClick={() => setPayFor(o.id)}>{tr("Mark paid", "ተከፍሏል")}</button>
                    )}
                  </footer>
                </article>
              ))}
            </section>
          );
        })}
      </div>

      {paidToday.length ? (
        <section className="box">
          <div className="box-h">
            <h2>{tr("Paid today", "ዛሬ የተከፈሉ")}</h2>
            <span className="pill-count">{paidToday.reduce((s, o) => s + o.total, 0).toLocaleString("en-US")} {tr("birr", "ብር")}</span>
          </div>
          <ul className="paid-list">
            {paidToday.map((o) => (
              <li key={o.id}>
                #{o.number} · {tr(`Table ${o.table}`, `ጠረጴዛ ${o.table}`)} · {o.total} {tr("birr", "ብር")} · {o.payMethod}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
