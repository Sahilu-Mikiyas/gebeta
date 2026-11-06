"use client";

import { useState } from "react";
import { Field, PageHead, Toggle, useToast, useTr } from "@/components/ui";
import type { CafeDTO } from "@/lib/types";
import { setSlug, updateCafe } from "../actions";

type Key = "nameEn" | "nameAm" | "area" | "hoursEn" | "hoursAm" | "phone" | "mapUrl" | "instagram" | "tiktok" | "telegram" | "facebook" | "wifiName" | "wifiPass";

export function Info({ cafe: initial, appUrl, canEditLink }: { cafe: CafeDTO; appUrl: string; canEditLink: boolean }) {
  const { tr } = useTr();
  const { run, toast } = useToast();
  const [cafe, setCafe] = useState(initial);
  const [slug, setSlugDraft] = useState(initial.slug);
  const [slugErr, setSlugErr] = useState("");
  const patch = (f: Partial<CafeDTO>) => setCafe((c) => ({ ...c, ...f }));
  const save = (f: Parameters<typeof updateCafe>[0]) => run(() => updateCafe(f));

  const field = (key: Key, label: string, opts: { am?: boolean; required?: boolean; placeholder?: string; type?: string } = {}) => (
    <label className="f">
      {label}
      <Field className={`inp${opts.am ? " am" : ""}`} type={opts.type} value={cafe[key]} required={opts.required} maxLength={key === "mapUrl" ? 300 : 80} placeholder={opts.placeholder} onLive={(v) => patch({ [key]: v })} onCommit={(v) => save({ [key]: v })} />
    </label>
  );

  return (
    <div className="stagger narrow">
      <PageHead title={tr("Cafe info", "የካፌ መረጃ")} sub={tr("Everything here shows on your menu. Leave a field empty to hide it.", "እዚህ ያለው ሁሉ በምናሌዎ ላይ ይታያል። ለመደበቅ ባዶ ይተዉት።")} />
      <section className="box">
        <h2>{tr("Name & hours", "ስምና ሰዓት")}</h2>
        <div className="grid2">
          {field("nameEn", tr("Cafe name (English)", "የካፌ ስም (እንግሊዝኛ)"), { required: true })}
          {field("nameAm", tr("Cafe name (Amharic)", "የካፌ ስም (አማርኛ)"), { am: true })}
          {field("hoursEn", tr("Opening hours (English)", "የሥራ ሰዓት (እንግሊዝኛ)"), { placeholder: "7:00 AM – 10:00 PM" })}
          {field("hoursAm", tr("Opening hours (Amharic)", "የሥራ ሰዓት (አማርኛ)"), { am: true, placeholder: "ከጠዋቱ 1:00 – ምሽቱ 4:00" })}
          {field("area", tr("Area", "አካባቢ"), { placeholder: tr("Bole, Addis Ababa", "ቦሌ፣ አዲስ አበባ") })}
          {field("phone", tr("Phone", "ስልክ"), { placeholder: "0911 23 45 67", type: "tel" })}
        </div>
      </section>
      <section className="box">
        <h2>{tr("Wi-Fi", "ዋይፋይ")}</h2>
        <p className="sub">{tr("Customers see this at the bottom of the menu, so nobody has to ask.", "ደንበኞች ይህን በምናሌው ግርጌ ያያሉ፤ ማንም መጠየቅ አያስፈልገውም።")}</p>
        <div className="grid2">
          {field("wifiName", tr("Network name", "የኔትወርክ ስም"), { placeholder: "SelamBuna_Guest" })}
          {field("wifiPass", tr("Password", "የይለፍ ቃል"), { placeholder: "buna2026" })}
        </div>
      </section>
      <section className="box">
        <h2>{tr("Map & social", "ካርታና ማኅበራዊ ሚዲያ")}</h2>
        <div className="grid2">
          {field("mapUrl", tr("Google Maps link", "የጎግል ካርታ ሊንክ"), { placeholder: "https://maps.app.goo.gl/…" })}
          {field("instagram", "Instagram", { placeholder: "@selambuna" })}
          {field("tiktok", "TikTok", { placeholder: "@selambuna" })}
          {field("telegram", tr("Telegram channel", "የቴሌግራም ቻናል"), { placeholder: "@selambuna" })}
          {field("facebook", "Facebook", { placeholder: "selambuna" })}
        </div>
      </section>
      <section className="box">
        <h2>{tr("Tables & service", "ጠረጴዛና አገልግሎት")}</h2>
        <p className="sub">{tr("With a number of tables set, you can print one QR per table. Customers scanning it can call a waiter, ask for the bill and, if ordering is on, order from their phone.", "የጠረጴዛዎች ቁጥር ሲገባ ለእያንዳንዱ ጠረጴዛ QR ማተም ይችላሉ። የሚቃኙ ደንበኞች አስተናጋጅ መጥራት፣ ሂሳብ መጠየቅ እና ትዕዛዝ ከበራ ከስልካቸው ማዘዝ ይችላሉ።")}</p>
        <label className="f" style={{ maxWidth: 220 }}>
          {tr("Number of tables", "የጠረጴዛዎች ቁጥር")}
          <input className="inp num" inputMode="numeric" value={cafe.tableCount || ""} placeholder="0" onChange={(e) => patch({ tableCount: Math.min(200, parseInt(e.target.value.replace(/\D/g, "") || "0", 10)) })} onBlur={() => save({ tableCount: cafe.tableCount })} />
        </label>
        <Toggle checked={cafe.callsOn} onChange={(v) => { patch({ callsOn: v }); save({ callsOn: v }); }} label={tr("Call waiter & request bill buttons", "አስተናጋጅ መጥሪያና ሂሳብ መጠየቂያ ቁልፎች")} />
        <Toggle checked={cafe.orderingOn} onChange={async (v) => {
          patch({ orderingOn: v });
          const ok = await run(async () => (await updateCafe({ orderingOn: v }), true));
          if (!ok) patch({ orderingOn: !v });
        }} label={tr("Customers can order from their phone (Cafe plan)", "ደንበኞች ከስልካቸው ማዘዝ ይችላሉ (የካፌ ጥቅል)")} />
      </section>
      <section className="box">
        <h2>{tr("Fasting days", "የጾም ቀናት")}</h2>
        <p className="sub">{tr("On Wednesdays, Fridays and during fasting seasons (Abiy Tsom, Advent, Filseta), the menu shows a fasting banner and lists fasting dishes first.", "ረቡዕ፣ ዓርብና በጾም ወቅቶች (ዐቢይ ጾም፣ ጾመ ነቢያት፣ ፍልሰታ) ምናሌው የጾም ማሳሰቢያ ያሳያል፤ የጾም ምግቦችን ቀድሞ ይዘረዝራል።")}</p>
        <div className="seg">
          {([["auto", tr("Automatic (Ethiopian calendar)", "በራሱ (በኢትዮጵያ ቀን አቆጣጠር)")], ["on", tr("Always", "ሁልጊዜ")], ["off", tr("Off", "ጠፍቷል")]] as const).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={cafe.fastingMode === v} onClick={() => { patch({ fastingMode: v }); save({ fastingMode: v }); }}>{l}</button>
          ))}
        </div>
      </section>
      <section className="box">
        <h2>{tr("Menu link", "የምናሌ ሊንክ")}</h2>
        <span className="qr-link">{appUrl}/m/{cafe.slug}</span>
        {canEditLink ? (
          <form className="row" onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(() => setSlug(slug));
            if (!r) return;
            if (r.ok) { setSlugErr(""); patch({ slug: r.slug }); toast(tr("Link saved", "ሊንኩ ተቀምጧል")); }
            else setSlugErr(r.error === "err_slugTaken" ? tr("Another cafe already uses this link.", "ሌላ ካፌ ይህን ሊንክ እየተጠቀመ ነው።") : tr("Use 3–40 lowercase English letters, numbers or hyphens.", "3–40 ትንንሽ የእንግሊዝኛ ፊደላት፣ ቁጥሮች ወይም ሰረዝ ይጠቀሙ።"));
          }}>
            <label className="f" style={{ flex: 1 }}>{appUrl.replace(/^https?:\/\//, "")}/m/<input className="inp" value={slug} onChange={(e) => setSlugDraft(e.target.value.toLowerCase())} maxLength={40} required /></label>
            <button className="btn" type="submit" disabled={slug === cafe.slug} style={{ alignSelf: "end" }}>{tr("Save link", "ሊንኩን አስቀምጥ")}</button>
          </form>
        ) : null}
        {slugErr ? <p className="err shake">{slugErr}</p> : null}
        <p className="hint">{tr("Changing the link breaks QR codes you already printed.", "ሊንኩን መቀየር ቀድመው ያሳተሟቸውን QR ኮዶች ያበላሻል።")}</p>
      </section>
    </div>
  );
}
