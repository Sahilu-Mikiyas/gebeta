"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useScroll, useTransform } from "motion/react";
import { AnimatePresence, RollNumber, SplitTitle, bouncy, m, soft } from "./motion";
import { t, pick, type Lang } from "@/lib/i18n";
import { formatBirr } from "@/lib/menu";
import { minutesToHHMM } from "@/lib/pricing";
import type { CafeDTO, CategoryDTO, ItemDTO } from "@/lib/types";

type Controls =
  | { kind: "links"; en: string; am: string; fastToggle: string }
  | { kind: "buttons"; onLang: (l: Lang) => void; onFast: () => void };

type Props = {
  cafe: CafeDTO;
  categories: CategoryDTO[];
  lang: Lang;
  fastOnly: boolean;
  controls: Controls;
  showJumpNav?: boolean;
  query?: string;
  onItem?: (item: ItemDTO) => void; // makes items tappable (public menu)
  inCart?: Record<string, number>; // quantity badge per item
  extra?: ReactNode;
  footer?: ReactNode;
  live?: boolean; // public page: parallax, scroll-spy and shared photo transitions
};

const TAG_LABEL: Record<string, [string, string]> = { new: ["New", "አዲስ"], chef: ["Chef's pick", "የሼፍ ምርጫ"], spicy: ["Spicy", "ቅመም"], vegan: ["Vegan", "ቪጋን"] };

