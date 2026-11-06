import type { CSSProperties, ReactNode } from "react";
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
  extra?: ReactNode; // rendered under the header (search, table banner)
  footer?: ReactNode;
};

const TAG_LABEL: Record<string, [string, string]> = { new: ["New", "አዲስ"], chef: ["Chef's pick", "የሼፍ ምርጫ"], spicy: ["Spicy", "ቅመም"], vegan: ["Vegan", "ቪጋን"] };

// The customer-facing menu. Rendered on the server and on the client (editor preview, public menu),
// so it must stay free of hooks and server-only imports.
export function MenuView({ cafe, categories, lang, fastOnly, controls, showJumpNav, query, onItem, extra, footer }: Props) {
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const name = pick(lang, cafe.nameEn, cafe.nameAm) || "Your cafe";
  const words = name.trim().split(/\s+/);
  const hours = pick(lang, cafe.hoursEn, cafe.hoursAm);
  const meta = [hours, cafe.area].filter(Boolean).join(" · ");
  const q = (query ?? "").trim().toLowerCase();

  const sections = categories
    .map((c) => ({
      ...c,
      items: c.items.filter((i) => (!fastOnly || i.fasting) && (!q || `${i.nameEn} ${i.nameAm} ${i.descEn}`.toLowerCase().includes(q))),
    }))
    .filter((c) => c.items.length > 0)
    // On fasting days, sections are left in place but fasting dishes rise to the top of each.
    .map((c) => (cafe.fastingNow ? { ...c, items: [...c.items].sort((a, b) => Number(b.fasting) - Number(a.fasting)) } : c));

  const style = {
    ...(cafe.brandColor ? { ["--pill" as string]: cafe.brandColor } : {}),
    ...(cafe.accentColor ? { ["--acc" as string]: cafe.accentColor } : {}),
  } as CSSProperties;

  const chip = (label: string, on: boolean, key: string, hrefOrClick: string | (() => void)) =>
    typeof hrefOrClick === "string" ? (
      <a key={key} className={`pm-chip${on ? " on" : ""}`} href={hrefOrClick} rel="nofollow">{label}</a>
    ) : (
      <button key={key} type="button" className={`pm-chip${on ? " on" : ""}`} onClick={hrefOrClick}>{label}</button>
    );
  const c = controls;
  let n = 0;

  return (
    <div className={`pm${cafe.coverId ? " has-cover" : ""}`} data-t={cafe.template} lang={lang} style={style}>
      {cafe.coverId ? <div className="pm-cover" style={{ backgroundImage: `url(/media/${cafe.coverId})` }} /> : null}
      <header className="pm-tab">
        {cafe.logoId ? <img className="pm-logo" src={`/media/${cafe.logoId}`} alt="" width={56} height={56} /> : null}
        <small>{t(lang, "welcomeTo")}</small>
        <b>{words[0]}</b>
        {words.length > 1 ? <span>{words.slice(1).join(" ")}</span> : null}
      </header>
      {meta ? <p className="pm-meta">{meta}</p> : null}

      <nav className="pm-chips" aria-label="Menu options">
        {chip("EN", lang === "en", "en", c.kind === "links" ? c.en : () => c.onLang("en"))}
        {chip("አማ", lang === "am", "am", c.kind === "links" ? c.am : () => c.onLang("am"))}
        {chip(t(lang, "fastingOnly"), fastOnly, "fast", c.kind === "links" ? c.fastToggle : c.onFast)}
      </nav>

      {cafe.fastingNow ? (
        <p className="pm-fast-banner">
          <b>{pick(lang, cafe.fastingNow.en, cafe.fastingNow.am)}</b> · {tr("fasting dishes are listed first", "የጾም ምግቦች ቀድመው ተዘርዝረዋል")}
        </p>
      ) : null}

      {extra}

      {showJumpNav && sections.length > 1 ? (
        <nav className="pm-jump" aria-label="Sections">
          {sections.map((s) => (
            <a key={s.id} href={`#c-${s.id}`}>{pick(lang, s.nameEn, s.nameAm)}</a>
          ))}
        </nav>
      ) : null}

      {sections.length === 0 ? (
        <p className="pm-empty">{q ? tr("Nothing matches your search.", "የሚመሳሰል ነገር አልተገኘም።") : fastOnly ? t(lang, "noFasting") : t(lang, "menuEmpty")}</p>
      ) : (
        sections.map((s) => (
          <section key={s.id} id={`c-${s.id}`} className={`pm-sec${s.availableNow ? "" : " later"}`}>
            <h2 className="pm-pill">{pick(lang, s.nameEn, s.nameAm)}</h2>
            {!s.availableNow && s.fromMin != null ? (
              <p className="pm-later">{tr(`Served ${minutesToHHMM(s.fromMin)}–${minutesToHHMM(s.toMin!)}`, `የሚቀርበው ${minutesToHHMM(s.fromMin)}–${minutesToHHMM(s.toMin!)}`)}</p>
            ) : null}
            {s.items.map((i) => {
              const desc = pick(lang, i.descEn, i.descAm);
              const Tag = onItem ? "button" : "article";
              return (
                <Tag
                  key={i.id}
                  type={onItem ? "button" : undefined}
                  className={`pm-it${i.soldOut ? " out" : ""}${i.photo ? " has-ph" : ""}${i.special ? " special" : ""}`}
                  style={{ ["--n" as string]: n++ }}
                  onClick={onItem ? () => onItem(i) : undefined}
                >
                  {i.photo ? <img className="pm-ph" src={i.photo} alt="" loading="lazy" width={72} height={72} /> : null}
                  <div className="pm-body">
                    <div className="leader">
                      <span className="nm">
                        <span className="nm-t">{pick(lang, i.nameEn, i.nameAm)}</span>
                        {i.popular ? <span className="tg pop">{tr("Popular", "ተወዳጅ")}</span> : null}
                        {i.fasting ? <span className="tg fast">{t(lang, "fasting")}</span> : null}
                        {i.tags.map((tg) => (TAG_LABEL[tg] ? <span key={tg} className={`tg t-${tg}`}>{tr(...TAG_LABEL[tg])}</span> : null))}
                        {i.soldOut ? <span className="tg out">{t(lang, "soldOut")}</span> : null}
                      </span>
                      <i className="dots" aria-hidden="true" />
                      <span className="price">
                        {i.special ? <s>{formatBirr(i.price)}</s> : null}
                        {formatBirr(i.special ? i.special.price : i.price)}
                        <small> {t(lang, "birr")}</small>
                      </span>
                    </div>
                    {i.special && (i.special.labelEn || i.special.labelAm) ? <p className="pm-spec">★ {pick(lang, i.special.labelEn, i.special.labelAm)}</p> : null}
                    {desc ? <p>{desc}</p> : null}
                    {i.variants.length > 1 ? (
                      <p className="pm-sizes">{i.variants.map((v) => `${pick(lang, v.nameEn, v.nameAm)} ${formatBirr(v.price)}`).join(" · ")}</p>
                    ) : null}
                    {i.addons.length && onItem ? <p className="pm-sizes">+ {tr("extras available", "ተጨማሪዎች አሉ")}</p> : null}
                  </div>
                </Tag>
              );
            })}
          </section>
        ))
      )}

      {cafe.wifiName ? (
        <div className="pm-wifi">
          <span className="pm-wifi-ic" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 8.8a15 15 0 0 1 20 0M5 12.6a10 10 0 0 1 14 0M8.5 16.3a5 5 0 0 1 7 0M12 20h.1" /></svg>
          </span>
          <div>
            <small>Wi-Fi</small>
            <b>{cafe.wifiName}</b>
            {cafe.wifiPass ? <span>{tr("Password", "የይለፍ ቃል")}: <code>{cafe.wifiPass}</code></span> : null}
          </div>
        </div>
      ) : null}

      {cafe.phone || cafe.mapUrl || cafe.instagram || cafe.tiktok || cafe.telegram || cafe.facebook ? (
        <div className="pm-contact">
          {cafe.phone ? <a href={`tel:${cafe.phone.replace(/\s+/g, "")}`}>{cafe.phone}</a> : null}
          {cafe.mapUrl ? <a href={cafe.mapUrl} target="_blank" rel="noreferrer">{tr("Map", "ካርታ")}</a> : null}
          {cafe.instagram ? <a href={`https://instagram.com/${cafe.instagram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">Instagram</a> : null}
          {cafe.tiktok ? <a href={`https://tiktok.com/@${cafe.tiktok.replace(/^@/, "")}`} target="_blank" rel="noreferrer">TikTok</a> : null}
          {cafe.telegram ? <a href={`https://t.me/${cafe.telegram.replace(/^@/, "")}`} target="_blank" rel="noreferrer">Telegram</a> : null}
          {cafe.facebook ? <a href={cafe.facebook.startsWith("http") ? cafe.facebook : `https://facebook.com/${cafe.facebook}`} target="_blank" rel="noreferrer">Facebook</a> : null}
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
