"use client";

import { useRef, useState } from "react";
import { PageHead, Toggle, uploadPhoto, useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { pick } from "@/lib/i18n";
import type { MenuDTO } from "@/lib/types";
import { removeImage, updateCafe, updateCategory, uploadImage } from "../actions";

export function ScreenSettings({ initial, appUrl }: { initial: MenuDTO; appUrl: string }) {
  const { tr, lang } = useTr();
  const { run, toast } = useToast();
  const [menu, setMenu] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState(0); // bumps the preview after saved changes
  const fileRef = useRef<HTMLInputElement>(null);
  const cafe = menu.cafe;
  const url = `${appUrl}/s/${cafe.slug}`;
  const set = async (f: Parameters<typeof updateCafe>[0]) => {
    setMenu((m) => ({ ...m, cafe: { ...m.cafe, ...f } }));
    if (await run(async () => (await updateCafe(f), true))) setV((x) => x + 1);
  };

  return (
    <div className="stagger">
      <PageHead title={tr("Menu screen", "የምናሌ ስክሪን")} sub={tr("Open the link on any smart TV browser or a laptop plugged into a TV. It rotates through your menu and picks up changes within 30 seconds.", "ሊንኩን በማንኛውም ስማርት ቲቪ ብራውዘር ወይም ከቲቪ ጋር በተገናኘ ላፕቶፕ ይክፈቱ። ምናሌዎን እያፈራረቀ ያሳያል፤ ለውጦችን በ30 ሰከንድ ውስጥ ያሳያል።")}>
        <a className="btn red" href={`/s/${cafe.slug}`} target="_blank" rel="noreferrer"><Icon name="external" /> {tr("Open the screen", "ስክሪኑን ክፈት")}</a>
      </PageHead>
      {cafe.plan === "free" ? <div className="banner"><Icon name="info" /><span>{tr("Menu screens are part of the Cafe plan. You can try it now; a small Gebeta label shows on the free plan.", "የምናሌ ስክሪን የካፌ ጥቅል አካል ነው። አሁን መሞከር ይችላሉ፤ በነፃ ጥቅል ትንሽ የገበታ ምልክት ይታያል።")}</span></div> : null}
      <section className="box">
        <span className="qr-link">{url}</span>
        <div className="grid3">
          <label className="f">{tr("Seconds per board", "በየሰሌዳው ሰከንድ")}
            <select className="inp" value={cafe.screenSeconds} onChange={(e) => set({ screenSeconds: Number(e.target.value) })}>
              {[6, 8, 10, 15, 20, 30].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="f">{tr("Language", "ቋንቋ")}
            <select className="inp" value={cafe.screenLang} onChange={(e) => set({ screenLang: e.target.value as "both" })}>
              <option value="both">{tr("English and Amharic", "እንግሊዝኛና አማርኛ")}</option>
              <option value="en">{tr("English only", "እንግሊዝኛ ብቻ")}</option>
              <option value="am">{tr("Amharic only", "አማርኛ ብቻ")}</option>
            </select>
          </label>
          <div className="f">{tr("Screen shape", "የስክሪን ቅርጽ")}
            <div className="seg">
              <button type="button" aria-pressed={!cafe.screenPortrait} onClick={() => set({ screenPortrait: false })}>{tr("Landscape", "አግድም")}</button>
              <button type="button" aria-pressed={cafe.screenPortrait} onClick={() => set({ screenPortrait: true })}>{tr("Portrait", "ቁም")}</button>
            </div>
          </div>
        </div>
      </section>
      <section className="box">
        <h2>{tr("What shows on the screen", "በስክሪኑ ላይ የሚታየው")}</h2>
        <p className="sub">{tr("Sections with serving hours only appear during those hours.", "የሚቀርቡበት ሰዓት ያላቸው ክፍሎች በዚያ ሰዓት ብቻ ይታያሉ።")}</p>
        <ul className="rule-list">
          {menu.categories.map((c) => (
            <li key={c.id}>
              <b>{pick(lang, c.nameEn, c.nameAm)}</b>
              <span className="muted">{c.items.length} {tr("items", "ምግቦች")}</span>
              <Toggle checked={c.showOnScreen} onChange={async (val) => {
                setMenu((m) => ({ ...m, categories: m.categories.map((x) => (x.id === c.id ? { ...x, showOnScreen: val } : x)) }));
                if (await run(async () => (await updateCategory(c.id, { showOnScreen: val }), true))) setV((x) => x + 1);
              }} label={c.showOnScreen ? tr("Shown", "ይታያል") : tr("Hidden", "ተደብቋል")} />
            </li>
          ))}
        </ul>
      </section>
      <section className="box">
        <h2>{tr("Promo slides", "የማስታወቂያ ስላይዶች")}</h2>
        <p className="sub">{tr("Add your own posters or photos (a new dish, an event, a holiday greeting). They play between the menu boards, full screen.", "የራስዎን ፖስተሮች ወይም ፎቶዎች ይጨምሩ (አዲስ ምግብ፣ ዝግጅት፣ የበዓል ሰላምታ)። በምናሌ ሰሌዳዎቹ መካከል ሙሉ ስክሪን ይታያሉ።")}</p>
        <div className="slides">
          {cafe.slides.map((id) => (
            <div key={id} className="slide-thumb pop-in">
              <img src={`/media/${id}`} alt="" />
              <button type="button" className="icon-btn sm" aria-label={tr("Remove", "አስወግድ")} onClick={async () => {
                setMenu((m) => ({ ...m, cafe: { ...m.cafe, slides: m.cafe.slides.filter((s) => s !== id) } }));
                await run(() => removeImage(`slide:${id}`));
                setV((x) => x + 1);
              }}><Icon name="close" size={16} /></button>
            </div>
          ))}
          <button type="button" className="slide-add" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <span className="spin" /> : <><Icon name="plus" size={28} /><span>{tr("Add slide", "ስላይድ ጨምር")}</span></>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            const id = await run(() => uploadPhoto("slide", f, uploadImage, 1920));
            setBusy(false);
            if (id) { setMenu((m) => ({ ...m, cafe: { ...m.cafe, slides: [...m.cafe.slides, id] } })); setV((x) => x + 1); }
            else toast(tr("That image could not be used.", "ምስሉን መጠቀም አልተቻለም።"), { bad: true });
          }} />
        </div>
      </section>
      <section className="box">
        <h3>{tr("Live preview", "ቀጥታ ቅድመ እይታ")}</h3>
        <div className={`tv-frame${cafe.screenPortrait ? " portrait" : ""}`}>
          <iframe key={v} src={`/s/${cafe.slug}?embed=1`} title={tr("Live preview", "ቀጥታ ቅድመ እይታ")} loading="lazy" />
        </div>
      </section>
    </div>
  );
}
