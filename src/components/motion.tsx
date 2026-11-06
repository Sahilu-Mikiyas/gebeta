"use client";

import { AnimatePresence, LazyMotion, MotionConfig, domMax, useInView, useReducedMotion, type Transition } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState, type ReactNode } from "react";

export { m, AnimatePresence };
export { LayoutGroup } from "motion/react";

export const spring: Transition = { type: "spring", stiffness: 420, damping: 32, mass: 0.8 };
export const soft: Transition = { type: "spring", stiffness: 220, damping: 26 };
export const bouncy: Transition = { type: "spring", stiffness: 520, damping: 18 };

// Loads the animation engine once and honours the phone's "reduce motion" setting.
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user" transition={spring}>
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}

// Slides content up into place the first time it scrolls into view.
export function Reveal({ children, delay = 0, y = 26, className, as = "div" }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "section" | "li" }) {
  const C = m[as];
  return (
    <C className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -8% 0px" }} transition={{ ...soft, delay }}>
      {children}
    </C>
  );
}

// Big poster words that rise letter by letter.
export function SplitTitle({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const words = text.split(" ");
  let i = 0;
  return (
    <span className={className} aria-label={text}>
      {words.map((w, wi) => [
        wi > 0 ? " " : null,
        <span key={wi} className="split-word" aria-hidden="true">
          {[...w].map((ch) => {
            const d = delay + i++ * 0.028;
            return (
              <m.span key={i} className="split-ch" initial={{ y: "110%", rotate: 8, opacity: 0 }} animate={{ y: "0%", rotate: 0, opacity: 1 }} transition={{ ...bouncy, delay: d }}>
                {ch}
              </m.span>
            );
          })}
        </span>,
      ])}
    </span>
  );
}

// A number that rolls to its new value, like a departure board.
export function RollNumber({ value, className }: { value: number; className?: string }) {
  return (
    <span className={`roll ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span key={value} initial={{ y: "-100%", opacity: 0 }} animate={{ y: "0%", opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={bouncy}>
          {value.toLocaleString("en-US")}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

// Counts up from zero when it scrolls into view.
export function CountIn({ value, ms = 1100 }: { value: number; ms?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduce) return setN(value);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setN(Math.round(value * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [seen, value, ms, reduce]);
  return <span ref={ref}>{n.toLocaleString("en-US")}</span>;
}

// A tick that draws itself.
export function CheckDraw({ size = 96, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" fill="none" aria-hidden="true">
      <m.circle cx="26" cy="26" r="23" stroke={color} strokeWidth="4" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55, ease: "easeOut" }} />
      <m.path d="M15 27l7 7 15-16" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }} />
    </svg>
  );
}

// Sparkline that draws in when it appears.
export function Sparkline({ values, width = 120, height = 36, color = "currentColor" }: { values: number[]; width?: number; height?: number; color?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => [i * step, height - 3 - (v / max) * (height - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="spark" aria-hidden="true">
      <m.path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.1, ease: "easeInOut" }} />
      <m.circle cx={last[0]} cy={last[1]} r="4" fill={color} initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ ...bouncy, delay: 1 }} />
    </svg>
  );
}

// Confetti in the menu's colours. Loaded only when needed.
export async function burst(opts: { x?: number; y?: number; colors?: string[]; count?: number } = {}) {
  if (typeof window === "undefined" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const confetti = (await import("canvas-confetti")).default;
  const base = { origin: { x: opts.x ?? 0.5, y: opts.y ?? 0.55 }, colors: opts.colors ?? ["#d7261e", "#f5b700", "#1f6b35", "#ffffff"], disableForReducedMotion: true, zIndex: 9999 };
  confetti({ ...base, particleCount: opts.count ?? 90, spread: 75, startVelocity: 42, scalar: 1 });
  setTimeout(() => confetti({ ...base, particleCount: Math.round((opts.count ?? 90) / 2), spread: 110, startVelocity: 30, scalar: 0.8 }), 160);
}

// Sends a small copy of an image flying from one element to another (e.g. into the cart).
export function flyTo(from: Element | null, to: Element | null, imgSrc?: string | null) {
  if (!from || !to || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "fly-dot";
  if (imgSrc) el.style.backgroundImage = `url(${imgSrc})`;
  el.style.left = `${a.left + a.width / 2 - 22}px`;
  el.style.top = `${a.top + a.height / 2 - 22}px`;
  document.body.appendChild(el);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  el.animate(
    [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 140}px) scale(1.15)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(.25)`, opacity: 0.6 },
    ],
    { duration: 720, easing: "cubic-bezier(.5,0,.75,1)" },
  ).onfinish = () => el.remove();
}