// The customer-facing menu, used by the public page and every live preview in the dashboard.
export function MenuView({ cafe, categories, lang, fastOnly, controls, showJumpNav, query, onItem, inCart, extra, footer, live }: Props) {
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const name = pick(lang, cafe.nameEn, cafe.nameAm) || "Your cafe";
  const words = name.trim().split(/\s+/);
  const hours = pick(lang, cafe.hoursEn, cafe.hoursAm);
  const meta = [hours, cafe.area].filter(Boolean).join(" · ");
  const q = (query ?? "").trim().toLowerCase();

  const sections = categories
    .map((c) => ({ ...c, items: c.items.filter((i) => (!fastOnly || i.fasting) && (!q || `${i.nameEn} ${i.nameAm} ${i.descEn}`.toLowerCase().includes(q))) }))
    .filter((c) => c.items.length > 0)
    .map((c) => (cafe.fastingNow ? { ...c, items: [...c.items].sort((a, b) => Number(b.fasting) - Number(a.fasting)) } : c));

  const style = { ...(cafe.brandColor ? { ["--pill" as string]: cafe.brandColor } : {}), ...(cafe.accentColor ? { ["--acc" as string]: cafe.accentColor } : {}) } as CSSProperties;

  // Scroll-spy: highlight the section being read in the sticky bar.
  const [active, setActive] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!live) return;
    const els = sections.map((s) => document.getElementById(`c-${s.id}`)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActive(top.target.id.slice(2));
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [live, sections.map((s) => s.id).join()]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!active || !navRef.current) return;
    const a = navRef.current.querySelector<HTMLElement>(`[data-sec="${active}"]`);
    a?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  const chip = (label: string, on: boolean, key: string, hrefOrClick: string | (() => void)) =>
    typeof hrefOrClick === "string" ? (
      <a key={key} className={`pm-chip${on ? " on" : ""}`} href={hrefOrClick} rel="nofollow">{label}</a>
    ) : (
      <m.button key={key} type="button" className={`pm-chip${on ? " on" : ""}`} onClick={hrefOrClick} whileTap={{ scale: 0.9 }} layout transition={bouncy}>
        {label}
      </m.button>
    );
  const c = controls;

  return (
    <div className={`pm${cafe.coverId ? " has-cover" : ""}${live ? " live" : ""}`} data-t={cafe.template} lang={lang} style={style}>
      {cafe.coverId ? <Cover id={cafe.coverId} live={!!live} /> : null}
      <m.header className="pm-tab" initial={{ y: -140, rotate: -4 }} animate={{ y: 0, rotate: 0 }} transition={{ ...bouncy, delay: 0.05 }}>
        {cafe.logoId ? <m.img className="pm-logo" src={`/media/${cafe.logoId}`} alt="" width={56} height={56} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ ...bouncy, delay: 0.35 }} /> : null}
        <small>{t(lang, "welcomeTo")}</small>
        <b key={`n-${lang}-${words[0]}`}>{live ? <SplitTitle text={words[0]} delay={0.25} /> : words[0]}</b>
        {words.length > 1 ? (
          <m.span initial={{ opacity: 0, scale: 0.6, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ ...bouncy, delay: 0.55 }}>
            {words.slice(1).join(" ")}
          </m.span>
        ) : null}
      </m.header>
      {meta ? <m.p className="pm-meta" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...soft, delay: 0.5 }}>{meta}</m.p> : null}

      <m.nav className="pm-chips" aria-label="Menu options" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...soft, delay: 0.6 }}>
        {chip("EN", lang === "en", "en", c.kind === "links" ? c.en : () => c.onLang("en"))}
        {chip("አማ", lang === "am", "am", c.kind === "links" ? c.am : () => c.onLang("am"))}
        {chip(t(lang, "fastingOnly"), fastOnly, "fast", c.kind === "links" ? c.fastToggle : c.onFast)}
      </m.nav>

      {cafe.fastingNow ? (
        <m.p className="pm-fast-banner" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...bouncy, delay: 0.7 }}>
          <b>{pick(lang, cafe.fastingNow.en, cafe.fastingNow.am)}</b> · {tr("fasting dishes are listed first", "የጾም ምግቦች ቀድመው ተዘርዝረዋል")}
        </m.p>
      ) : null}

      {extra}

      {showJumpNav && sections.length > 1 ? (
        <nav className="pm-jump" aria-label="Sections" ref={navRef}>
          {sections.map((s) => (
            <a key={s.id} href={`#c-${s.id}`} data-sec={s.id} className={active === s.id ? "on" : ""} onClick={() => setActive(s.id)}>
              {active === s.id ? <m.i className="pm-jump-pill" layoutId="jump-pill" transition={bouncy} /> : null}
              <span>{pick(lang, s.nameEn, s.nameAm)}</span>
            </a>
          ))}
        </nav>
      ) : null}

      <AnimatePresence mode="popLayout" initial={false}>
        {sections.length === 0 ? (
          <m.p key="empty" className="pm-empty" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            {q ? tr("Nothing matches your search.", "የሚመሳሰል ነገር አልተገኘም።") : fastOnly ? t(lang, "noFasting") : t(lang, "menuEmpty")}
          </m.p>
        ) : null}
      </AnimatePresence>

      {sections.map((s) => (
        <section key={s.id} id={`c-${s.id}`} className={`pm-sec${s.availableNow ? "" : " later"}`}>
          <m.h2 className="pm-pill" initial={{ opacity: 0, x: -40, rotate: -6 }} whileInView={{ opacity: 1, x: 0, rotate: 0 }} viewport={{ once: true, margin: "0px 0px -10% 0px" }} transition={bouncy}>
            {pick(lang, s.nameEn, s.nameAm)}
          </m.h2>
          {!s.availableNow && s.fromMin != null ? (
            <p className="pm-later">{tr(`Served ${minutesToHHMM(s.fromMin)}–${minutesToHHMM(s.toMin!)}`, `የሚቀርበው ${minutesToHHMM(s.fromMin)}–${minutesToHHMM(s.toMin!)}`)}</p>
          ) : null}
          <AnimatePresence initial={false} mode="popLayout">
            {s.items.map((i, idx) => (
              <ItemCard key={i.id} item={i} idx={idx} lang={lang} onItem={onItem} qty={inCart?.[i.id] ?? 0} live={!!live} />
            ))}
          </AnimatePresence>
        </section>
      ))}

      {cafe.wifiName ? (
        <m.div className="pm-wifi" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={soft}>
          <m.span className="pm-wifi-ic" aria-hidden="true" initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={{ once: true }} transition={{ ...bouncy, delay: 0.15 }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.3a5 5 0 0 1 7 0M12 20h.1" /></svg>
          </m.span>
          <div>
            <small>Wi-Fi</small>
            <b>{cafe.wifiName}</b>
            {cafe.wifiPass ? <WifiPass pass={cafe.wifiPass} lang={lang} /> : null}
          </div>
        </m.div>
      ) : null}

      {cafe.phone || cafe.mapUrl || cafe.instagram || cafe.tiktok || cafe.telegram || cafe.facebook ? (
        <div className="pm-contact">
          {[
            cafe.phone ? { href: `tel:${cafe.phone.replace(/\s+/g, "")}`, label: cafe.phone } : null,
            cafe.mapUrl ? { href: cafe.mapUrl, label: tr("Map", "ካርታ") } : null,
            cafe.instagram ? { href: `https://instagram.com/${cafe.instagram.replace(/^@/, "")}`, label: "Instagram" } : null,
            cafe.tiktok ? { href: `https://tiktok.com/@${cafe.tiktok.replace(/^@/, "")}`, label: "TikTok" } : null,
            cafe.telegram ? { href: `https://t.me/${cafe.telegram.replace(/^@/, "")}`, label: "Telegram" } : null,
            cafe.facebook ? { href: cafe.facebook.startsWith("http") ? cafe.facebook : `https://facebook.com/${cafe.facebook}`, label: "Facebook" } : null,
          ]
            .filter(Boolean)
            .map((l, k) => (
              <m.a key={l!.label} href={l!.href} target={l!.href.startsWith("tel:") ? undefined : "_blank"} rel="noreferrer" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ ...soft, delay: k * 0.06 }} whileTap={{ scale: 0.92 }}>
                {l!.label}
              </m.a>
            ))}
        </div>
      ) : null}

      {footer}

      <footer className="pm-foot">
        <span>{t(lang, "pricesNote")}</span>
        {cafe.plan === "free" ? <span>{t(lang, "madeWith")}</span> : null}
      </footer>
    </div>
  );
}

