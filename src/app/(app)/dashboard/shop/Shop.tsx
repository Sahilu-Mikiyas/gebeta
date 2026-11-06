"use client";

import { useState } from "react";
import { PageHead, useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { PLANS, STANDS, standTotal, type StandId } from "@/lib/plans";
import { orderStands, requestPlan } from "../more-actions";

type Props = {
  plan: "free" | "cafe" | "group";
  planUntil: string | null;
  accounts: { telebirr: string; cbe: string; chapa: boolean };
  defaultPhone: string;
  defaultAddress: string;
  orders: { id: string; kind: string; qty: number; total: number; status: string; at: string }[];
  payments: { id: string; plan: string; months: number; amount: number; status: string; at: string }[];
};

const LEDS = [["#ffb547", "Amber"], ["#fff1d6", "Warm white"], ["#ff5f87", "Rose"], ["#5fe39a", "Green"]];

export function Shop(p: Props) {
  const { tr, lang } = useTr();
  const { run, toast } = useToast();
  const [kind, setKind] = useState<StandId>("acrylic");
  const [qty, setQty] = useState(10);
  const [led, setLed] = useState("Amber");
  const [address, setAddress] = useState(p.defaultAddress);
  const [phone, setPhone] = useState(p.defaultPhone);
  const [method, setMethod] = useState<"telebirr" | "cbe" | "delivery" | "chapa">("delivery");
  const [ref, setRef] = useState("");
  const [orders, setOrders] = useState(p.orders);
  const [planPick, setPlanPick] = useState<"cafe" | "group">("cafe");
  const [months, setMonths] = useState(1);
  const [pMethod, setPMethod] = useState<"telebirr" | "cbe" | "chapa">("telebirr");
  const [pRef, setPRef] = useState("");
  const [payments, setPayments] = useState(p.payments);
  const t = standTotal(kind, qty);
  const STATUS: Record<string, string> = { pending: tr("Waiting for payment check", "ክፍያ እየተረጋገጠ"), paid: tr("Paid", "ተከፍሏል"), making: tr("Being made", "እየተሠራ"), delivered: tr("Delivered", "ደርሷል"), cancelled: tr("Cancelled", "ተሰርዟል"), rejected: tr("Payment not found", "ክፍያ አልተገኘም") };

  const PayInfo = ({ m }: { m: string }) =>
    m === "telebirr" && p.accounts.telebirr ? <p className="pay-info">{tr("Send to Telebirr", "በቴሌብር ይላኩ")}: <b>{p.accounts.telebirr}</b></p>
      : m === "cbe" && p.accounts.cbe ? <p className="pay-info">{tr("Transfer to CBE account", "ወደ ሲቢኢ አካውንት ያስተላልፉ")}: <b>{p.accounts.cbe}</b></p>
      : m === "telebirr" || m === "cbe" ? <p className="pay-info">{tr("We'll send you the account number by phone after you order.", "ካዘዙ በኋላ የአካውንት ቁጥሩን በስልክ እንልክልዎታለን።")}</p> : null;

  return (
    <div className="stagger">
      <PageHead title={tr("Shop & plan", "ሱቅና ጥቅል")} sub={tr("Order stands and screens, and upgrade your plan. Pay with Telebirr, CBE Birr or cash on delivery.", "መቆሚያና ስክሪን ይዘዙ፣ ጥቅልዎን ያሳድጉ። በቴሌብር፣ በሲቢኢ ብር ወይም ሲደርስ በጥሬ ገንዘብ ይክፈሉ።")} />

      <section className="plans">
        {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((id, i) => {
          const pl = PLANS[id];
          const on = p.plan === id;
          return (
            <article key={id} className={`plan-card ${id}${on ? " on" : ""}`} style={{ ["--i" as string]: i }}>
              <span className="k">{lang === "am" ? pl.am : pl.en}</span>
              <b className="amt">{pl.price.toLocaleString("en-US")} <small>{tr("birr / month", "ብር / በወር")}</small></b>
              <ul>
                <li>{pl.items === Infinity ? tr("Unlimited items", "ያልተገደበ ምግብ") : tr(`Up to ${pl.items} items`, `እስከ ${pl.items} ምግቦች`)}</li>
                <li>{pl.ordering ? tr("Table ordering & kitchen view", "የጠረጴዛ ትዕዛዝና የኩሽና እይታ") : tr("Waiter calls & bill requests", "የአስተናጋጅ ጥሪና የሂሳብ ጥያቄ")}</li>
                <li>{pl.staff ? tr(`${pl.staff} staff accounts`, `${pl.staff} የሠራተኛ አካውንቶች`) : tr("Owner login only", "የባለቤት መግቢያ ብቻ")}</li>
                <li>{pl.branches > 1 ? tr(`Up to ${pl.branches} branches`, `እስከ ${pl.branches} ቅርንጫፎች`) : tr("One cafe", "አንድ ካፌ")}</li>
                <li>{pl.label ? tr("Small Gebeta label on the menu", "በምናሌው ላይ ትንሽ የገበታ ምልክት") : tr("No Gebeta label", "የገበታ ምልክት የለም")}</li>
              </ul>
              {on ? <span className="tag-mini">{tr("Your plan", "የእርስዎ ጥቅል")}{p.planUntil && id !== "free" ? ` · ${tr("until", "እስከ")} ${new Date(p.planUntil).toLocaleDateString("en-GB")}` : ""}</span>
                : id !== "free" ? <button className="btn sm red" type="button" onClick={() => setPlanPick(id)}>{tr("Choose", "ምረጥ")}</button> : null}
            </article>
          );
        })}
      </section>

      <section className="box">
        <h2>{tr(`Upgrade to ${PLANS[planPick].en}`, `ወደ ${PLANS[planPick].am} ያሳድጉ`)}</h2>
        <form className="grid3" onSubmit={async (e) => {
          e.preventDefault();
          if (pMethod !== "chapa" && pRef.trim().length < 3) return toast(tr("Enter the transaction number from your payment SMS.", "ከክፍያ ኤስኤምኤስዎ የግብይት ቁጥሩን ያስገቡ።"), { bad: true });
          const pid = await run(() => requestPlan({ plan: planPick, months, payMethod: pMethod, payRef: pRef.trim() }));
          if (pid && pMethod === "chapa") { location.href = `/api/chapa/start?kind=plan&id=${pid}`; return; }
          if (pid) { setPayments((x) => [{ id: String(Date.now()), plan: planPick, months, amount: PLANS[planPick].price * months, status: "pending", at: new Date().toISOString() }, ...x]); setPRef(""); toast(tr("Thanks! We'll switch on your plan once we confirm the payment, usually within a few hours.", "እናመሰግናለን! ክፍያውን ስናረጋግጥ ጥቅልዎን እናበራለን፤ ብዙውን ጊዜ በጥቂት ሰዓታት ውስጥ።")); }
        }}>
          <label className="f">{tr("Months", "ወራት")}
            <select className="inp" value={months} onChange={(e) => setMonths(Number(e.target.value))}>{[1, 3, 6, 12].map((m) => <option key={m} value={m}>{m} · {(PLANS[planPick].price * m).toLocaleString("en-US")} {tr("birr", "ብር")}</option>)}</select>
          </label>
          <label className="f">{tr("Paid with", "የተከፈለው በ")}
            <select className="inp" value={pMethod} onChange={(e) => setPMethod(e.target.value as "telebirr")}><option value="telebirr">Telebirr</option><option value="cbe">CBE Birr / CBE</option>{p.accounts.chapa ? <option value="chapa">{tr("Pay online (Chapa)", "በመስመር ላይ ክፈል (ቻፓ)")}</option> : null}</select>
          </label>
          {pMethod !== "chapa" ? <label className="f">{tr("Transaction number", "የግብይት ቁጥር")}<input className="inp" value={pRef} onChange={(e) => setPRef(e.target.value)} placeholder="e.g. CJ71ABCD12" /></label> : <span />}
          <PayInfo m={pMethod} />
          <button className="btn red" type="submit">{tr("Send for confirmation", "ለማረጋገጫ ላክ")}</button>
        </form>
        {payments.length ? <ul className="rule-list">{payments.map((x) => <li key={x.id}><b>{PLANS[x.plan as "cafe"]?.en} × {x.months}</b><span>{x.amount.toLocaleString("en-US")} {tr("birr", "ብር")}</span><span className={`status-pill ${x.status}`}>{STATUS[x.status] ?? x.status}</span></li>)}</ul> : null}
      </section>

      <section className="box shop">
        <h2>{tr("Order stands & screens", "መቆሚያና ስክሪን ይዘዙ")}</h2>
        <div className="stand-picks">
          {(Object.keys(STANDS) as StandId[]).map((k, i) => (
            <button key={k} type="button" className={`stand-pick ${k}${kind === k ? " on" : ""}`} style={{ ["--i" as string]: i, ["--led" as string]: LEDS.find((l) => l[1] === led)![0] }} onClick={() => { setKind(k); if (k === "tv") setQty(1); }}>
              <span className={`mini-stand ${k}`}><i /><u /></span>
              <b>{lang === "am" ? STANDS[k].am : STANDS[k].en}</b>
              <span>{STANDS[k].price.toLocaleString("en-US")} {tr("birr", "ብር")}</span>
            </button>
          ))}
        </div>
        <form className="order-form" onSubmit={async (e) => {
          e.preventDefault();
          if ((method === "telebirr" || method === "cbe") && ref.trim().length < 3) return toast(tr("Enter the transaction number, or choose pay on delivery.", "የግብይት ቁጥሩን ያስገቡ፣ ወይም ሲደርስ ክፈል ይምረጡ።"), { bad: true });
          const id = await run(() => orderStands({ kind, qty, ledColor: kind === "led" ? led : "", address, phone, payMethod: method, payRef: ref.trim() }));
          if (id && method === "chapa") { location.href = `/api/chapa/start?kind=shop&id=${id}`; return; }
          if (id) { setOrders((o) => [{ id, kind, qty, total: t.total, status: "pending", at: new Date().toISOString() }, ...o]); setRef(""); toast(tr("Order sent! We'll call you to confirm delivery.", "ትዕዛዙ ተልኳል! ማድረሻውን ለማረጋገጥ እንደውልልዎታለን።")); }
        }}>
          <div className="grid3">
            <label className="f">{tr("How many", "ብዛት")}<input className="inp num" type="number" min={1} max={kind === "tv" ? 6 : 100} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(kind === "tv" ? 6 : 100, Number(e.target.value) || 1)))} /></label>
            {kind === "led" ? (
              <div className="f">{tr("LED colour", "የLED ቀለም")}
                <div className="swatches">{LEDS.map(([c, n]) => <button key={n} type="button" aria-label={n} className={`swatch${led === n ? " on" : ""}`} style={{ background: c }} onClick={() => setLed(n)} />)}</div>
              </div>
            ) : <span />}
            <label className="f">{tr("Phone for delivery", "ለማድረሻ ስልክ")}<input className="inp" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required /></label>
          </div>
          <label className="f">{tr("Delivery address in Addis", "በአዲስ አበባ የማድረሻ አድራሻ")}<input className="inp" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={tr("Bole, near Edna Mall, 2nd floor", "ቦሌ፣ ኤድና ሞል አጠገብ፣ 2ኛ ፎቅ")} required minLength={4} /></label>
          <div className="seg wrap">
            {([["delivery", tr("Pay on delivery", "ሲደርስ ክፈል")], ["telebirr", "Telebirr"], ["cbe", "CBE Birr"], ...(p.accounts.chapa ? [["chapa", tr("Card / Chapa", "ካርድ / ቻፓ")]] : [])] as [typeof method, string][]).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={method === v} onClick={() => setMethod(v)}>{l}</button>
            ))}
          </div>
          <PayInfo m={method} />
          {method === "telebirr" || method === "cbe" ? <label className="f">{tr("Transaction number", "የግብይት ቁጥር")}<input className="inp" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. CJ71ABCD12" /></label> : null}
          <div className="receipt-line">
            <span>{qty} × {STANDS[kind].en}</span><b>{t.subtotal.toLocaleString("en-US")}</b>
            {t.discount ? <><span>{tr("Bulk discount", "የጅምላ ቅናሽ")}</span><b>−{t.discount.toLocaleString("en-US")}</b></> : null}
            <span>{tr("Delivery", "ማድረሻ")}</span><b>{t.delivery ? t.delivery : tr("Free", "ነፃ")}</b>
            <span className="tot">{tr("Total", "ጠቅላላ")}</span><b className="tot">{t.total.toLocaleString("en-US")} {tr("birr", "ብር")}</b>
          </div>
          <button className="btn red big" type="submit"><Icon name="cart" /> {tr("Place order", "እዘዝ")}</button>
        </form>
        {orders.length ? <ul className="rule-list">{orders.map((o) => <li key={o.id}><b>{o.qty} × {STANDS[o.kind as StandId]?.en ?? o.kind}</b><span>{o.total.toLocaleString("en-US")} {tr("birr", "ብር")}</span><span className={`status-pill ${o.status}`}>{STATUS[o.status] ?? o.status}</span></li>)}</ul> : null}
      </section>
    </div>
  );
}
