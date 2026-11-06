"use client";

import { useActionState, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { acceptInvite, type AuthState } from "../../auth-actions";

export function InviteForm({ token, lang, cafe, role, signedIn }: { token: string; lang: Lang; cafe: string | null; role: string; signedIn: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(acceptInvite.bind(null, token), undefined);
  const [hasAccount, setHasAccount] = useState(false);
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  if (!cafe) return <div className="auth-card rise-in"><h1 className="title">{tr("Invite not valid", "ግብዣው አይሠራም")}</h1><p>{t(lang, "err_invite")}</p></div>;
  return (
    <div className="auth-card rise-in">
      <span className="label">{role === "manager" ? tr("Manager invite", "የሥራ አስኪያጅ ግብዣ") : tr("Staff invite", "የሠራተኛ ግብዣ")}</span>
      <h1 className="title">{tr(`Join ${cafe}`, `${cafe}ን ይቀላቀሉ`)}</h1>
      {state?.error ? <p className="err shake" role="alert">{t(lang, state.error)}</p> : null}
      <form action={action}>
        {signedIn ? null : (
          <>
            <div className="seg">
              <button type="button" aria-pressed={!hasAccount} onClick={() => setHasAccount(false)}>{tr("I'm new", "አዲስ ነኝ")}</button>
              <button type="button" aria-pressed={hasAccount} onClick={() => setHasAccount(true)}>{tr("I have an account", "አካውንት አለኝ")}</button>
            </div>
            {!hasAccount ? <label className="f">{t(lang, "yourName")}<input className="inp" name="name" required autoComplete="name" defaultValue={state?.name ?? ""} /></label> : null}
            <label className="f">{t(lang, "phone")}<input className="inp" name="phone" type="tel" required placeholder="0911 23 45 67" defaultValue={state?.phone ?? ""} /></label>
            <label className="f">{t(lang, "password")}<input className="inp" name="password" type="password" required minLength={hasAccount ? undefined : 8} autoComplete={hasAccount ? "current-password" : "new-password"} /></label>
          </>
        )}
        <button className="btn red big" type="submit" disabled={pending}>{tr("Join the team", "ቡድኑን ተቀላቀል")} →</button>
      </form>
    </div>
  );
}
