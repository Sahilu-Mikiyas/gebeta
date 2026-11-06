"use client";

import { useEffect, useMemo, useState } from "react";
import { MenuView } from "@/components/MenuView";
import { pick, type Lang } from "@/lib/i18n";
import { formatBirr } from "@/lib/menu";
import type { ItemDTO, MenuDTO } from "@/lib/types";

type Line = { key: string; item: ItemDTO; variant: number; addons: number[]; qty: number; unit: number };
type Placed = { id: string; number: number; status: string };

const post = (body: unknown) => fetch("/api/public", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, data: await r.json().catch(() => ({})) }));

function unitPrice(item: ItemDTO, variant: number, addons: number[]) {
  const base = item.special ? item.special.price : variant >= 0 && item.variants[variant] ? item.variants[variant].price : item.price;
  return base + addons.reduce((s, a) => s + (item.addons[a]?.price ?? 0), 0);
}

export function PublicMenu({ menu, initialLang, initialFast, table }: { menu: MenuDTO; initialLang: Lang; initialFast: boolean; table: string }) {
  const slug = menu.cafe.slug;
  const [lang, setLang] = useState<Lang>(initialLang);
  const [fast, setFast] = useState(initialFast);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<ItemDTO | null>(null);
  const [cart, setCart] = useState<Line[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [called, setCalled] = useState<string | null>(null);
  const [rate, setRate] = useState<"closed" | "open" | "sent">("closed");
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const canOrder = menu.cafe.orderingOn && !!table;
  const canCall = menu.cafe.callsOn && !!table;
  const count = cart.reduce((n, l) => n + l.qty, 0);
  const total = cart.reduce((s, l) => s + l.unit * l.qty, 0);

  // Keep the address bar in sync so a shared link opens the same view.
  useEffect(() => {
    const u = new URL(location.href);
    u.searchParams.set("lang", lang);
    if (fast) u.searchParams.set("fast", "1");
    else u.searchParams.delete("fast");
    u.searchParams.delete("src");
    history.replaceState(null, "", u);
  }, [lang, fast]);

  // Remember this table's orders on the phone and follow their status.
  const storeKey = `gebeta:${slug}:${table}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) ?? "[]");
      if (Array.isArray(saved)) setPlaced(saved);
    } catch {}
  }, [storeKey]);
  useEffect(() => {
    if (!placed.length) return;
    try {
      localStorage.setItem(storeKey, JSON.stringify(placed.slice(-5)));
    } catch {}
    const active = placed.filter((p) => p.status !== "paid" && p.status !== "cancelled");
    if (!active.length) return;
    const id = setInterval(async () => {
      const r = await post({ type: "status", slug, orderIds: active.map((p) => p.id) });
      if (r.ok && Array.isArray(r.data.orders)) {
        setPlaced((ps) => ps.map((p) => r.data.orders.find((o: Placed) => o.id === p.id) ?? p));
      }
    }, 10_000);
    return () => clearInterval(id);
  }, [placed, slug, storeKey]);

  const say = (m: string) => {
    setFlash(m);
    setTimeout(() => setFlash(null), 2600);
  };

  const openItem = (i: ItemDTO) => {
    setOpen(i);
    post({ type: "view", slug, itemId: i.id });
  };

  const call = async (kind: "waiter" | "bill") => {
    const r = await post({ type: "call", slug, table, kind });
    if (r.ok) {
      setCalled(kind);
      say(kind === "bill" ? tr("Your bill is on its way", "ሂሳብዎ እየመጣ ነው") : tr("A waiter is coming", "አስተናጋጅ እየመጣ ነው"));
      setTimeout(() => setCalled(null), 60_000);
    } else say(tr("Couldn't reach the cafe. Please wave to a waiter.", "ካፌውን ማግኘት አልተቻለም። እባክዎ አስተናጋጅ ይጥሩ።"));
  };

  const place = async () => {
    setPlacing(true);
    const r = await post({ type: "order", slug, table, note, lines: cart.map((l) => ({ itemId: l.item.id, variant: l.variant, addons: l.addons, qty: l.qty })) });
    setPlacing(false);
    if (r.ok) {
      setPlaced((p) => [...p, { id: r.data.orderId, number: r.data.number, status: "new" }]);
      setCart([]);
      setNote("");
      setCartOpen(false);
      say(tr(`Order #${r.data.number} sent to the kitchen`, `ትዕዛዝ #${r.data.number} ወደ ኩሽና ተልኳል`));
    } else if (r.data.error === "unavailable") say(tr("Something in your order just sold out. Please check your order.", "ከትዕዛዝዎ አንዱ አሁን አልቋል። እባክዎ ይመልከቱ።"));
    else say(tr("Your order didn't go through. Please try again or ask a waiter.", "ትዕዛዝዎ አልተላከም። እንደገና ይሞክሩ ወይም አስተናጋጅ ይጠይቁ።"));
  };

  const statusLabel = (s: string) =>
    ({ new: tr("Received", "ደርሷል"), preparing: tr("Being prepared", "እየተዘጋጀ ነው"), served: tr("Served — enjoy!", "ቀርቧል፣ መልካም ምግብ!"), paid: tr("Paid, thank you", "ተከፍሏል፣ እናመሰግናለን"), cancelled: tr("Cancelled", "ተሰርዟል") })[s] ?? s;

  const extra = (
    <>
      {table ? (
        <p className="pm-table">
          {tr(`You're at table ${table}`, `ጠረጴዛ ${table} ላይ ነዎት`)}
          {canOrder ? ` · ${tr("order right from your phone", "ከስልክዎ ይዘዙ")}` : ""}
        </p>
      ) : null}
      <label className="pm-search">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
        <input type="search" placeholder={tr("Search the menu", "ምናሌውን ይፈልጉ")} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={tr("Search the menu", "ምናሌውን ይፈልጉ")} />
      </label>
      {placed.filter((p) => p.status !== "paid" && p.status !== "cancelled").map((p) => (
        <div key={p.id} className={`pm-order-status ${p.status}`}>
          <b>#{p.number}</b>
          <span>{statusLabel(p.status)}</span>
          <i className="steps"><i className={p.status !== "new" ? "on" : ""} /><i className={p.status === "served" ? "on" : ""} /></i>
        </div>
      ))}
    </>
  );

  const footer = (
    <div className="pm-rate">
      {rate === "sent" ? (
        <p>{tr("Thank you for your feedback!", "ስለ አስተያየትዎ እናመሰግናለን!")}</p>
      ) : (
        <button type="button" className="pm-chip" onClick={() => setRate("open")}>★ {tr("Rate your visit", "ጉብኝትዎን ይገምግሙ")}</button>
      )}
    </div>
  );

  return (
    <>
      <MenuView cafe={menu.cafe} categories={menu.categories} lang={lang} fastOnly={fast} query={query} showJumpNav controls={{ kind: "buttons", onLang: setLang, onFast: () => setFast((f) => !f) }} onItem={openItem} extra={extra} footer={footer} />

      {(canCall || count) && !open && !cartOpen && rate !== "open" ? (
        <div className="pm-dock">
          {canCall ? (
            <>
              <button type="button" className={`dock-btn${called === "waiter" ? " sent" : ""}`} onClick={() => call("waiter")} disabled={called === "waiter"}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0" /></svg>
                {called === "waiter" ? tr("Coming", "እየመጣ ነው") : tr("Waiter", "አስተናጋጅ")}
              </button>
              <button type="button" className={`dock-btn${called === "bill" ? " sent" : ""}`} onClick={() => call("bill")} disabled={called === "bill"}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3zM10 8h4M10 12h4" /></svg>
                {called === "bill" ? tr("Coming", "እየመጣ ነው") : tr("Bill", "ሂሳብ")}
              </button>
            </>
          ) : null}
          {count ? (
            <button type="button" className="dock-btn cart bump" key={count} onClick={() => setCartOpen(true)}>
              <b>{count}</b> {tr("View order", "ትዕዛዝ")} · {formatBirr(total)} {tr("birr", "ብር")}
            </button>
          ) : null}
        </div>
      ) : null}

      {open ? (
        <ItemSheet
          item={open}
          lang={lang}
          canOrder={canOrder && menu.categories.find((c) => c.id === open.categoryId)?.availableNow !== false}
          onClose={() => setOpen(null)}
          onAdd={(variant, addons, qty) => {
            const unit = unitPrice(open, variant, addons);
            const key = `${open.id}:${variant}:${addons.join(",")}`;
            setCart((c) => (c.some((l) => l.key === key) ? c.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l)) : [...c, { key, item: open, variant, addons, qty, unit }]));
            setOpen(null);
            say(tr(`Added ${open.nameEn}`, `${open.nameAm || open.nameEn} ተጨምሯል`));
          }}
        />
      ) : null}

      {cartOpen ? (
        <div className="pm-sheet-wrap" onClick={() => setCartOpen(false)}>
          <div className="pm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="pm-grab" />
            <h3>{tr(`Your order · table ${table}`, `ትዕዛዝዎ · ጠረጴዛ ${table}`)}</h3>
            <ul className="pm-cart">
              {cart.map((l) => (
                <li key={l.key}>
                  <div>
                    <b>{pick(lang, l.item.nameEn, l.item.nameAm)}</b>
                    <small>
                      {[l.variant >= 0 ? pick(lang, l.item.variants[l.variant]?.nameEn ?? "", l.item.variants[l.variant]?.nameAm ?? "") : "", ...l.addons.map((a) => `+ ${pick(lang, l.item.addons[a]?.nameEn ?? "", l.item.addons[a]?.nameAm ?? "")}`)].filter(Boolean).join(" ")}
                    </small>
                  </div>
                  <div className="qty">
                    <button type="button" aria-label="-" onClick={() => setCart((c) => c.flatMap((x) => (x.key === l.key ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x])))}>−</button>
                    <span>{l.qty}</span>
                    <button type="button" aria-label="+" onClick={() => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, qty: Math.min(50, x.qty + 1) } : x)))}>+</button>
                  </div>
                  <span className="lt">{formatBirr(l.unit * l.qty)}</span>
                </li>
              ))}
            </ul>
            <textarea className="pm-note" placeholder={tr("Anything the kitchen should know? (no sugar, extra hot…)", "ለኩሽና ማሳሰቢያ? (ያለ ስኳር፣ በጣም ትኩስ…)")} value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} rows={2} />
            <div className="pm-total">
              <span>{tr("Total", "ጠቅላላ")}</span>
              <b>{formatBirr(total)} {tr("birr", "ብር")}</b>
            </div>
            <button type="button" className="pm-cta" disabled={placing || !cart.length} onClick={place}>
              {placing ? tr("Sending…", "በመላክ ላይ…") : tr("Send order to the kitchen", "ወደ ኩሽና ላክ")}
            </button>
            <p className="pm-fine">{tr("You pay at the end, to your waiter: cash, Telebirr or CBE Birr.", "ክፍያው መጨረሻ ላይ ለአስተናጋጅዎ ነው፦ በጥሬ ገንዘብ፣ በቴሌብር ወይም በሲቢኢ ብር።")}</p>
          </div>
        </div>
      ) : null}

      {rate === "open" ? <RateSheet lang={lang} onClose={() => setRate("closed")} onSent={() => setRate("sent")} slug={slug} table={table} /> : null}

      {flash ? <div className="pm-toast" role="status">{flash}</div> : null}
    </>
  );
}

