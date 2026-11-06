"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MenuView } from "@/components/MenuView";
import { useDragControls, useScroll, useSpring } from "motion/react";
import { AnimatePresence, CheckDraw, MotionRoot, RollNumber, bouncy, burst, flyTo, m, soft } from "@/components/motion";
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

const brandColors = (menu: MenuDTO) => [menu.cafe.brandColor ?? "#d7261e", menu.cafe.accentColor ?? "#f5b700", "#ffffff", "#1f6b35"];

export function PublicMenu(props: { menu: MenuDTO; initialLang: Lang; initialFast: boolean; table: string }) {
  return (
    <MotionRoot>
      <PublicMenuInner {...props} />
    </MotionRoot>
  );
}

function PublicMenuInner({ menu, initialLang, initialFast, table }: { menu: MenuDTO; initialLang: Lang; initialFast: boolean; table: string }) {
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
  const [success, setSuccess] = useState<number | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [called, setCalled] = useState<{ kind: "waiter" | "bill"; at: number } | null>(null);
  const [calling, setCalling] = useState<"waiter" | "bill" | null>(null);
  const [rate, setRate] = useState<"closed" | "open" | "sent">("closed");
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const canOrder = menu.cafe.orderingOn && !!table;
  const canCall = menu.cafe.callsOn && !!table;
  const count = cart.reduce((n, l) => n + l.qty, 0);
  const total = cart.reduce((s, l) => s + l.unit * l.qty, 0);
  const inCart = useMemo(() => cart.reduce<Record<string, number>>((m, l) => ({ ...m, [l.item.id]: (m[l.item.id] ?? 0) + l.qty }), {}), [cart]);

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
      if (r.ok && Array.isArray(r.data.orders)) setPlaced((ps) => ps.map((p) => r.data.orders.find((o: Placed) => o.id === p.id) ?? p));
    }, 10_000);
    return () => clearInterval(id);
  }, [placed, slug, storeKey]);

  useEffect(() => {
    if (!called) return;
    const id = setTimeout(() => setCalled(null), 60_000);
    return () => clearTimeout(id);
  }, [called]);

  const say = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash((f) => (f === msg ? null : f)), 2600);
  };

  const openItem = (i: ItemDTO) => {
    setOpen(i);
    post({ type: "view", slug, itemId: i.id });
  };

  const call = async (kind: "waiter" | "bill") => {
    setCalling(kind);
    const r = await post({ type: "call", slug, table, kind });
    setTimeout(() => setCalling(null), 1800);
    if (r.ok) setCalled({ kind, at: Date.now() });
    else {
      setCalling(null);
      say(tr("Couldn't reach the cafe. Please wave to a waiter.", "ካፌውን ማግኘት አልተቻለም። እባክዎ አስተናጋጅ ይጥሩ።"));
    }
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
      setSuccess(r.data.number);
      setTimeout(() => burst({ colors: brandColors(menu), y: 0.42 }), 350);
      setTimeout(() => setSuccess(null), 3600);
    } else if (r.data.error === "unavailable") say(tr("Something in your order just sold out. Please check your order.", "ከትዕዛዝዎ አንዱ አሁን አልቋል። እባክዎ ይመልከቱ።"));
    else say(tr("Your order didn't go through. Please try again or ask a waiter.", "ትዕዛዝዎ አልተላከም። እንደገና ይሞክሩ ወይም አስተናጋጅ ይጠይቁ።"));
  };

  const statusLabel = (s: string) =>
    ({ new: tr("Received", "ደርሷል"), preparing: tr("Being prepared", "እየተዘጋጀ ነው"), served: tr("Served — enjoy!", "ቀርቧል፣ መልካም ምግብ!"), paid: tr("Paid, thank you", "ተከፍሏል፣ እናመሰግናለን"), cancelled: tr("Cancelled", "ተሰርዟል") })[s] ?? s;

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  const activeOrders = placed.filter((p) => p.status !== "paid" && p.status !== "cancelled");
  const extra = (
    <>
      {table ? (
        <m.p className="pm-table" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...bouncy, delay: 0.75 }}>
          <span className="pm-table-n">{table}</span>
          {tr(`You're at table ${table}`, `ጠረጴዛ ${table} ላይ ነዎት`)}
          {canOrder ? ` · ${tr("order right from your phone", "ከስልክዎ ይዘዙ")}` : ""}
        </m.p>
      ) : null}
      <m.label className="pm-search" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...soft, delay: 0.8 }} whileFocus={{ scale: 1.01 }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.3-4.3" /></svg>
        <input type="search" placeholder={tr("Search the menu", "ምናሌውን ይፈልጉ")} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={tr("Search the menu", "ምናሌውን ይፈልጉ")} />
        <AnimatePresence>{query ? <m.button type="button" className="pm-clear" onClick={() => setQuery("")} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} aria-label="Clear">✕</m.button> : null}</AnimatePresence>
      </m.label>
      <AnimatePresence>
        {activeOrders.map((p) => (
          <m.div key={p.id} layout className={`pm-order-status ${p.status}`} initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }} transition={bouncy}>
            <b>#{p.number}</b>
            <AnimatePresence mode="wait">
              <m.span key={p.status} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}>{statusLabel(p.status)}</m.span>
            </AnimatePresence>
            <i className="steps">
              {["new", "preparing", "served"].map((s, k) => (
                <m.i key={s} animate={{ backgroundColor: ["new", "preparing", "served"].indexOf(p.status) >= k ? "#0b0a0a" : "rgba(0,0,0,.2)", scaleX: ["new", "preparing", "served"].indexOf(p.status) >= k ? 1 : 0.7 }} transition={soft} />
              ))}
            </i>
          </m.div>
        ))}
      </AnimatePresence>
    </>
  );

  const footer = (
    <div className="pm-rate">
      <AnimatePresence mode="wait">
        {rate === "sent" ? (
          <m.p key="t" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={bouncy}>{tr("Thank you for your feedback!", "ስለ አስተያየትዎ እናመሰግናለን!")}</m.p>
        ) : (
          <m.button key="b" type="button" className="pm-chip big" onClick={() => setRate("open")} whileTap={{ scale: 0.92 }} whileHover={{ y: -2 }}>★ {tr("Rate your visit", "ጉብኝትዎን ይገምግሙ")}</m.button>
        )}
      </AnimatePresence>
    </div>
  );

  const showDock = (canCall || count > 0) && !open && !cartOpen && rate !== "open" && success == null;

  return (
    <>
      <m.div className="pm-progress" style={{ scaleX: progress }} aria-hidden="true" />
      <MenuView cafe={menu.cafe} categories={menu.categories} lang={lang} fastOnly={fast} query={query} showJumpNav live controls={{ kind: "buttons", onLang: setLang, onFast: () => setFast((f) => !f) }} onItem={openItem} inCart={inCart} extra={extra} footer={footer} />

      <AnimatePresence>
        {showDock ? (
          <m.div className="pm-dock" initial={{ y: 120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 120, opacity: 0 }} transition={bouncy}>
            {canCall ? (
              <>
                <CallButton kind="waiter" lang={lang} called={called} calling={calling} onCall={call} />
                <CallButton kind="bill" lang={lang} called={called} calling={calling} onCall={call} />
              </>
            ) : null}
            <AnimatePresence>
              {count ? (
                <m.button key="cart" type="button" className="dock-btn cart" onClick={() => setCartOpen(true)} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} whileTap={{ scale: 0.95 }} transition={bouncy} layout>
                  <m.b key={count} initial={{ scale: 1.8 }} animate={{ scale: 1 }} transition={bouncy}>{count}</m.b>
                  <span>{tr("View order", "ትዕዛዝ")}</span>
                  <span className="dock-total"><RollNumber value={total} /> {tr("birr", "ብር")}</span>
                </m.button>
              ) : null}
            </AnimatePresence>
          </m.div>
        ) : null}
      </AnimatePresence>
      {/* Where the flying photo lands before the cart button exists. */}
      <span className="cart-anchor" aria-hidden="true" />

      <AnimatePresence>
        {open ? (
          <Sheet key={`item-${open.id}`} onClose={() => setOpen(null)} hero={open.photo ? <m.img className="pm-hero" src={open.photo} alt="" layoutId={`ph-${open.id}`} transition={soft} /> : null}>
            <ItemDetail
              item={open}
              lang={lang}
              canOrder={canOrder && menu.categories.find((c) => c.id === open.categoryId)?.availableNow !== false}
              onAdd={(variant, addons, qty, fromEl) => {
                const unit = unitPrice(open, variant, addons);
                const key = `${open.id}:${variant}:${addons.join(",")}`;
                flyTo(fromEl, document.querySelector(".dock-btn.cart") ?? document.querySelector(".cart-anchor"), open.photo);
                setCart((c) => (c.some((l) => l.key === key) ? c.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l)) : [...c, { key, item: open, variant, addons, qty, unit }]));
                setOpen(null);
              }}
            />
          </Sheet>
        ) : null}

        {cartOpen ? (
          <Sheet key="cart" onClose={() => setCartOpen(false)}>
            <h3>{tr(`Your order · table ${table}`, `ትዕዛዝዎ · ጠረጴዛ ${table}`)}</h3>
            <m.ul className="pm-cart" layout>
              <AnimatePresence initial={false}>
                {cart.map((l, k) => (
                  <m.li key={l.key} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60, height: 0, paddingTop: 0, paddingBottom: 0 }} transition={{ ...soft, delay: k * 0.04 }}>
                    {l.item.photo ? <img className="pm-cart-ph" src={l.item.photo} alt="" /> : null}
                    <div>
                      <b>{pick(lang, l.item.nameEn, l.item.nameAm)}</b>
                      <small>{[l.variant >= 0 ? pick(lang, l.item.variants[l.variant]?.nameEn ?? "", l.item.variants[l.variant]?.nameAm ?? "") : "", ...l.addons.map((a) => `+ ${pick(lang, l.item.addons[a]?.nameEn ?? "", l.item.addons[a]?.nameAm ?? "")}`)].filter(Boolean).join(" ")}</small>
                    </div>
                    <div className="qty">
                      <m.button type="button" aria-label="-" whileTap={{ scale: 0.8 }} onClick={() => setCart((c) => c.flatMap((x) => (x.key === l.key ? (x.qty > 1 ? [{ ...x, qty: x.qty - 1 }] : []) : [x])))}>−</m.button>
                      <RollNumber value={l.qty} />
                      <m.button type="button" aria-label="+" whileTap={{ scale: 0.8 }} onClick={() => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, qty: Math.min(50, x.qty + 1) } : x)))}>+</m.button>
                    </div>
                    <span className="lt"><RollNumber value={l.unit * l.qty} /></span>
                  </m.li>
                ))}
              </AnimatePresence>
            </m.ul>
            <textarea className="pm-note" placeholder={tr("Anything the kitchen should know? (no sugar, extra hot…)", "ለኩሽና ማሳሰቢያ? (ያለ ስኳር፣ በጣም ትኩስ…)")} value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} rows={2} />
            <div className="pm-total">
              <span>{tr("Total", "ጠቅላላ")}</span>
              <b><RollNumber value={total} /> {tr("birr", "ብር")}</b>
            </div>
            <m.button type="button" className="pm-cta" disabled={placing || !cart.length} onClick={place} whileTap={{ scale: 0.96 }}>
              {placing ? <span className="pm-dots"><i /><i /><i /></span> : tr("Send order to the kitchen", "ወደ ኩሽና ላክ")}
            </m.button>
            <p className="pm-fine">{tr("You pay at the end, to your waiter: cash, Telebirr or CBE Birr.", "ክፍያው መጨረሻ ላይ ለአስተናጋጅዎ ነው፦ በጥሬ ገንዘብ፣ በቴሌብር ወይም በሲቢኢ ብር።")}</p>
          </Sheet>
        ) : null}

        {rate === "open" ? (
          <Sheet key="rate" onClose={() => setRate("closed")}>
            <RateForm lang={lang} slug={slug} table={table} colors={brandColors(menu)} onSent={() => setRate("sent")} />
          </Sheet>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {success != null ? (
          <m.div className="pm-success" key="ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSuccess(null)}>
            <m.div className="pm-success-card" initial={{ scale: 0.5, rotate: -6, y: 40 }} animate={{ scale: 1, rotate: 0, y: 0 }} exit={{ scale: 0.8, opacity: 0 }} transition={bouncy}>
              <CheckDraw size={110} color="#1f6b35" />
              <m.b initial={{ scale: 2.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...bouncy, delay: 0.55 }}>#{success}</m.b>
              <m.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...soft, delay: 0.75 }}>{tr("Sent to the kitchen", "ወደ ኩሽና ተልኳል")}</m.p>
              <m.small initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>{tr("We'll show the status at the top of the menu.", "ሁኔታውን በምናሌው አናት እናሳያለን።")}</m.small>
            </m.div>
          </m.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {calling ? (
          <m.div className="pm-calling" key="calling" initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }} transition={bouncy}>
            <m.span className="bell" animate={{ rotate: [0, -24, 22, -16, 12, -6, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.3 }}>
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d={calling === "bill" ? "M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3zM10 8h4M10 12h4" : "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"} /></svg>
            </m.span>
            <span>{calling === "bill" ? tr("Your bill is on its way", "ሂሳብዎ እየመጣ ነው") : tr("A waiter is coming to your table", "አስተናጋጅ ወደ ጠረጴዛዎ እየመጣ ነው")}</span>
          </m.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {flash ? (
          <m.div className="pm-toast" role="status" key={flash} initial={{ y: -60, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -60, opacity: 0 }} transition={bouncy}>
            {flash}
          </m.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

// A bottom sheet that springs up and can be dragged down to close.
function Sheet({ children, onClose, hero }: { children: ReactNode; onClose: () => void; hero?: ReactNode }) {
  const drag = useDragControls();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <m.div className="pm-sheet-wrap" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <m.div
        className="pm-sheet"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        drag="y"
        dragControls={drag}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.7 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 110 || info.velocity.y > 600) onClose();
        }}
      >
        <div className="pm-grab-zone" onPointerDown={(e) => drag.start(e)}>
          <div className="pm-grab" />
          {hero}
        </div>
        {children}
      </m.div>
    </m.div>
  );
}

function CallButton({ kind, lang, called, calling, onCall }: { kind: "waiter" | "bill"; lang: Lang; called: { kind: string; at: number } | null; calling: string | null; onCall: (k: "waiter" | "bill") => void }) {
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const sent = called?.kind === kind;
  return (
    <m.button type="button" className={`dock-btn${sent ? " sent" : ""}`} onClick={() => onCall(kind)} disabled={sent || calling === kind} whileTap={{ scale: 0.9 }} layout transition={bouncy}>
      {sent ? (
        <svg className="ring" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="3" />
          <m.circle cx="12" cy="12" r="9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 1 }} animate={{ pathLength: 0 }} transition={{ duration: 60, ease: "linear" }} style={{ rotate: -90, transformOrigin: "50% 50%" }} />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d={kind === "bill" ? "M7 3h10v18l-2.5-1.5L12 21l-2.5-1.5L7 21V3zM10 8h4M10 12h4" : "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"} />
        </svg>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <m.span key={String(sent)} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }} transition={{ duration: 0.18 }}>
          {sent ? tr("Coming", "እየመጣ ነው") : kind === "bill" ? tr("Bill", "ሂሳብ") : tr("Waiter", "አስተናጋጅ")}
        </m.span>
      </AnimatePresence>
    </m.button>
  );
}

function ItemDetail({ item, lang, canOrder, onAdd }: { item: ItemDTO; lang: Lang; canOrder: boolean; onAdd: (variant: number, addons: number[], qty: number, from: Element | null) => void }) {
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const [variant, setVariant] = useState(item.variants.length ? 0 : -1);
  const [addons, setAddons] = useState<number[]>([]);
  const [qty, setQty] = useState(1);
  const addRef = useRef<HTMLButtonElement>(null);
  const unit = useMemo(() => unitPrice(item, variant, addons), [item, variant, addons]);
  const desc = pick(lang, item.descEn, item.descAm);
  const stagger = (k: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { ...soft, delay: 0.08 + k * 0.05 } });
  return (
    <div className="pm-detail">
      <m.h3 {...stagger(0)}>{pick(lang, item.nameEn, item.nameAm)}</m.h3>
      {lang === "en" && item.nameAm ? <m.p className="pm-alt" {...stagger(1)}>{item.nameAm}</m.p> : lang === "am" ? <m.p className="pm-alt" {...stagger(1)}>{item.nameEn}</m.p> : null}
      {desc ? <m.p className="pm-desc" {...stagger(2)}>{desc}</m.p> : null}
      {item.special ? <m.p className="pm-spec" {...stagger(2)}>★ {pick(lang, item.special.labelEn, item.special.labelAm) || tr("Special price now", "አሁን ልዩ ዋጋ")}: {formatBirr(item.special.price)} {tr("birr", "ብር")}</m.p> : null}
      {item.variants.length ? (
        <m.fieldset className="pm-opts" {...stagger(3)}>
          <legend>{tr("Size", "መጠን")}</legend>
          {item.variants.map((v, i) => (
            <label key={i} className={variant === i ? "on" : ""}>
              <input type="radio" name="variant" checked={variant === i} onChange={() => setVariant(i)} />
              {variant === i ? <m.i className="opt-bg" layoutId="opt-size" transition={bouncy} /> : null}
              <span>{pick(lang, v.nameEn, v.nameAm)}</span>
              <b>{formatBirr(v.price)}</b>
            </label>
          ))}
        </m.fieldset>
      ) : null}
      {item.addons.length ? (
        <m.fieldset className="pm-opts" {...stagger(4)}>
          <legend>{tr("Extras", "ተጨማሪዎች")}</legend>
          {item.addons.map((a, i) => (
            <m.label key={i} className={addons.includes(i) ? "on" : ""} animate={{ x: addons.includes(i) ? 4 : 0 }} transition={bouncy}>
              <input type="checkbox" checked={addons.includes(i)} onChange={(e) => setAddons((x) => (e.target.checked ? [...x, i] : x.filter((y) => y !== i)))} />
              <span>{pick(lang, a.nameEn, a.nameAm)}</span>
              <b>+{formatBirr(a.price)}</b>
            </m.label>
          ))}
        </m.fieldset>
      ) : null}
      {item.soldOut ? (
        <m.p className="pm-fine big" {...stagger(5)}>{tr("Sold out for today. Back tomorrow morning.", "ለዛሬ አልቋል። ነገ ጠዋት ይመለሳል።")}</m.p>
      ) : canOrder ? (
        <m.div className="pm-add" {...stagger(5)}>
          <div className="qty">
            <m.button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="-" whileTap={{ scale: 0.8 }}>−</m.button>
            <RollNumber value={qty} />
            <m.button type="button" onClick={() => setQty((q) => Math.min(50, q + 1))} aria-label="+" whileTap={{ scale: 0.8 }}>+</m.button>
          </div>
          <m.button ref={addRef} type="button" className="pm-cta" onClick={() => onAdd(variant, addons, qty, addRef.current)} whileTap={{ scale: 0.95 }}>
            {tr("Add", "ጨምር")} · <RollNumber value={unit * qty} /> {tr("birr", "ብር")}
          </m.button>
        </m.div>
      ) : (
        <m.p className="pm-price-big" {...stagger(5)}><RollNumber value={unit} /> <small>{tr("birr", "ብር")}</small></m.p>
      )}
    </div>
  );
}

