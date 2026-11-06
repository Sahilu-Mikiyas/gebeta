"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { AnimatePresence, SplitTitle, bouncy, m } from "./motion";

// ---------- language ----------

const LangCtx = createContext<Lang>("en");
export const LangProvider = ({ lang, children }: { lang: Lang; children: ReactNode }) => <LangCtx.Provider value={lang}>{children}</LangCtx.Provider>;
export function useTr() {
  const lang = useContext(LangCtx);
  return { lang, tr: (en: string, am: string) => (lang === "am" ? am : en) };
}

// ---------- toasts & save status ----------

type Toast = { id: number; msg: string; bad?: boolean; action?: { label: string; run: () => void } };
type Status = "idle" | "saving" | "saved" | "error";
const ToastCtx = createContext<{
  toast: (msg: string, opts?: { bad?: boolean; action?: Toast["action"] }) => void;
  run: <R>(fn: () => Promise<R>) => Promise<R | undefined>;
  status: Status;
}>({ toast: () => {}, run: async () => undefined, status: "idle" });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const inFlight = useRef(0);
  const failed = useRef(false);
  const { tr } = useTr();

  const toast = useCallback((msg: string, opts: { bad?: boolean; action?: Toast["action"] } = {}) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts.action ? 6000 : 3200);
  }, []);

  // Runs a server action, drives the save indicator and shows a toast on failure.
  const run = useCallback(
    async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
      inFlight.current++;
      setStatus("saving");
      try {
        const r = await fn();
        failed.current = false;
        return r;
      } catch (e) {
        failed.current = true;
        const m = e instanceof Error ? e.message : "";
        if (m.startsWith("PLAN_")) toast(tr("That needs a paid plan. See Shop & plan.", "ይህ የሚከፈልበት ጥቅል ያስፈልገዋል። ሱቅና ጥቅልን ይመልከቱ።"), { bad: true });
        else toast(tr("Could not save. Check your connection and try again.", "ማስቀመጥ አልተቻለም። ኢንተርኔትዎን አረጋግጠው እንደገና ይሞክሩ።"), { bad: true });
        return undefined;
      } finally {
        inFlight.current--;
        if (inFlight.current === 0) setStatus(failed.current ? "error" : "saved");
      }
    },
    [toast, tr],
  );

  return (
    <ToastCtx.Provider value={{ toast, run, status }}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <m.div key={t.id} layout className={`toast${t.bad ? " bad" : ""}`} role="status" initial={{ opacity: 0, y: 40, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 80, transition: { duration: 0.2 } }} transition={bouncy}>
            <span>{t.msg}</span>
            {t.action ? (
              <button type="button" onClick={() => { t.action!.run(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>
                {t.action.label}
              </button>
            ) : null}
          </m.div>
        ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

// ---------- inputs ----------

// Text input that updates live on every keystroke and saves once, on blur or Enter.
export function Field({
  value,
  onLive,
  onCommit,
  required,
  ...rest
}: { value: string; onLive: (v: string) => void; onCommit: (v: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const start = useRef(value);
  return (
    <input
      {...rest}
      value={value}
      onFocus={() => {
        start.current = value;
      }}
      onChange={(e) => onLive(e.target.value)}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (required && !v) return onLive(start.current);
        if (v !== start.current) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

export function PriceField({ value, onLive, onCommit, label, className = "inp num" }: { value: number; onLive?: (n: number) => void; onCommit: (n: number) => void; label: string; className?: string }) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);
  const start = useRef(value);
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);
  return (
    <input
      className={className}
      inputMode="numeric"
      aria-label={label}
      value={draft}
      onFocus={(e) => {
        focused.current = true;
        start.current = value;
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 7);
        setDraft(v);
        if (v) onLive?.(parseInt(v, 10));
      }}
      onBlur={() => {
        focused.current = false;
        const n = parseInt(draft, 10);
        if (!draft || isNaN(n)) {
          setDraft(String(start.current));
          onLive?.(start.current);
        } else if (n !== start.current) onCommit(n);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

export function Toggle({ checked, onChange, label, tone = "green", big }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; tone?: "green" | "red"; big?: boolean }) {
  return (
    <label className={`tgl ${tone}${big ? " big" : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" aria-hidden="true">
        <span className="knob" />
      </span>
      <span className="lbl">{label}</span>
    </label>
  );
}

// Two-step delete: the first tap arms the button for 3 seconds.
export function ConfirmButton({ label, confirmLabel, onConfirm, className = "btn sm" }: { label: ReactNode; confirmLabel: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      className={`${className} danger${armed ? " armed" : ""}`}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

// Counts up to a number when it first appears.
export function CountUp({ value, ms = 900 }: { value: number; ms?: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setN(value);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return <>{n.toLocaleString("en-US")}</>;
}

// ---------- photos ----------

// Shrink photos in the browser before upload: max 1000px, WebP (JPEG where WebP encoding is missing).
export async function resizeImage(file: File, max = 1000): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const encode = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  let blob = await encode("image/webp", 0.8);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.82);
  if (blob && blob.size > 580 * 1024) blob = await encode("image/jpeg", 0.6);
  if (!blob) throw new Error("Could not encode image");
  return blob;
}

export async function uploadPhoto(target: string, file: File, upload: (fd: FormData) => Promise<{ ok: true; imageId: string } | { ok: false }>, max?: number) {
  if (file.size > 15 * 1024 * 1024) return null;
  const blob = await resizeImage(file, max);
  const fd = new FormData();
  fd.append("target", target);
  fd.append("file", new File([blob], "photo", { type: blob.type }));
  const r = await upload(fd);
  return r.ok ? r.imageId : null;
}

// ---------- layout bits ----------

export function PageHead({ title, sub, kicker, children }: { title: ReactNode; sub?: ReactNode; kicker?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        {kicker ? <m.span className="kicker" initial={{ opacity: 0, x: -20, rotate: -3 }} animate={{ opacity: 1, x: 0, rotate: -1.5 }} transition={bouncy}>{kicker}</m.span> : null}
        <h1>{typeof title === "string" ? <SplitTitle text={title} /> : title}</h1>
        {sub ? <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>{sub}</m.p> : null}
      </div>
      {children ? <div className="page-actions">{children}</div> : null}
    </header>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open ? (
    <m.div className="sheet-wrap" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <m.div className="sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} initial={{ y: 80, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 60, opacity: 0, scale: 0.97 }} transition={bouncy}>
        <div className="sheet-h">
          <h3>{title}</h3>
          <button type="button" className="x" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sheet-b">{children}</div>
      </m.div>
    </m.div>
      ) : null}
    </AnimatePresence>
  );
}
