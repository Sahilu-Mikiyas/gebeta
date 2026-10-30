"use client";

import { useActionState } from "react";
import Link from "next/link";
import { t, type Lang } from "@/lib/i18n";
import { login, signup, type AuthState } from "./auth-actions";

export function AuthForm({ mode, lang }: { mode: "login" | "signup"; lang: Lang }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);
  const isSignup = mode === "signup";
  return (
    <div className="auth-card">
      <div className="auth-top">
        <Link className="brand" href="/" aria-label="Gebeta">
          <b>GEBETA</b>
          <span>ገበታ</span>
        </Link>
        <a className="langlink" href={`/lang?to=${lang === "am" ? "en" : "am"}&back=/${mode}`}>
          {lang === "am" ? "English" : "አማርኛ"}
        </a>
      </div>
      <h1 className="title">{t(lang, isSignup ? "signupTitle" : "loginTitle")}</h1>
      <p>{t(lang, isSignup ? "signupSub" : "loginSub")}</p>
      {state?.error ? (
        <p className="err" role="alert">
          {t(lang, state.error)}
        </p>
      ) : null}
      <form action={action}>
        {isSignup ? (
          <label className="f" htmlFor="name">
            {t(lang, "yourName")}
            <input className="inp" id="name" name="name" autoComplete="name" required defaultValue={state?.name ?? ""} />
          </label>
        ) : null}
        <label className="f" htmlFor="phone">
          {t(lang, "phone")}
          <input className="inp" id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0911 23 45 67" required defaultValue={state?.phone ?? ""} />
          <small>{t(lang, "phoneHint")}</small>
        </label>
        <label className="f" htmlFor="password">
          {t(lang, "password")}
          <input className="inp" id="password" name="password" type="password" autoComplete={isSignup ? "new-password" : "current-password"} minLength={isSignup ? 8 : undefined} required />
          {isSignup ? <small>{t(lang, "passwordHint")}</small> : null}
        </label>
        <button className="btn red" type="submit" disabled={pending}>
          {t(lang, isSignup ? "signup" : "login")}
        </button>
      </form>
      <p>
        {t(lang, isSignup ? "haveAccount" : "noAccount")}{" "}
        <Link href={isSignup ? "/login" : "/signup"}>{t(lang, isSignup ? "login" : "signup")}</Link>
      </p>
    </div>
  );
}
