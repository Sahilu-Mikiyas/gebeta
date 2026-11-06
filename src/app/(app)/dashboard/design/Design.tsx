"use client";

import { useRef, useState } from "react";
import { MenuView } from "@/components/MenuView";
import { PageHead, uploadPhoto, useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { TEMPLATES } from "@/lib/templates";
import type { Lang } from "@/lib/i18n";
import type { MenuDTO } from "@/lib/types";
import { removeImage, setTemplate, updateCafe, uploadImage } from "../actions";

const BRAND = ["#d7261e", "#f26a1b", "#f5b700", "#1f6b35", "#0f5e9c", "#6b2fa3", "#0b0a0a", "#8a4b2a"];

export function Design({ initial }: { initial: MenuDTO }) {
  const { tr, lang } = useTr();
  const { run, toast } = useToast();
  const [menu, setMenu] = useState(initial);
  const [pLang, setPLang] = useState<Lang>(lang);
  const [busy, setBusy] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const cafe = menu.cafe;
  const patch = (f: Partial<MenuDTO["cafe"]>) => setMenu((m) => ({ ...m, cafe: { ...m.cafe, ...f } }));

  const up = async (target: "logo" | "cover", file?: File) => {
    if (!file) return;
    setBusy(target);
    const id = await run(() => uploadPhoto(target, file, uploadImage, target === "cover" ? 1400 : 600));
    setBusy(null);
    if (id) patch(target === "logo" ? { logoId: id } : { coverId: id });
    else toast(tr("That photo could not be used.", "ፎቶውን መጠቀም አልተቻለም።"), { bad: true });
  };
  const color = (key: "brandColor" | "accentColor", v: string | null) => {
    patch({ [key]: v });
    run(() => updateCafe({ [key]: v }));
  };

  return (
    <div className="menu-page">
      <div className="pane stagger">
        <PageHead title={tr("Design", "ዲዛይን")} sub={tr("How your menu, table cards and TV look. Every change shows in the preview first.", "ምናሌዎ፣ የጠረጴዛ ካርዶችዎና ቲቪዎ እንዴት እንደሚታዩ። እያንዳንዱ ለውጥ መጀመሪያ በቅድመ እይታ ይታያል።")} />
        <section className="box">
          <h2>{tr("Board style", "የሰሌዳ ዲዛይን")}</h2>
          <div className="tpls">
            {TEMPLATES.map((tp, i) => (
              <button key={tp.id} type="button" className="tpl" style={{ ["--i" as string]: i }} aria-pressed={cafe.template === tp.id} onClick={() => { patch({ template: tp.id }); run(() => setTemplate(tp.id)); }}>
                <span className={`sw sw-${tp.id}`} style={{ background: tp.id === "wood" ? undefined : tp.swatch[0], color: tp.swatch[2] }}>
                  <i style={{ background: tp.swatch[1] }} /><u /><u /><u />
                </span>
                <span>{lang === "am" ? tp.am : tp.en}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="box">
          <h2>{tr("Your colours", "የእርስዎ ቀለሞች")}</h2>
          <p className="sub">{tr("Optional. Replaces the style's header and price-tag colours with your brand colours.", "አማራጭ። የዲዛይኑን የራስጌና የዋጋ መለያ ቀለሞች በብራንድ ቀለሞችዎ ይተካል።")}</p>
          {(["brandColor", "accentColor"] as const).map((key) => (
            <div key={key} className="color-row">
              <span className="f">{key === "brandColor" ? tr("Main colour", "ዋና ቀለም") : tr("Accent colour", "ተጨማሪ ቀለም")}</span>
              <div className="swatches">
                <button type="button" className={`swatch none${!cafe[key] ? " on" : ""}`} onClick={() => color(key, null)} aria-label={tr("Style default", "የዲዛይኑ")}>∅</button>
                {BRAND.map((c) => (
                  <button key={c} type="button" className={`swatch${cafe[key] === c ? " on" : ""}`} style={{ background: c }} onClick={() => color(key, c)} aria-label={c} />
                ))}
                <label className="swatch custom" aria-label={tr("Custom colour", "ሌላ ቀለም")}>
                  <input type="color" value={cafe[key] ?? "#d7261e"} onChange={(e) => patch({ [key]: e.target.value })} onBlur={(e) => color(key, e.target.value)} />
                </label>
              </div>
            </div>
          ))}
        </section>
        <section className="box">
          <h2>{tr("Logo & cover photo", "አርማና የሽፋን ፎቶ")}</h2>
          <div className="grid2">
            <div className="upload-card">
              <button type="button" className="ph logo-ph" onClick={() => logoRef.current?.click()} disabled={busy === "logo"}>
                {busy === "logo" ? <span className="spin" /> : cafe.logoId ? <img src={`/media/${cafe.logoId}`} alt="" /> : <Icon name="camera" />}
              </button>
              <div>
                <b>{tr("Logo", "አርማ")}</b>
                <p className="hint">{tr("Square works best. Shown on the menu, table cards and TV.", "ካሬ ቢሆን ይመረጣል። በምናሌ፣ በካርዶችና በቲቪ ላይ ይታያል።")}</p>
                {cafe.logoId ? <button className="btn sm" type="button" onClick={() => { patch({ logoId: null }); run(() => removeImage("logo")); }}>{tr("Remove", "አስወግድ")}</button> : null}
              </div>
              <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => { up("logo", e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            <div className="upload-card">
              <button type="button" className="ph cover-ph" onClick={() => coverRef.current?.click()} disabled={busy === "cover"}>
                {busy === "cover" ? <span className="spin" /> : cafe.coverId ? <img src={`/media/${cafe.coverId}`} alt="" /> : <Icon name="camera" />}
              </button>
              <div>
                <b>{tr("Cover photo", "የሽፋን ፎቶ")}</b>
                <p className="hint">{tr("A wide photo of your cafe or a signature dish, at the top of the menu.", "የካፌዎ ወይም የልዩ ምግብዎ ሰፊ ፎቶ፣ በምናሌው አናት ላይ።")}</p>
                {cafe.coverId ? <button className="btn sm" type="button" onClick={() => { patch({ coverId: null }); run(() => removeImage("cover")); }}>{tr("Remove", "አስወግድ")}</button> : null}
              </div>
              <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { up("cover", e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          </div>
        </section>
      </div>
      <aside className="preview-col">
        <div className="phone float-in" key={cafe.template}>
          <div className="notch" />
          <div className="scr">
            <MenuView cafe={cafe} categories={menu.categories} lang={pLang} fastOnly={false} controls={{ kind: "buttons", onLang: setPLang, onFast: () => {} }} />
          </div>
        </div>
      </aside>
    </div>
  );
}