function Cover({ id, live }: { id: string; live: boolean }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, 140]);
  const scale = useTransform(scrollY, [0, 400], [1.08, 1.25]);
  return (
    <div className="pm-cover">
      <m.div className="pm-cover-img" style={live ? { backgroundImage: `url(/media/${id})`, y, scale } : { backgroundImage: `url(/media/${id})` }} initial={{ opacity: 0, scale: 1.25 }} animate={{ opacity: 1, scale: 1.08 }} transition={{ duration: 1.2, ease: [0.2, 0.8, 0.2, 1] }} />
    </div>
  );
}

function WifiPass({ pass, lang }: { pass: string; lang: Lang }) {
  const [copied, setCopied] = useState(false);
  return (
    <span>
      {lang === "am" ? "የይለፍ ቃል" : "Password"}: <code>{pass}</code>{" "}
      <button
        type="button"
        className="pm-copy"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(pass);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {}
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <m.span key={String(copied)} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.15 }}>
            {copied ? (lang === "am" ? "ተቀድቷል ✓" : "Copied ✓") : lang === "am" ? "ቅዳ" : "Copy"}
          </m.span>
        </AnimatePresence>
      </button>
    </span>
  );
}

function ItemCard({ item: i, idx, lang, onItem, qty, live }: { item: ItemDTO; idx: number; lang: Lang; onItem?: (i: ItemDTO) => void; qty: number; live: boolean }) {
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const desc = pick(lang, i.descEn, i.descAm);
  const price = i.special ? i.special.price : i.price;
  const body = (
    <>
      {i.photo ? (
        <span className="pm-ph-wrap">
          <m.img className="pm-ph" src={i.photo} alt="" loading="lazy" width={72} height={72} layoutId={live ? `ph-${i.id}` : undefined} transition={soft} />
          <AnimatePresence>
            {qty ? (
              <m.b className="pm-qty" key="q" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={bouncy}>
                <RollNumber value={qty} />
              </m.b>
            ) : null}
          </AnimatePresence>
        </span>
      ) : null}
      <div className="pm-body">
        <div className="leader">
          <span className="nm">
            <span className="nm-t">{pick(lang, i.nameEn, i.nameAm)}</span>
            {!i.photo && qty ? <b className="pm-qty inline">{qty}</b> : null}
            {i.popular ? <span className="tg pop">{tr("Popular", "ተወዳጅ")}</span> : null}
            {i.fasting ? <span className="tg fast">{t(lang, "fasting")}</span> : null}
            {i.tags.map((tg) => (TAG_LABEL[tg] ? <span key={tg} className={`tg t-${tg}`}>{tr(...TAG_LABEL[tg])}</span> : null))}
            {i.soldOut ? <span className="tg out">{t(lang, "soldOut")}</span> : null}
          </span>
          <i className="dots" aria-hidden="true" />
          <span className="price">
            {i.special ? <s>{formatBirr(i.price)}</s> : null}
            <RollNumber value={price} />
            <small> {t(lang, "birr")}</small>
          </span>
        </div>
        {i.special && (i.special.labelEn || i.special.labelAm) ? <p className="pm-spec">★ {pick(lang, i.special.labelEn, i.special.labelAm)}</p> : null}
        {desc ? <p>{desc}</p> : null}
        {i.variants.length > 1 ? <p className="pm-sizes">{i.variants.map((v) => `${pick(lang, v.nameEn, v.nameAm)} ${formatBirr(v.price)}`).join(" · ")}</p> : null}
        {i.addons.length && onItem ? <p className="pm-sizes">+ {tr("extras available", "ተጨማሪዎች አሉ")}</p> : null}
      </div>
    </>
  );
  const cls = `pm-it${i.soldOut ? " out" : ""}${i.photo ? " has-ph" : ""}${i.special ? " special" : ""}`;
  const motionProps = {
    layout: "position" as const,
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "0px 0px -6% 0px" },
    exit: { opacity: 0, x: -40, transition: { duration: 0.18 } },
    transition: { ...soft, delay: Math.min(idx, 8) * 0.045 },
  };
  return onItem ? (
    <m.button type="button" className={cls} onClick={() => onItem(i)} whileTap={{ scale: 0.97 }} {...motionProps}>
      {body}
    </m.button>
  ) : (
    <m.article className={cls} {...motionProps}>
      {body}
    </m.article>
  );
}
