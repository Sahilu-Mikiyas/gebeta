"use client";

import { useState } from "react";
import { PageHead, useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { changePassword, telegramLinkUrl, testNotify, unlinkTelegram } from "../more-actions";

export function Account({ name, phone, linked: initialLinked, botOn }: { name: string; phone: string; linked: boolean; botOn: boolean }) {
  const { tr } = useTr();
  const { run, toast } = useToast();
  const [linked, setLinked] = useState(initialLinked);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  return (
    <div className="stagger narrow">
      <PageHead title={tr("Account", "አካውንት")} sub={`${name} · ${phone}`} />
      <section className="box tg-box">
        <div className="tg-head"><span className="tg-logo"><Icon name="telegram" size={26} /></span><div><h2>Telegram</h2><p className="sub">{tr("Get new orders, waiter calls and a weekly summary in Telegram. Change prices with /price macchiato 100. Reset your password if you forget it.", "አዳዲስ ትዕዛዞችን፣ የአስተናጋጅ ጥሪዎችንና ሳምንታዊ ማጠቃለያ በቴሌግራም ያግኙ። ዋጋ በ/price macchiato 100 ይቀይሩ። የይለፍ ቃልዎን ከረሱ ይቀይሩ።")}</p></div></div>
        {!botOn ? (
          <p className="banner"><Icon name="info" /><span>{tr("The Gebeta bot isn't switched on yet. The platform admin needs to add the bot token.", "የገበታ ቦት ገና አልበራም። የመድረኩ አስተዳዳሪ የቦት ቶከኑን ማስገባት አለበት።")}</span></p>
        ) : linked ? (
          <div className="row">
            <span className="ok"><Icon name="check" /> {tr("Connected", "ተገናኝቷል")}</span>
            <button className="btn sm" type="button" onClick={() => run(() => testNotify()).then(() => toast(tr("Test message sent", "የሙከራ መልእክት ተልኳል")))}>{tr("Send a test message", "የሙከራ መልእክት ላክ")}</button>
            <button className="btn sm ghost" type="button" onClick={async () => { await run(() => unlinkTelegram()); setLinked(false); }}>{tr("Disconnect", "አቋርጥ")}</button>
          </div>
        ) : (
          <button className="btn red" type="button" onClick={async () => {
            const url = await run(() => telegramLinkUrl());
            if (url) { window.open(url, "_blank"); toast(tr("Press Start in Telegram, then come back here.", "በቴሌግራም Start ን ይጫኑ፣ ከዚያ ወደዚህ ይመለሱ።")); }
          }}><Icon name="telegram" /> {tr("Connect Telegram", "ቴሌግራምን አገናኝ")}</button>
        )}
      </section>
      <section className="box">
        <h2>{tr("Change password", "የይለፍ ቃል ቀይር")}</h2>
        <form className="grid3" onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() => changePassword(cur, next));
          if (r === "ok") { setCur(""); setNext(""); toast(tr("Password changed", "የይለፍ ቃል ተቀይሯል")); }
          else if (r === "wrong") toast(tr("Your current password is wrong.", "የአሁኑ የይለፍ ቃልዎ ትክክል አይደለም።"), { bad: true });
          else if (r === "short") toast(tr("Use at least 8 characters.", "ቢያንስ 8 ፊደላት ይጠቀሙ።"), { bad: true });
        }}>
          <label className="f">{tr("Current password", "የአሁኑ የይለፍ ቃል")}<input className="inp" type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} required /></label>
          <label className="f">{tr("New password", "አዲስ የይለፍ ቃል")}<input className="inp" type="password" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required /></label>
          <button className="btn" type="submit" style={{ alignSelf: "end" }}>{tr("Change", "ቀይር")}</button>
        </form>
      </section>
    </div>
  );
}
