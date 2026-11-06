"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { doneCall, liveFeed, setOrderStatus } from "../more-actions";

type Feed = Awaited<ReturnType<typeof liveFeed>>;
const POLL = 5000;

// A short two-tone chime so staff hear new orders. Browsers allow sound only after a tap on the page.
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.start(t);
      o.stop(t + 0.32);
    });
  } catch {}
}

export function useLiveFeed() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const load = useCallback(async () => {
    try {
      const f = await liveFeed();
      const ids = [...f.orders.filter((o) => o.status === "new").map((o) => o.id), ...f.calls.map((c) => c.id)];
      if (seen.current) {
        const added = ids.filter((id) => !seen.current!.has(id));
        if (added.length) {
          chime();
          setFresh(new Set(added));
          setTimeout(() => setFresh(new Set()), 4000);
        }
      }
      seen.current = new Set(ids);
      setFeed(f);
    } catch {}
  }, []);
  useEffect(() => {
    load();
    const id = setInterval(load, POLL);
    return () => clearInterval(id);
  }, [load]);
  return { feed, setFeed, fresh, reload: load };
}

export const ago = (ms: number, tr: (en: string, am: string) => string) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m < 1 ? tr("just now", "አሁን") : tr(`${m} min ago`, `ከ${m} ደቂቃ በፊት`);
};

export function LiveFeed({ compact }: { compact?: boolean }) {
  const { tr } = useTr();
  const { run } = useToast();
  const { feed, setFeed, fresh } = useLiveFeed();
  if (!feed) return <p className="empty pulse-text">{tr("Loading…", "በመጫን ላይ…")}</p>;
  const open = feed.orders.filter((o) => o.status === "new" || o.status === "preparing");
  if (!feed.calls.length && !open.length) return <p className="empty">{tr("All quiet. New orders and waiter calls appear here, with a sound.", "ጸጥ ብሏል። አዳዲስ ትዕዛዞችና ጥሪዎች በድምፅ እዚህ ይታያሉ።")}</p>;
  return (
    <ul className="live-list">
      {feed.calls.map((c) => (
        <li key={c.id} className={`live-call ${c.kind}${fresh.has(c.id) ? " fresh" : ""}`}>
          <Icon name={c.kind === "bill" ? "bill" : "bell"} />
          <span>
            <b>{tr(`Table ${c.table}`, `ጠረጴዛ ${c.table}`)}</b> {c.kind === "bill" ? tr("wants the bill", "ሂሳብ ይፈልጋል") : tr("is calling a waiter", "አስተናጋጅ ይጠራል")}
            <small>{ago(feed.now - new Date(c.createdAt).getTime(), tr)}</small>
          </span>
          <button className="btn sm" type="button" onClick={async () => { const f = await run(() => doneCall(c.id)); if (f) setFeed(f); }}>
            {tr("Done", "ተሠርቷል")}
          </button>
        </li>
      ))}
      {open.slice(0, compact ? 4 : 50).map((o) => (
        <li key={o.id} className={`live-order ${o.status}${fresh.has(o.id) ? " fresh" : ""}`}>
          <Icon name="orders" />
          <span>
            <b>#{o.number} · {tr(`Table ${o.table}`, `ጠረጴዛ ${o.table}`)}</b> {o.lines.reduce((n, l) => n + l.qty, 0)} {tr("items", "ዓይነት")} · {o.total.toLocaleString("en-US")} {tr("birr", "ብር")}
            <small>{ago(feed.now - new Date(o.createdAt).getTime(), tr)}</small>
          </span>
          <button className="btn sm mus" type="button" onClick={async () => { const f = await run(() => setOrderStatus(o.id, o.status === "new" ? "preparing" : "served")); if (f) setFeed(f); }}>
            {o.status === "new" ? tr("Start", "ጀምር") : tr("Served", "ቀርቧል")}
          </button>
        </li>
      ))}
    </ul>
  );
}
