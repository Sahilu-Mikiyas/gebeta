"use client";

import { useState } from "react";
import { PageHead, useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { undo } from "../actions";

type Row = { id: string; who: string; action: string; summary: string; at: string; undone: boolean; canUndo: boolean };
const ICON: Record<string, string> = { price: "insights", soldout: "close", item: "menu", section: "menu", design: "design", cafe: "info", special: "star", shop: "shop" };

export function History({ rows: initial }: { rows: Row[] }) {
  const { tr, lang } = useTr();
  const { run, toast } = useToast();
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState("all");
  const shown = rows.filter((r) => filter === "all" || r.action === filter);
  const day = (iso: string) => new Date(iso).toLocaleDateString(lang === "am" ? "am-ET" : "en-GB", { weekday: "long", day: "numeric", month: "long" });
  let last = "";
  return (
    <div className="stagger narrow">
      <PageHead title={tr("History & undo", "ታሪክና መቀልበስ")} sub={tr("Every change made from the dashboard and Telegram, newest first. Undo puts the old values back.", "ከዳሽቦርድና ከቴሌግራም የተደረጉ ለውጦች ሁሉ፣ አዲሱ በመጀመሪያ። መቀልበስ የቀድሞውን ይመልሳል።")} />
      <div className="chips">
        {[["all", tr("All", "ሁሉም")], ["price", tr("Prices", "ዋጋ")], ["soldout", tr("Sold out", "አልቋል")], ["item", tr("Items", "ምግቦች")], ["cafe", tr("Settings", "ቅንብሮች")]].map(([v, l]) => (
          <button key={v} type="button" className={`chip${filter === v ? " on" : ""}`} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      {shown.length === 0 ? <p className="box empty">{tr("No changes yet.", "ገና ለውጥ የለም።")}</p> : (
        <ol className="timeline">
          {shown.map((r, i) => {
            const d = day(r.at);
            const head = d !== last ? ((last = d), <li key={`d-${r.id}`} className="tl-day">{d}</li>) : null;
            return [
              head,
              <li key={r.id} className={`tl-item${r.undone ? " undone" : ""}`} style={{ ["--i" as string]: i }}>
                <span className="tl-ic"><Icon name={ICON[r.action] ?? "history"} size={16} /></span>
                <div>
                  <b>{r.summary}</b>
                  <small>{r.who} · {new Date(r.at).toLocaleTimeString(lang === "am" ? "am-ET" : "en-GB", { hour: "2-digit", minute: "2-digit" })}{r.undone ? ` · ${tr("undone", "ተቀልብሷል")}` : ""}</small>
                </div>
                {r.canUndo && !r.undone ? (
                  <button className="btn sm" type="button" onClick={async () => {
                    const ok = await run(() => undo(r.id));
                    if (ok) { setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, undone: true } : x))); toast(tr("Undone", "ተቀልብሷል")); }
                    else if (ok === false) toast(tr("That change can't be undone any more.", "ይህ ለውጥ ከእንግዲህ ሊቀለበስ አይችልም።"), { bad: true });
                  }}><Icon name="history" size={16} /> {tr("Undo", "መልስ")}</button>
                ) : null}
              </li>,
            ];
          })}
        </ol>
      )}
    </div>
  );
}
