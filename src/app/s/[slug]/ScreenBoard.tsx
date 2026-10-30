"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildSlides, type Slide } from "@/lib/screen";
import { formatBirr } from "@/lib/menu";
import type { MenuDTO } from "@/lib/types";

const POLL_MS = 30_000;

export function ScreenBoard({ initial, slug, embed }: { initial: MenuDTO; slug: string; embed: boolean }) {
  const [menu, setMenu] = useState(initial);
  const [index, setIndex] = useState(0);
  const [wiping, setWiping] = useState(false);
  const [hint, setHint] = useState(!embed);
  const slides = useMemo(() => buildSlides(menu.categories), [menu.categories]);
  const seconds = Math.max(5, menu.cafe.screenSeconds || 10);
  const slide = slides.length ? slides[index % slides.length] : null;

  // Pick up menu changes from the dashboard.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/s/${slug}/data`, { cache: "no-store" });
        if (res.ok) setMenu(await res.json());
      } catch {
        // Offline for a moment: keep showing the last menu.
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [slug]);

  // Rotate boards with a wipe. The board swaps while the wipe covers the screen.
  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => {
      setWiping(true);
      setTimeout(() => setIndex((i) => (i + 1) % slides.length), 520);
      setTimeout(() => setWiping(false), 1100);
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [slides.length, seconds]);

  // Keep the TV from dimming, and hide the mouse pointer when idle.
  const lock = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    if (embed) return;
    const request = async () => {
      try {
        lock.current = await navigator.wakeLock?.request("screen");
      } catch {
        // Not supported or not allowed; the TV's own settings decide.
      }
    };
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock.current?.release().catch(() => {});
    };
  }, [embed]);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(false), 8000);
    return () => clearTimeout(id);
  }, [hint]);

  const goFull = () => {
    setHint(false);
    if (!embed && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <main className={`scr-root${embed ? " embed" : ""}`} onClick={goFull}>
      <div className="scr-stage" data-t={menu.cafe.template}>
        {slide ? (
          <Board key={slide.key + index} slide={slide} menu={menu} seconds={seconds} animate={slides.length > 1} />
        ) : (
          <div className="scr-empty">
            <b>{menu.cafe.nameEn}</b>
            <span>Menu coming soon · ምናሌው በቅርቡ</span>
          </div>
        )}
        <div className={`scr-wipe${wiping ? " go" : ""}`} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
      {hint ? <div className="scr-hint">Tap the screen for full screen · ሙሉ ስክሪን ለማድረግ ይንኩ</div> : null}
    </main>
  );
}

function Board({ slide, menu, seconds, animate }: { slide: Slide; menu: MenuDTO; seconds: number; animate: boolean }) {
  const { cafe } = menu;
  const mode = cafe.screenLang;
  const nameOf = (en: string, am: string) => (mode === "am" && am.trim() ? am : en);
  const second = (en: string, am: string) => (mode === "both" && am.trim() ? am : "");
  const cafeWords = nameOf(cafe.nameEn, cafe.nameAm).trim().split(/\s+/);
  const dense = slide.items.length > 6;
  const f = slide.feature;
  const catAm = slide.category.nameAm.trim();

  return (
    <div className={`scr-board${dense ? " dense" : slide.items.length <= 4 ? " roomy" : ""}`} lang={mode === "am" ? "am" : "en"}>
      <section className="scr-list">
        <h2 className="scr-pill">
          {nameOf(slide.category.nameEn, slide.category.nameAm)}
          {mode === "both" && catAm ? <span> · {catAm}</span> : null}
          {slide.pages > 1 ? <small>{` ${slide.page}/${slide.pages}`}</small> : null}
        </h2>
        {slide.items.map((i) => {
          const desc = mode === "am" && i.descAm.trim() ? i.descAm : i.descEn;
          const sub = second(i.nameEn, i.nameAm);
          return (
            <div key={i.id} className={`scr-it${i.soldOut ? " out" : ""}`}>
              <div className="leader">
                <span className="nm">
                  <span className="nm-t">{nameOf(i.nameEn, i.nameAm)}</span>
                  {sub ? <span className="nm-am">{sub}</span> : null}
                  {i.fasting ? <span className="tg fast">{mode === "en" ? "Fasting" : "ጾም"}</span> : null}
                  {i.soldOut ? <span className="tg out">{mode === "am" ? "አልቋል" : "Sold out"}</span> : null}
                </span>
                <i className="dots" />
                <span className="price">{formatBirr(i.price)}</span>
              </div>
              {!dense && desc ? <p>{desc}</p> : null}
            </div>
          );
        })}
      </section>

      <section className="scr-side">
        <div className="scr-tab">
          {cafe.logoId ? <img src={`/media/${cafe.logoId}`} alt="" /> : null}
          <b>{cafeWords[0]}</b>
          {cafeWords.length > 1 ? <span>{cafeWords.slice(1).join(" ")}</span> : null}
          {cafe.area ? <em>{cafe.area}</em> : null}
        </div>
        {f ? (
          <figure className="scr-feature">
            <img src={`/media/${f.imageId}`} alt="" />
            <figcaption>
              {nameOf(f.nameEn, f.nameAm)} · {formatBirr(f.price)} {mode === "en" ? "birr" : "ብር"}
            </figcaption>
          </figure>
        ) : (
          <div className="scr-big" aria-hidden="true">
            {catAm && mode !== "en" ? catAm : slide.category.nameEn}
          </div>
        )}
      </section>

      <footer className="scr-band">
        <span>{mode === "am" ? "ዋጋዎቹ በብር · ተ.እ.ታን ያካትታሉ" : "Prices in birr · VAT included"}</span>
        <span>{mode === "en" ? "Scan the QR on your table for the full menu" : mode === "am" ? "ሙሉውን ምናሌ ለማየት በጠረጴዛዎ ያለውን QR ይቃኙ" : "Scan the QR on your table · በጠረጴዛዎ ያለውን QR ይቃኙ"}</span>
        {animate ? <i className="scr-progress" style={{ animationDuration: `${seconds}s` }} /> : null}
      </footer>
    </div>
  );
}