function ItemSheet({ item, lang, canOrder, onClose, onAdd }: { item: ItemDTO; lang: Lang; canOrder: boolean; onClose: () => void; onAdd: (variant: number, addons: number[], qty: number) => void }) {
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const [variant, setVariant] = useState(item.variants.length ? 0 : -1);
  const [addons, setAddons] = useState<number[]>([]);
  const [qty, setQty] = useState(1);
  const unit = useMemo(() => unitPrice(item, variant, addons), [item, variant, addons]);
  const desc = pick(lang, item.descEn, item.descAm);
  return (
    <div className="pm-sheet-wrap" onClick={onClose}>
      <div className="pm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="pm-grab" />
        {item.photo ? <img className="pm-hero" src={item.photo} alt="" /> : null}
        <h3>{pick(lang, item.nameEn, item.nameAm)}</h3>
        {lang === "en" && item.nameAm ? <p className="pm-alt">{item.nameAm}</p> : lang === "am" ? <p className="pm-alt">{item.nameEn}</p> : null}
        {desc ? <p className="pm-desc">{desc}</p> : null}
        {item.special ? <p className="pm-spec">★ {pick(lang, item.special.labelEn, item.special.labelAm) || tr("Special price now", "አሁን ልዩ ዋጋ")}: {formatBirr(item.special.price)} {tr("birr", "ብር")}</p> : null}
        {item.variants.length ? (
          <fieldset className="pm-opts">
            <legend>{tr("Size", "መጠን")}</legend>
            {item.variants.map((v, i) => (
              <label key={i} className={variant === i ? "on" : ""}>
                <input type="radio" name="variant" checked={variant === i} onChange={() => setVariant(i)} />
                <span>{pick(lang, v.nameEn, v.nameAm)}</span>
                <b>{formatBirr(v.price)}</b>
              </label>
            ))}
          </fieldset>
        ) : null}
        {item.addons.length ? (
          <fieldset className="pm-opts">
            <legend>{tr("Extras", "ተጨማሪዎች")}</legend>
            {item.addons.map((a, i) => (
              <label key={i} className={addons.includes(i) ? "on" : ""}>
                <input type="checkbox" checked={addons.includes(i)} onChange={(e) => setAddons((x) => (e.target.checked ? [...x, i] : x.filter((y) => y !== i)))} />
                <span>{pick(lang, a.nameEn, a.nameAm)}</span>
                <b>+{formatBirr(a.price)}</b>
              </label>
            ))}
          </fieldset>
        ) : null}
        {item.soldOut ? (
          <p className="pm-fine big">{tr("Sold out for today. Back tomorrow morning.", "ለዛሬ አልቋል። ነገ ጠዋት ይመለሳል።")}</p>
        ) : canOrder ? (
          <div className="pm-add">
            <div className="qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="-">−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="+">+</button>
            </div>
            <button type="button" className="pm-cta" onClick={() => onAdd(variant, addons, qty)}>
              {tr("Add", "ጨምር")} · {formatBirr(unit * qty)} {tr("birr", "ብር")}
            </button>
          </div>
        ) : (
          <p className="pm-price-big">{formatBirr(unit)} <small>{tr("birr", "ብር")}</small></p>
        )}
      </div>
    </div>
  );
}

function RateSheet({ lang, onClose, onSent, slug, table }: { lang: Lang; onClose: () => void; onSent: () => void; slug: string; table: string }) {
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <div className="pm-sheet-wrap" onClick={onClose}>
      <div className="pm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="pm-grab" />
        <h3>{tr("How was your visit?", "ጉብኝትዎ እንዴት ነበር?")}</h3>
        <div className="stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" className={n <= stars ? "on" : ""} onClick={() => setStars(n)} aria-label={`${n}`}>★</button>
          ))}
        </div>
        <textarea className="pm-note" rows={3} placeholder={tr("Anything we should know? (optional, only the cafe sees this)", "ማወቅ ያለብን ነገር? (አማራጭ፣ ካፌው ብቻ ያየዋል)")} value={comment} onChange={(e) => setComment(e.target.value.slice(0, 500))} />
        <button type="button" className="pm-cta" disabled={!stars || sending} onClick={async () => {
          setSending(true);
          await post({ type: "feedback", slug, table, rating: stars, comment });
          onSent();
        }}>
          {tr("Send", "ላክ")}
        </button>
      </div>
    </div>
  );
}
