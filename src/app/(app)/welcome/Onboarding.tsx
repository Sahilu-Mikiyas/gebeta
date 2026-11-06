"use client";

import { useActionState, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { createCafe, type CreateCafeState } from "../dashboard/actions";

const TYPES = [
  { id: "coffee", en: "Coffee house", am: "ቡና ቤት", photo: "macchiato" },
  { id: "juice", en: "Juice & pastry", am: "ጭማቂና ኬክ", photo: "spris" },
  { id: "restaurant", en: "Restaurant", am: "ምግብ ቤት", photo: "beyaynetu" },
  { id: "lounge", en: "Lounge & bar", am: "ላውንጅና ባር", photo: "burger" },
  { id: "none", en: "Start empty", am: "ባዶ ጀምር", photo: "" },
];

export function Onboarding({ lang, ownerName }: { lang: Lang; ownerName: string }) {
  const [state, action, pending] = useActionState<CreateCafeState, FormData>(createCafe, undefined);
  const [type, setType] = useState("coffee");
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  return (
    <main className="auth">
      <div className="auth-card wide rise-in">
        <div className="auth-top">
          <span className="label">{tr(`Welcome, ${ownerName}`, `እንኳን ደህና መጡ፣ ${ownerName}`)}</span>
          <a className="langlink" href={`/lang?to=${lang === "am" ? "en" : "am"}&back=/welcome`}>
            {lang === "am" ? "English" : "አማርኛ"}
          </a>
        </div>
        <h1 className="title">{t(lang, "onbTitle")}</h1>
        <p>{t(lang, "onbSub")}</p>
        {state?.error ? (
          <p className="err shake" role="alert">
            {t(lang, state.error)}
          </p>
        ) : null}
        <form action={action}>
          <div className="grid2">
            <label className="f" htmlFor="nameEn">
              {t(lang, "cafeNameEn")}
              <input className="inp" id="nameEn" name="nameEn" required minLength={2} maxLength={80} placeholder="Selam Buna House" />
            </label>
            <label className="f" htmlFor="nameAm">
              {t(lang, "cafeNameAm")} · {t(lang, "optional")}
              <input className="inp am" id="nameAm" name="nameAm" maxLength={80} placeholder="ሰላም ቡና ቤት" />
            </label>
          </div>
          <label className="f" htmlFor="area">
            {t(lang, "area")} · {t(lang, "optional")}
            <input className="inp" id="area" name="area" maxLength={80} placeholder={t(lang, "areaPh")} />
          </label>
          <fieldset className="types">
            <legend className="f">{tr("What kind of place is it? We'll fill in a starter menu.", "ምን አይነት ቦታ ነው? የመጀመሪያ ምናሌ እናዘጋጃለን።")}</legend>
            {TYPES.map((x, i) => (
              <label key={x.id} className={`type${type === x.id ? " on" : ""}`} style={{ ["--i" as string]: i }}>
                <input type="radio" name="starter" value={x.id} checked={type === x.id} onChange={() => setType(x.id)} />
                {x.photo ? <img src={`/library/${x.photo}.webp`} alt="" /> : <span className="ic" aria-hidden="true">+</span>}
                <span>{tr(x.en, x.am)}</span>
              </label>
            ))}
          </fieldset>
          <button className="btn red big" type="submit" disabled={pending}>
            {pending ? tr("Setting up…", "በማዘጋጀት ላይ…") : t(lang, "createMenu")} →
          </button>
        </form>
      </div>
    </main>
  );
}
