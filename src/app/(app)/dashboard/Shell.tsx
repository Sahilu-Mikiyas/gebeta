"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LangProvider, ToastProvider, useToast } from "@/components/ui";
import type { Lang } from "@/lib/i18n";
import type { Role } from "@/lib/access";
import { switchCafe } from "./actions";
import { Icon } from "@/components/Icon";

type NavItem = { href: string; en: string; am: string; icon: string; min: Role; badge?: "orders" };
const NAV: { en: string; am: string; items: NavItem[] }[] = [
  {
    en: "Run",
    am: "ሥራ",
    items: [
      { href: "/dashboard", en: "Today", am: "ዛሬ", icon: "today", min: "staff" },
      { href: "/dashboard/orders", en: "Orders & calls", am: "ትዕዛዝና ጥሪ", icon: "orders", min: "staff", badge: "orders" },
      { href: "/dashboard/menu", en: "Menu", am: "ምናሌ", icon: "menu", min: "manager" },
      { href: "/dashboard/specials", en: "Specials & timing", am: "ልዩና ሰዓት", icon: "star", min: "manager" },
    ],
  },
  {
    en: "Look",
    am: "ገጽታ",
    items: [
      { href: "/dashboard/design", en: "Design", am: "ዲዛይን", icon: "design", min: "manager" },
      { href: "/dashboard/info", en: "Cafe info", am: "የካፌ መረጃ", icon: "info", min: "manager" },
      { href: "/dashboard/print", en: "QR & print", am: "QR እና ህትመት", icon: "qr", min: "manager" },
      { href: "/dashboard/screen", en: "Menu screen", am: "የምናሌ ስክሪን", icon: "screen", min: "manager" },
    ],
  },
  {
    en: "Grow",
    am: "ዕድገት",
    items: [
      { href: "/dashboard/insights", en: "Insights", am: "ትንታኔ", icon: "insights", min: "manager" },
      { href: "/dashboard/history", en: "History & undo", am: "ታሪክና መቀልበስ", icon: "history", min: "manager" },
    ],
  },
  {
    en: "Business",
    am: "ንግድ",
    items: [
      { href: "/dashboard/team", en: "Team", am: "ቡድን", icon: "team", min: "owner" },
      { href: "/dashboard/branches", en: "Branches", am: "ቅርንጫፎች", icon: "branches", min: "owner" },
      { href: "/dashboard/shop", en: "Shop & plan", am: "ሱቅና ጥቅል", icon: "shop", min: "owner" },
      { href: "/dashboard/account", en: "Account", am: "አካውንት", icon: "account", min: "staff" },
    ],
  },
];
const RANK: Record<Role, number> = { staff: 1, manager: 2, owner: 3 };

export function Shell(props: {
  lang: Lang;
  role: Role;
  user: { name: string };
  cafe: { id: string; slug: string; nameEn: string; nameAm: string; plan: string };
  cafes: { id: string; nameEn: string; role: Role }[];
  badges: { orders: number };
  admin: boolean;
  children: ReactNode;
}) {
  return (
    <LangProvider lang={props.lang}>
      <ToastProvider>
        <ShellInner {...props} />
      </ToastProvider>
    </LangProvider>
  );
}