function RateForm({ lang, slug, table, colors, onSent }: { lang: Lang; slug: string; table: string; colors: string[]; onSent: () => void }) {
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const shown = hover || stars;
  const faces = ["", tr("Not good", "ጥሩ አልነበረም"), tr("Could be better", "ሊሻሻል ይችላል"), tr("Good", "ጥሩ"), tr("Very good", "በጣም ጥሩ"), tr("Loved it!", "በጣም ወደድነው!")];
  return (
    <>
      <h3>{tr("How was your visit?", "ጉብኝትዎ እንዴት ነበር?")}</h3>
      <div className="stars" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <m.button key={n} type="button" className={n <= shown ? "on" : ""} onClick={() => setStars(n)} onMouseEnter={() => setHover(n)} aria-label={`${n}`} animate={n <= shown ? { scale: [1, 1.35, 1.12], rotate: [0, -12, -6] } : { scale: 1, rotate: 0 }} transition={{ ...bouncy, delay: n <= shown ? (n - 1) * 0.05 : 0 }} whileTap={{ scale: 0.8 }}>
            ★
          </m.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {shown ? <m.p key={shown} className="stars-label" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ duration: 0.15 }}>{faces[shown]}</m.p> : null}
      </AnimatePresence>
      <textarea className="pm-note" rows={3} placeholder={tr("Anything we should know? (optional, only the cafe sees this)", "ማወቅ ያለብን ነገር? (አማራጭ፣ ካፌው ብቻ ያየዋል)")} value={comment} onChange={(e) => setComment(e.target.value.slice(0, 500))} />
      <m.button type="button" className="pm-cta" disabled={!stars || sending} whileTap={{ scale: 0.95 }} onClick={async () => {
        setSending(true);
        await post({ type: "feedback", slug, table, rating: stars, comment });
        if (stars >= 4) burst({ colors, count: 70, y: 0.6 });
        onSent();
      }}>
        {sending ? <span className="pm-dots"><i /><i /><i /></span> : tr("Send", "ላክ")}
      </m.button>
    </>
  );
}
