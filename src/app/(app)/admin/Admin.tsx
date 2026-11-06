"use client";

import { useState } from "react";
import { LangProvider, ToastProvider, useToast } from "@/components/ui";
import { MotionRoot } from "@/components/motion";
import { approvePlan, connectBot, grantPlan, setShopStatus, supportResetCode } from "./actions";

type Props = {
  appUrl: string;
  bot: boolean;
  totals: { cafes: number; owners: number; scans: number };
  cafes: { id: string; name: string; slug: string; owner: string; phone: string; plan: string; until: string | null; items: number; scans: number; orders: number; at: string }[];
  payments: { id: string; cafe: string; plan: string; months: number; amount: number; method: string; ref: string; status: string; at: string }[];
  orders: { id: string; cafe: string; kind: string; qty: number; led: string; total: number; address: string; phone: string; method: string; ref: string; status: string; at: string }[];
};

export function Admin(p: Props) {
  return (
    <MotionRoot>
      <LangProvider lang="en">
        <ToastProvider>
          <AdminInner {...p} />
        </ToastProvider>
      </LangProvider>
    </MotionRoot>
  );
}

function AdminInner(p: Props) {
  const { run, toast } = useToast();
  const [payments, setPayments] = useState(p.payments);
  const [orders, setOrders] = useState(p.orders);
  const [cafes, setCafes] = useState(p.cafes);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const d = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <main className="admin stagger">
      <header className="page-head"><div><span className="kicker">Gebeta platform</span><h1>Admin</h1></div><a className="btn sm" href="/dashboard">← Dashboard</a></header>
      <section className="kpis">
        <div className="kpi"><small>Cafes</small><b>{p.totals.cafes}</b></div>
        <div className="kpi"><small>Accounts</small><b>{p.totals.owners}</b></div>
        <div className="kpi"><small>Scans, 7 days</small><b>{p.totals.scans}</b></div>
        <div className="kpi"><small>Telegram bot</small><b>{p.bot ? "On" : "Off"}</b><em><button className="btn sm" type="button" onClick={async () => { const r = await run(() => connectBot(p.appUrl)); if (r) toast(r); }}>Connect webhook</button></em></div>
      </section>
      <section className="box">
        <h2>Plan payments to check</h2>
        <table className="tbl"><thead><tr><th>When</th><th>Cafe</th><th>Plan</th><th>Amount</th><th>Paid with</th><th>Ref</th><th /></tr></thead><tbody>
          {payments.map((x) => (
            <tr key={x.id}><td>{d(x.at)}</td><td>{x.cafe}</td><td>{x.plan} × {x.months}</td><td>{x.amount}</td><td>{x.method}</td><td><code>{x.ref}</code></td>
              <td>{x.status === "pending" ? <span className="row"><button className="btn sm mus" type="button" onClick={async () => { await run(() => approvePlan(x.id, true)); setPayments((ps) => ps.map((y) => (y.id === x.id ? { ...y, status: "paid" } : y))); }}>Approve</button><button className="btn sm" type="button" onClick={async () => { await run(() => approvePlan(x.id, false)); setPayments((ps) => ps.map((y) => (y.id === x.id ? { ...y, status: "rejected" } : y))); }}>Reject</button></span> : <span className={`status-pill ${x.status}`}>{x.status}</span>}</td></tr>
          ))}
        </tbody></table>
      </section>
      <section className="box">
        <h2>Stand orders</h2>
        <table className="tbl"><thead><tr><th>When</th><th>Cafe</th><th>Order</th><th>Total</th><th>Deliver to</th><th>Pay</th><th>Status</th></tr></thead><tbody>
          {orders.map((o) => (
            <tr key={o.id}><td>{d(o.at)}</td><td>{o.cafe}</td><td>{o.qty} × {o.kind}{o.led ? ` (${o.led})` : ""}</td><td>{o.total}</td><td>{o.address}<br /><small>{o.phone}</small></td><td>{o.method}{o.ref ? <><br /><code>{o.ref}</code></> : null}</td>
              <td><select className="inp" value={o.status} onChange={async (e) => { const s = e.target.value; await run(() => setShopStatus(o.id, s)); setOrders((os) => os.map((y) => (y.id === o.id ? { ...y, status: s } : y))); }}>{["pending", "paid", "making", "delivered", "cancelled"].map((s) => <option key={s}>{s}</option>)}</select></td></tr>
          ))}
        </tbody></table>
      </section>
      <section className="box">
        <h2>Cafes</h2>
        <table className="tbl"><thead><tr><th>Cafe</th><th>Owner</th><th>Items</th><th>Scans</th><th>Orders</th><th>Plan</th><th>Grant</th></tr></thead><tbody>
          {cafes.map((c) => (
            <tr key={c.id}><td><a href={`/m/${c.slug}`} target="_blank" rel="noreferrer">{c.name}</a><br /><small>{d(c.at)}</small></td><td>{c.owner}<br /><small>{c.phone}</small></td><td>{c.items}</td><td>{c.scans}</td><td>{c.orders}</td><td>{c.plan}{c.until ? <><br /><small>until {new Date(c.until).toLocaleDateString("en-GB")}</small></> : null}</td>
              <td><select className="inp" value="" onChange={async (e) => { const [plan, days] = e.target.value.split(":"); if (!plan) return; await run(() => grantPlan(c.id, plan as "cafe", Number(days))); setCafes((cs) => cs.map((y) => (y.id === c.id ? { ...y, plan, until: plan === "free" ? null : new Date(Date.now() + Number(days) * 864e5).toISOString() } : y))); }}><option value="">…</option><option value="cafe:30">Cafe 30 days</option><option value="cafe:365">Cafe 1 year</option><option value="group:30">Group 30 days</option><option value="free:0">Back to free</option></select></td></tr>
          ))}
        </tbody></table>
      </section>
      <section className="box">
        <h2>Support: password reset code</h2>
        <p className="sub">For owners who never connected Telegram. Check it's really them (call the number), then read them the code.</p>
        <form className="row" onSubmit={async (e) => { e.preventDefault(); const c = await run(() => supportResetCode(phone)); setCode(c ?? "No account with that number"); }}>
          <input className="inp" placeholder="0911 23 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} style={{ maxWidth: 240 }} />
          <button className="btn" type="submit">Make code</button>
          {code ? <b className="qr-link">{code}</b> : null}
        </form>
      </section>
    </main>
  );
}