function ShellInner({ lang, role, user, cafe, cafes, badges, admin, children }: Parameters<typeof Shell>[0]) {
  const path = usePathname();
  const router = useRouter();
  const { status } = useToast();
  const [drawer, setDrawer] = useState(false);
  const tr = (en: string, am: string) => (lang === "am" ? am : en);
  const items = NAV.map((g) => ({ ...g, items: g.items.filter((i) => RANK[role] >= RANK[i.min]) })).filter((g) => g.items.length);
  const flat = items.flatMap((g) => g.items);
  const isActive = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

  // Keep the order badge fresh without reloading the page.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 45_000);
    return () => clearInterval(id);
  }, [router]);
  useEffect(() => setDrawer(false), [path]);

  const statusText = status === "saving" ? tr("Saving…", "በማስቀመጥ ላይ…") : status === "saved" ? tr("All changes saved", "ተቀምጧል") : status === "error" ? tr("Not saved", "አልተቀመጠም") : "";
  const tabs = flat.filter((i) => ["/dashboard", "/dashboard/orders", "/dashboard/menu", "/dashboard/print"].includes(i.href)).slice(0, 4);

  const nav = (
    <nav className="side-nav" aria-label={tr("Dashboard", "ዳሽቦርድ")}>
      {items.map((g) => (
        <div key={g.en} className="side-group">
          <span className="side-label">{tr(g.en, g.am)}</span>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} className={`side-link${isActive(i.href) ? " on" : ""}`} prefetch>
              <Icon name={i.icon} className="ic" />
              <span>{tr(i.en, i.am)}</span>
              {i.badge && badges.orders ? <b className="badge pop">{badges.orders}</b> : null}
            </Link>
          ))}
        </div>
      ))}
      {admin ? (
        <div className="side-group">
          <span className="side-label">Gebeta</span>
          <Link href="/admin" className="side-link">
            <Icon name="flag" className="ic" />
            <span>Admin</span>
          </Link>
        </div>
      ) : null}
    </nav>
  );

  return (
    <div className="app">
      <aside className={`side${drawer ? " open" : ""}`}>
        <div className="side-top">
          <Link className="brand" href="/" aria-label="Gebeta">
            <b>GEBETA</b>
            <span>ገበታ</span>
          </Link>
          <button className="x only-mobile" type="button" onClick={() => setDrawer(false)} aria-label={tr("Close menu", "ዝጋ")}>
            ✕
          </button>
        </div>
        <div className="cafe-pick">
          <span className="side-label">{tr("Cafe", "ካፌ")}</span>
          {cafes.length > 1 ? (
            <select
              className="inp"
              value={cafe.id}
              onChange={async (e) => {
                await switchCafe(e.target.value);
                router.refresh();
              }}
            >
              {cafes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn}
                </option>
              ))}
            </select>
          ) : (
            <b className="cafe-name">{lang === "am" && cafe.nameAm ? cafe.nameAm : cafe.nameEn}</b>
          )}
          <span className={`plan-chip ${cafe.plan}`}>{cafe.plan === "free" ? tr("Free plan", "ነፃ ጥቅል") : cafe.plan === "cafe" ? tr("Cafe plan", "የካፌ ጥቅል") : tr("Group plan", "የቡድን ጥቅል")}</span>
        </div>
        {nav}
        <div className="side-foot">
          <span className="who">
            {user.name} · {role === "owner" ? tr("Owner", "ባለቤት") : role === "manager" ? tr("Manager", "ሥራ አስኪያጅ") : tr("Staff", "ሠራተኛ")}
          </span>
          <div className="row">
            <a className="langlink" href={`/lang?to=${lang === "am" ? "en" : "am"}&back=${encodeURIComponent(path)}`}>
              {lang === "am" ? "English" : "አማርኛ"}
            </a>
            <form action="/logout" method="post">
              <button className="linkish" type="submit">
                {tr("Log out", "ውጣ")}
              </button>
            </form>
          </div>
        </div>
      </aside>
      {drawer ? <div className="scrim" onClick={() => setDrawer(false)} /> : null}

      <div className="main">
        <div className="topbar">
          <button className="burger only-mobile" type="button" onClick={() => setDrawer(true)} aria-label={tr("Open menu", "ምናሌ ክፈት")}>
            <i />
            <i />
            <i />
          </button>
          <span className="top-cafe only-mobile">{cafe.nameEn}</span>
          <span className={`save-status ${status}`} role="status" aria-live="polite">
            {statusText}
          </span>
          <a className="btn sm ink" href={`/m/${cafe.slug}`} target="_blank" rel="noreferrer">
            {tr("Live menu", "ምናሌውን ክፈት")} ↗
          </a>
        </div>
        <div className="page" key={path}>
          {children}
        </div>
      </div>

      <nav className="tabbar only-mobile" aria-label={tr("Quick links", "ፈጣን ሊንኮች")}>
        {tabs.map((i) => (
          <Link key={i.href} href={i.href} className={isActive(i.href) ? "on" : ""}>
            <Icon name={i.icon} className="ic" />
            <span>{tr(i.en, i.am)}</span>
            {i.badge && badges.orders ? <b className="badge">{badges.orders}</b> : null}
          </Link>
        ))}
        <button type="button" onClick={() => setDrawer(true)}>
          <Icon name="more" className="ic" />
          <span>{tr("More", "ተጨማሪ")}</span>
        </button>
      </nav>
    </div>
  );
}
