"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHead, Toggle, useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { switchCafe } from "../actions";
import { createBranch } from "../more-actions";

type B = { id: string; nameEn: string; area: string; slug: string; items: number; scans: number };

export function Branches({ current, branches, limit }: { current: string; branches: B[]; limit: number }) {
  const { tr } = useTr();
  const { run } = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [copy, setCopy] = useState(true);
  const full = branches.length >= limit;
  return (
    <div className="stagger narrow">
      <PageHead title={tr("Branches", "ቅርንጫፎች")} sub={tr("Each branch has its own menu, prices, QR codes and screen. Start a new one as a copy of this menu.", "እያንዳንዱ ቅርንጫፍ የራሱ ምናሌ፣ ዋጋ፣ QR ኮድና ስክሪን አለው። አዲሱን የዚህን ምናሌ ቅጂ አድርገው ይጀምሩ።")} />
      <div className="branch-grid">
        {branches.map((b, i) => (
          <article key={b.id} className={`branch${b.id === current ? " on" : ""}`} style={{ ["--i" as string]: i }}>
            <Icon name="branches" size={28} />
            <b>{b.nameEn}</b>
            <span>{b.area || "—"}</span>
            <small>{b.items} {tr("items", "ምግቦች")} · {b.scans} {tr("scans", "ስካኖች")}</small>
            {b.id === current ? <span className="tag-mini">{tr("Open now", "አሁን የተከፈተ")}</span> : (
              <button className="btn sm" type="button" onClick={async () => { await run(() => switchCafe(b.id)); router.push("/dashboard"); router.refresh(); }}>{tr("Switch to this branch", "ወደዚህ ቅርንጫፍ ቀይር")}</button>
            )}
          </article>
        ))}
      </div>
      <section className="box">
        <h2>{tr("Add a branch", "ቅርንጫፍ ጨምር")}</h2>
        {full ? (
          <p className="sub">{limit === 1 ? tr("More branches need the Group plan (up to 5).", "ተጨማሪ ቅርንጫፎች የቡድን ጥቅል ያስፈልጋቸዋል (እስከ 5)።") : tr(`Your plan allows ${limit} branches.`, `ጥቅልዎ ${limit} ቅርንጫፎችን ይፈቅዳል።`)} <a href="/dashboard/shop">{tr("See plans", "ጥቅሎችን ይመልከቱ")} →</a></p>
        ) : (
          <form className="grid2" onSubmit={async (e) => {
            e.preventDefault();
            if (name.trim().length < 2) return;
            const id = await run(() => createBranch(name.trim(), area.trim(), copy));
            if (id) { router.push("/dashboard"); router.refresh(); }
          }}>
            <label className="f">{tr("Branch name", "የቅርንጫፉ ስም")}<input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder="Selam Buna – Kazanchis" required /></label>
            <label className="f">{tr("Area", "አካባቢ")}<input className="inp" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Kazanchis" /></label>
            <Toggle checked={copy} onChange={setCopy} label={tr("Copy this branch's menu and prices", "የዚህን ቅርንጫፍ ምናሌና ዋጋ ቅዳ")} />
            <button className="btn red" type="submit"><Icon name="plus" /> {tr("Create branch", "ቅርንጫፍ ፍጠር")}</button>
          </form>
        )}
      </section>
    </div>
  );
}
