"use client";

import { useActionState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { createCafe, type CreateCafeState } from "./actions";

export function Onboarding({ lang, ownerName }: { lang: Lang; ownerName: string }) {
  const [state, action, pending] = useActionState<CreateCafeState, FormData>(createCafe, undefined);
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-top">
          <span className="label">{ownerName}</span>
          <a className="langlink" href={`/lang?to=${lang === "am" ? "en" : "am"}&back=/dashboard`}>
            {lang === "am" ? "English" : "አማርኛ"}
          </a>
        </div>
        <h1 className="title">{t(lang, "onbTitle")}</h1>
        <p>{t(lang, "onbSub")}</p>
        {state?.error ? (
          <p className="err" role="alert">
            {t(lang, state.error)}
          </p>
        ) : null}
        <form action={action}>
          <label className="f" htmlFor="nameEn">
            {t(lang, "cafeNameEn")}
            <input className="inp" id="nameEn" name="nameEn" required minLength={2} maxLength={80} placeholder="Selam Buna House" />
          </label>
          <label className="f" htmlFor="nameAm">
            {t(lang, "cafeNameAm")} · {t(lang, "optional")}
            <input className="inp am" id="nameAm" name="nameAm" maxLength={80} placeholder="ሰላም ቡና ቤት" />
          </label>
          <label className="f" htmlFor="area">
            {t(lang, "area")} · {t(lang, "optional")}
            <input className="inp" id="area" name="area" maxLength={80} placeholder={t(lang, "areaPh")} />
          </label>
          <label className="check" htmlFor="starter">
            <input type="checkbox" id="starter" name="starter" defaultChecked />
            <span>{t(lang, "starter")}</span>
          </label>
          <button className="btn red" type="submit" disabled={pending}>
            {t(lang, "createMenu")}
          </button>
        </form>
      </div>
    </main>
  );
}
