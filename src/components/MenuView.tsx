import { t, pick, type Lang } from "@/lib/i18n";
import { formatBirr } from "@/lib/menu";
import type { CafeDTO, CategoryDTO } from "@/lib/types";

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
};

// The customer-facing menu. Rendered on the server for /m/[slug] and on the client as the editor preview,
// so it must stay free of hooks and server-only imports.
export function MenuView({ cafe, categories, lang, fastOnly, controls, showJumpNav }: Props) {
  const name = pick(lang, cafe.nameEn, cafe.nameAm) || "Your cafe";
  const words = name.trim().split(/\s+/);
  const first = words[0];
  const rest = words.slice(1).join(" ");
  const hours = pick(lang, cafe.hoursEn, cafe.hoursAm);
  const meta = [hours, cafe.area].filter(Boolean).join(" · ");

  const sections = categories
    .map((c) => ({ ...c, items: fastOnly ? c.items.filter((i) => i.fasting) : c.items }))
    .filter((c) => c.items.length > 0);

  const chip = (label: string, on: boolean, key: string, hrefOrClick: string | (() => void)) =>
    typeof hrefOrClick === "string" ? (
      <a key={key} className={`pm-chip${on ? " on" : ""}`} href={hrefOrClick} rel="nofollow">
        {label}
      </a>
    ) : (
      <button key={key} type="button" className={`pm-chip${on ? " on" : ""}`} onClick={hrefOrClick}>
        {label}
      </button>
    );

  const c = controls;
  return (
    <div className="pm" data-t={cafe.template} lang={lang}>
      <header className="pm-tab">
        {cafe.logoId ? <img className="pm-logo" src={`/media/${cafe.logoId}`} alt="" width={56} height={56} /> : null}
        <small>{t(lang, "welcomeTo")}</small>
        <b>{first}</b>
        {rest ? <span>{rest}</span> : null}
      </header>
      {meta ? <p className="pm-meta">{meta}</p> : null}

      <nav className="pm-chips" aria-label="Menu options">
        {chip("EN", lang === "en", "en", c.kind === "links" ? c.en : () => c.onLang("en"))}
        {chip("አማ", lang === "am", "am", c.kind === "links" ? c.am : () => c.onLang("am"))}
        {chip(`${t(lang, "fastingOnly")}`, fastOnly, "fast", c.kind === "links" ? c.fastToggle : c.onFast)}
      </nav>

      {showJumpNav && sections.length > 1 ? (
        <nav className="pm-jump" aria-label="Sections">
          {sections.map((s) => (
            <a key={s.id} href={`#c-${s.id}`}>
              {pick(lang, s.nameEn, s.nameAm)}
            </a>
          ))}
        </nav>
      ) : null}

      {sections.length === 0 ? (
        <p className="pm-empty">{fastOnly ? t(lang, "noFasting") : t(lang, "menuEmpty")}</p>
      ) : (
        sections.map((s) => (
          <section key={s.id} id={`c-${s.id}`} className="pm-sec">
            <h2 className="pm-pill">{pick(lang, s.nameEn, s.nameAm)}</h2>
            {s.items.map((i) => {
              const desc = pick(lang, i.descEn, i.descAm);
              return (
                <article key={i.id} className={`pm-it${i.soldOut ? " out" : ""}${i.imageId ? " has-ph" : ""}`}>
                  {i.imageId ? <img className="pm-ph" src={`/media/${i.imageId}`} alt="" loading="lazy" width={72} height={72} /> : null}
                  <div className="pm-body">
                    <div className="leader">
                      <span className="nm">
                        <span className="nm-t">{pick(lang, i.nameEn, i.nameAm)}</span>
                        {i.fasting ? <span className="tg fast">{t(lang, "fasting")}</span> : null}
                        {i.soldOut ? <span className="tg out">{t(lang, "soldOut")}</span> : null}
                      </span>
                      <i className="dots" aria-hidden="true" />
                      <span className="price">
                        {formatBirr(i.price)}
                        <small> {t(lang, "birr")}</small>
                      </span>
                    </div>
                    {desc ? <p>{desc}</p> : null}
                  </div>
                </article>
              );
            })}
          </section>
        ))
      )}

      <footer className="pm-foot">
        <span>{t(lang, "pricesNote")}</span>
        <span>{t(lang, "madeWith")}</span>
      </footer>
    </div>
  );
}
