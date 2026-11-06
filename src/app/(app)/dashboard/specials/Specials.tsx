"use client";

import { useState } from "react";
import { PageHead, PriceField, Toggle, useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { pick } from "@/lib/i18n";
import { hhmmToMinutes, minutesToHHMM } from "@/lib/pricing";
import { cancelPriceChange, deleteSpecial, saveSpecial, schedulePriceChange } from "../more-actions";
import { updateCategory } from "../actions";

type Item = { id: string; nameEn: string; nameAm: string; price: number };
type Special = Awaited<ReturnType<typeof saveSpecial>>[number];
type Change = Awaited<ReturnType<typeof schedulePriceChange>>[number];
type Cat = { id: string; nameEn: string; nameAm: string; fromMin: number | null; toMin: number | null };

const DAYS: [string, string][] = [["Sun", "እሁድ"], ["Mon", "ሰኞ"], ["Tue", "ማክ"], ["Wed", "ረቡዕ"], ["Thu", "ሐሙስ"], ["Fri", "ዓርብ"], ["Sat", "ቅዳሜ"]];

export function Specials({ items, categories, initialSpecials, initialChanges }: { items: Item[]; categories: Cat[]; initialSpecials: Special[]; initialChanges: Change[] }) {
  const { tr, lang } = useTr();
  const { run, toast } = useToast();
  const [specials, setSpecials] = useState(initialSpecials);
  const [changes, setChanges] = useState(initialChanges);
  const [cats, setCats] = useState(categories);
  const blank = { itemId: items[0]?.id ?? "", price: items[0] ? Math.max(5, Math.round((items[0].price * 0.85) / 5) * 5) : 0, days: 127, from: "12:00", to: "15:00", labelEn: "", labelAm: "", active: true };
  const [form, setForm] = useState(blank);
  const [pct, setPct] = useState("10");
  const [scope, setScope] = useState("");
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 86_400_000);
    d.setHours(6, 0, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const daysLabel = (mask: number) => (mask === 127 ? tr("Every day", "በየቀኑ") : DAYS.filter((_, i) => mask & (1 << i)).map((d) => tr(d[0], d[1])).join(", "));

  return (
    <div className="stagger">
      <PageHead title={tr("Specials & timing", "ልዩ ዋጋና ሰዓት")} sub={tr("Prices and sections that switch on and off by themselves, by day and time (Addis time).", "በቀንና በሰዓት በራሳቸው የሚበሩና የሚጠፉ ዋጋዎችና ክፍሎች (በአዲስ አበባ ሰዓት)።")} />

      <section className="box">
        <h2>{tr("Happy hour & dish of the day", "የደስታ ሰዓትና የዕለቱ ምግብ")}</h2>
        <p className="sub">{tr("While a special is on, the menu shows the old price crossed out and the new one in its place. Table orders use the special price.", "ልዩ ዋጋው በሚሠራበት ጊዜ ምናሌው የቀድሞውን ዋጋ ሰርዞ አዲሱን ያሳያል። የጠረጴዛ ትዕዛዞች ልዩ ዋጋውን ይጠቀማሉ።")}</p>
        {items.length === 0 ? <p className="empty">{tr("Add items to your menu first.", "መጀመሪያ ምግቦችን ይጨምሩ።")}</p> : (
          <form
            className="special-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const fromMin = hhmmToMinutes(form.from);
              const toMin = hhmmToMinutes(form.to);
              if (fromMin == null || toMin == null || !form.days) return toast(tr("Check the days and times.", "ቀናቱንና ሰዓቱን ያረጋግጡ።"), { bad: true });
              const r = await run(() => saveSpecial({ itemId: form.itemId, price: form.price, days: form.days, fromMin, toMin, labelEn: form.labelEn, labelAm: form.labelAm, active: true }));
              if (r) { setSpecials(r); setForm(blank); toast(tr("Special saved", "ልዩ ዋጋ ተቀምጧል")); }
            }}
          >
            <div className="grid3">
              <label className="f">{tr("Item", "ምግብ")}
                <select className="inp" value={form.itemId} onChange={(e) => { const it = items.find((i) => i.id === e.target.value)!; setForm({ ...form, itemId: it.id, price: Math.max(5, Math.round((it.price * 0.85) / 5) * 5) }); }}>
                  {items.map((i) => <option key={i.id} value={i.id}>{pick(lang, i.nameEn, i.nameAm)} · {i.price}</option>)}
                </select>
              </label>
              <label className="f">{tr("Special price (birr)", "ልዩ ዋጋ (ብር)")}<PriceField label="price" value={form.price} onCommit={(n) => setForm({ ...form, price: n })} onLive={(n) => setForm((f) => ({ ...f, price: n }))} /></label>
              <label className="f">{tr("Label (optional)", "መለያ (አማራጭ)")}<input className="inp" placeholder="Tibs Tuesday" value={form.labelEn} onChange={(e) => setForm({ ...form, labelEn: e.target.value })} maxLength={60} /></label>
            </div>
            <div className="row">
              <div className="day-chips chips">
                {DAYS.map((d, i) => (
                  <button key={i} type="button" className={`chip${form.days & (1 << i) ? " on" : ""}`} onClick={() => setForm({ ...form, days: form.days ^ (1 << i) })}>{tr(d[0], d[1])}</button>
                ))}
              </div>
              <label className="f inline">{tr("From", "ከ")}<input className="inp" type="time" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></label>
              <label className="f inline">{tr("To", "እስከ")}<input className="inp" type="time" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></label>
              <input className="inp am" placeholder="ጥብስ ማክሰኞ" aria-label={tr("Label in Amharic", "መለያ በአማርኛ")} value={form.labelAm} onChange={(e) => setForm({ ...form, labelAm: e.target.value })} maxLength={60} style={{ maxWidth: 220 }} />
              <button className="btn red" type="submit"><Icon name="plus" /> {tr("Add special", "ልዩ ዋጋ ጨምር")}</button>
            </div>
          </form>
        )}
        {specials.length ? (
          <ul className="rule-list">
            {specials.map((s) => (
              <li key={s.id} className={s.active ? "" : "off"}>
                <b>{pick(lang, s.item.nameEn, s.item.nameAm)}</b>
                <span><s>{s.item.price}</s> → <b className="hot">{s.price} {tr("birr", "ብር")}</b></span>
                <span className="muted">{daysLabel(s.days)} · {minutesToHHMM(s.fromMin)}–{minutesToHHMM(s.toMin)}{s.labelEn ? ` · ${s.labelEn}` : ""}</span>
                <Toggle checked={s.active} onChange={async (v) => { const r = await run(() => saveSpecial({ id: s.id, itemId: s.itemId, price: s.price, days: s.days, fromMin: s.fromMin, toMin: s.toMin, labelEn: s.labelEn, labelAm: s.labelAm, active: v })); if (r) setSpecials(r); }} label={s.active ? tr("On", "በርቷል") : tr("Paused", "ቆሟል")} />
                <button className="icon-btn" type="button" aria-label={tr("Delete", "ሰርዝ")} onClick={async () => { const r = await run(() => deleteSpecial(s.id)); if (r) setSpecials(r); }}><Icon name="trash" /></button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="box">
        <h2>{tr("Menus by time of day", "በቀኑ ሰዓት የሚቀየሩ ምናሌዎች")}</h2>
        <p className="sub">{tr("Give a section serving hours, like Breakfast 6:00–11:00. Outside those hours it shows as “Served 6:00–11:00” and can't be ordered.", "ለክፍል የሚቀርብበትን ሰዓት ይስጡ፣ ለምሳሌ ቁርስ 6:00–11:00። ከሰዓቱ ውጭ «የሚቀርበው 6:00–11:00» ተብሎ ይታያል፤ ማዘዝ አይቻልም።")}</p>
        <ul className="rule-list">
          {cats.map((c) => {
            const allDay = c.fromMin == null;
            const set = async (fromMin: number | null, toMin: number | null) => {
              setCats((cs) => cs.map((x) => (x.id === c.id ? { ...x, fromMin, toMin } : x)));
              await run(() => updateCategory(c.id, { fromMin, toMin }));
            };
            return (
              <li key={c.id}>
                <b>{pick(lang, c.nameEn, c.nameAm)}</b>
                <Toggle checked={!allDay} onChange={(v) => (v ? set(6 * 60, 11 * 60) : set(null, null))} label={allDay ? tr("All day", "ቀኑን ሙሉ") : tr("Set hours", "ሰዓት ተወስኗል")} />
                {!allDay ? (
                  <span className="row">
                    <input className="inp" type="time" aria-label={tr("From", "ከ")} value={minutesToHHMM(c.fromMin!)} onChange={(e) => { const m = hhmmToMinutes(e.target.value); if (m != null) set(m, c.toMin); }} />
                    <span>–</span>
                    <input className="inp" type="time" aria-label={tr("To", "እስከ")} value={minutesToHHMM(c.toMin!)} onChange={(e) => { const m = hhmmToMinutes(e.target.value); if (m != null) set(c.fromMin, m); }} />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="box">
        <h2>{tr("Scheduled price change", "የታቀደ የዋጋ ለውጥ")}</h2>
        <p className="sub">{tr("Set new prices to start at a time you choose, like Monday 6:00 AM, so you don't have to change them by hand that morning.", "አዲስ ዋጋዎች በመረጡት ሰዓት እንዲጀምሩ ያድርጉ፣ ለምሳሌ ሰኞ ጠዋት 12 ሰዓት፤ ያንን ጠዋት በእጅ መቀየር አያስፈልግዎትም።")}</p>
        <form className="bulk" onSubmit={async (e) => {
          e.preventDefault();
          const n = parseInt(pct, 10);
          if (!n) return;
          const r = await run(() => schedulePriceChange(n, scope || null, new Date(when).toISOString()));
          if (r) { setChanges(r); toast(tr("Price change scheduled", "የዋጋ ለውጥ ታቅዷል")); }
        }}>
          <label className="f">{tr("Apply to", "የሚቀየሩት")}
            <select className="inp" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="">{tr("All sections", "ሁሉም ክፍሎች")}</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{pick(lang, c.nameEn, c.nameAm)}</option>)}
            </select>
          </label>
          <label className="f">%<input className="inp num pct" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^0-9-]/g, "").slice(0, 4))} /></label>
          <label className="f">{tr("Starts", "የሚጀምረው")}<input className="inp" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
          <button className="btn mus" type="submit"><Icon name="clock" /> {tr("Schedule", "አቅድ")}</button>
        </form>
        {changes.length ? (
          <ul className="rule-list">
            {changes.map((c) => (
              <li key={c.id} className={c.appliedAt ? "off" : ""}>
                <b>{c.percent > 0 ? "+" : ""}{c.percent}%</b>
                <span>{c.categoryId ? pick(lang, cats.find((x) => x.id === c.categoryId)?.nameEn ?? "", cats.find((x) => x.id === c.categoryId)?.nameAm ?? "") : tr("All sections", "ሁሉም ክፍሎች")}</span>
                <span className="muted">{new Date(c.effectiveAt).toLocaleString(lang === "am" ? "am-ET" : "en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                {c.appliedAt ? <span className="tag-mini">{tr("Done", "ተፈጽሟል")}</span> : <button className="btn sm" type="button" onClick={async () => { const r = await run(() => cancelPriceChange(c.id)); if (r) setChanges(r); }}>{tr("Cancel", "ሰርዝ")}</button>}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
