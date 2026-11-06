"use client";

import Link from "next/link";
import { useActionState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { resetPassword, type ResetState } from "../auth-actions";

export function ForgotForm({ lang, bot }: { lang: Lang; bot: boolean }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, undefined);
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const step = state?.step ?? "phone";
  return (
    <div className="auth-card rise-in">
      <h1 className="title">{tr("Forgot your password?", "የይለፍ ቃልዎን ረሱ?")}</h1>
      <p>{bot ? tr("If your account is connected to Telegram, the Gebeta bot sends you a reset code. Otherwise call Gebeta support and we'll give you one.", "አካውንትዎ ከቴሌግራም ጋር ከተገናኘ የገበታ ቦት የመቀየሪያ ኮድ ይልክልዎታል። ካልሆነ የገበታ ድጋፍን ይደውሉ፤ ኮድ እንሰጥዎታለን።") : tr("Call Gebeta support and we'll give you a reset code.", "የገበታ ድጋፍን ይደውሉ፤ የመቀየሪያ ኮድ እንሰጥዎታለን።")}</p>
      {state?.error ? <p className="err shake" role="alert">{t(lang, state.error)}</p> : null}
      <form action={action}>
        <label className="f">{t(lang, "phone")}<input className="inp" name="phone" type="tel" required placeholder="0911 23 45 67" defaultValue={state?.phone ?? ""} readOnly={step === "code"} /></label>
        {step === "code" ? (
          <>
            <p className="ok pop-in">{tr("If that number has Telegram connected, a 6-digit code is on its way. You can also use a code from support.", "ቁጥሩ ከቴሌግራም ጋር ከተገናኘ ባለ 6 አሃዝ ኮድ እየመጣ ነው። ከድጋፍ የተሰጠ ኮድም መጠቀም ይችላሉ።")}</p>
            <label className="f">{tr("Code", "ኮድ")}<input className="inp code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required /></label>
            <label className="f">{tr("New password", "አዲስ የይለፍ ቃል")}<input className="inp" name="password" type="password" minLength={8} required autoComplete="new-password" /></label>
          </>
        ) : null}
        <button className="btn red" type="submit" disabled={pending}>{step === "code" ? tr("Set new password", "አዲስ የይለፍ ቃል አስቀምጥ") : tr("Send me a code", "ኮድ ላክልኝ")}</button>
      </form>
      <p><Link href="/login">← {tr("Back to log in", "ወደ መግቢያ ተመለስ")}</Link></p>
    </div>
  );
}
