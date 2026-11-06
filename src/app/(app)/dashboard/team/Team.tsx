"use client";

import { useState } from "react";
import { ConfirmButton, PageHead, useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { createInvite, removeMember, setMemberRole } from "../more-actions";

type Member = { id: string; name: string; phone: string; role: "manager" | "staff"; telegram: boolean };

export function Team({ owner, members: initial, limit, appUrl }: { owner: { name: string; phone: string }; members: Member[]; limit: number; appUrl: string }) {
  const { tr } = useTr();
  const { run, toast } = useToast();
  const [members, setMembers] = useState(initial);
  const [link, setLink] = useState<{ url: string; role: string } | null>(null);
  const roles = { manager: tr("Manager · edits menu, prices and settings", "ሥራ አስኪያጅ · ምናሌ፣ ዋጋና ቅንብሮችን ያስተካክላል"), staff: tr("Staff · sold-out switches, orders and calls only", "ሠራተኛ · አልቋል፣ ትዕዛዝና ጥሪ ብቻ") };
  const invite = async (role: "manager" | "staff") => {
    const token = await run(() => createInvite(role));
    if (token) setLink({ url: `${appUrl}/invite/${token}`, role });
  };
  return (
    <div className="stagger narrow">
      <PageHead title={tr("Team", "ቡድን")} sub={tr("Give your staff their own login, so you can see who changed what, and they only see what they need.", "ለሠራተኞችዎ የራሳቸውን መግቢያ ይስጡ፤ ማን ምን እንደቀየረ ያያሉ፣ እነሱም የሚያስፈልጋቸውን ብቻ ያያሉ።")} />
      <section className="box">
        <ul className="people">
          <li><span className="avatar">{owner.name[0]}</span><div><b>{owner.name}</b><small>{owner.phone}</small></div><span className="role owner">{tr("Owner", "ባለቤት")}</span></li>
          {members.map((m) => (
            <li key={m.id} className="pop-in">
              <span className="avatar">{m.name[0]}</span>
              <div><b>{m.name}</b><small>{m.phone}{m.telegram ? " · Telegram ✓" : ""}</small></div>
              <select className="inp" value={m.role} onChange={async (e) => {
                const role = e.target.value as Member["role"];
                setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, role } : x)));
                await run(() => setMemberRole(m.id, role));
              }}>
                <option value="manager">{tr("Manager", "ሥራ አስኪያጅ")}</option>
                <option value="staff">{tr("Staff", "ሠራተኛ")}</option>
              </select>
              <ConfirmButton className="icon-btn" label={<Icon name="trash" />} confirmLabel={tr("Remove?", "ይወገድ?")} onConfirm={async () => { await run(() => removeMember(m.id)); setMembers((ms) => ms.filter((x) => x.id !== m.id)); }} />
            </li>
          ))}
        </ul>
      </section>
      <section className="box">
        <h2>{tr("Invite someone", "ሰው ይጋብዙ")}</h2>
        {limit === 0 ? (
          <p className="sub">{tr("Staff accounts come with the Cafe plan (5 people) and the Group plan (25).", "የሠራተኛ አካውንቶች ከካፌ ጥቅል (5 ሰዎች) እና ከቡድን ጥቅል (25) ጋር ይመጣሉ።")} <a href="/dashboard/shop">{tr("See plans", "ጥቅሎችን ይመልከቱ")} →</a></p>
        ) : (
          <>
            <p className="sub">{tr(`${members.length} of ${limit} people. Send the link by Telegram or SMS; it works once.`, `${limit} ውስጥ ${members.length} ሰዎች። ሊንኩን በቴሌግራም ወይም በኤስኤምኤስ ይላኩ፤ አንድ ጊዜ ብቻ ይሠራል።`)}</p>
            <div className="role-picks">
              {(["manager", "staff"] as const).map((r) => (
                <button key={r} type="button" className="role-pick" onClick={() => invite(r)} disabled={members.length >= limit}>
                  <b>{r === "manager" ? tr("Invite a manager", "ሥራ አስኪያጅ ጋብዝ") : tr("Invite staff", "ሠራተኛ ጋብዝ")}</b>
                  <span>{roles[r]}</span>
                </button>
              ))}
            </div>
            {link ? (
              <div className="invite-link pop-in">
                <span className="qr-link">{link.url}</span>
                <button className="btn sm mus" type="button" onClick={async () => { try { await navigator.clipboard.writeText(link.url); toast(tr("Link copied", "ሊንኩ ተቀድቷል")); } catch { toast(tr("Select the link and copy it.", "ሊንኩን መርጠው ይቅዱ።")); } }}>{tr("Copy", "ቅዳ")}</button>
                <a className="btn sm" href={`https://t.me/share/url?url=${encodeURIComponent(link.url)}&text=${encodeURIComponent(tr("Join our cafe on Gebeta", "በገበታ ካፌያችንን ይቀላቀሉ"))}`} target="_blank" rel="noreferrer"><Icon name="telegram" size={16} /> Telegram</a>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
