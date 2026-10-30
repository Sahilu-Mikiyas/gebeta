"use client";

import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { MenuView } from "@/components/MenuView";
import { t, pick, type Lang, type UIKey } from "@/lib/i18n";
import { TEMPLATES } from "@/lib/templates";
import type { CafeDTO, CategoryDTO, ItemDTO, MenuDTO } from "@/lib/types";
import * as A from "./actions";

export type Stats = { days: { key: string; label: string; count: number }[]; total: number; amharicPct: number };
type Tab = "menu" | "design" | "info" | "qr" | "screen" | "stats";
type Status = "idle" | "saving" | "saved" | "error";

export function Editor({ initial, stats, appUrl, lang }: { initial: MenuDTO; stats: Stats; appUrl: string; lang: Lang }) {
  const T = (k: UIKey) => t(lang, k);
  const [menu, setMenu] = useState(initial);
  const [tab, setTab] = useState<Tab>("menu");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [previewLang, setPreviewLang] = useState<Lang>(lang);
  const [previewFast, setPreviewFast] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [toast, setToast] = useState<{ msg: string; bad?: boolean } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const inFlight = useRef(0);
  const failed = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function flash(msg: string, bad = false) {
    setToast({ msg, bad });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }

  // Runs a server action and tracks the save indicator. Returns undefined on failure.
  async function run<R>(fn: () => Promise<R>): Promise<R | undefined> {
    inFlight.current++;
    setStatus("saving");
    try {
      const r = await fn();
      failed.current = false;
      return r;
    } catch {
      failed.current = true;
      flash(T("saveFailed"), true);
      return undefined;
    } finally {
      inFlight.current--;
      if (inFlight.current === 0) setStatus(failed.current ? "error" : "saved");
    }
  }

  // For changes that restructure the menu, the server returns the whole menu.
  async function structural(fn: () => Promise<MenuDTO>) {
    const m = await run(fn);
    if (m) setMenu(m);
    return m;
  }

  const patchCafe = (f: Partial<CafeDTO>) => setMenu((m) => ({ ...m, cafe: { ...m.cafe, ...f } }));
  const patchCat = (id: string, f: Partial<CategoryDTO>) =>
    setMenu((m) => ({ ...m, categories: m.categories.map((c) => (c.id === id ? { ...c, ...f } : c)) }));
  const patchItem = (id: string, f: Partial<ItemDTO>) =>
    setMenu((m) => ({
      ...m,
      categories: m.categories.map((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, ...f } : i)) })),
    }));

  async function upload(target: string, file: File | undefined) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return flash(T("photoFailed"), true);
    setUploading(target);
    try {
      const blob = await resizeImage(file);
      const fd = new FormData();
      fd.append("target", target);
      fd.append("file", new File([blob], "photo", { type: blob.type }));
      const r = await run(() => A.uploadImage(fd));
      if (r?.ok) {
        if (target === "logo") patchCafe({ logoId: r.imageId });
        else patchItem(target, { imageId: r.imageId });
      } else if (r) flash(T("photoFailed"), true);
    } catch {
      flash(T("photoFailed"), true);
    } finally {
      setUploading(null);
    }
  }

  async function removePhoto(target: string) {
    if (target === "logo") patchCafe({ logoId: null });
    else patchItem(target, { imageId: null });
    await run(() => A.removeImage(target));
  }

  const ops: ItemOps = {
    T,
    lang,
    uploading,
    live: patchItem,
    save: (id, f) => run(() => A.updateItem(id, f)),
    soldOut: (id, on) => {
      patchItem(id, { soldOut: on });
      run(() => A.setSoldOut(id, on));
    },
    remove: (id) => structural(() => A.deleteItem(id)),
    move: (id, dir) => structural(() => A.moveItem(id, dir)),
    moveTo: (id, cat) => structural(() => A.moveItemToCategory(id, cat)),
    upload,
    removePhoto,
  };

  const menuUrl = `${appUrl}/m/${menu.cafe.slug}`;
  const statusText = status === "saving" ? T("saving") : status === "saved" ? T("saved") : status === "error" ? T("saveFailed") : "";

  return (
    <>
      <header className="dash-top">
        <div className="in">
          <a className="brand" href="/" aria-label="Gebeta">
            <b>GEBETA</b>
            <span>ገበታ</span>
          </a>
          <span className="cafe">{pick(lang, menu.cafe.nameEn, menu.cafe.nameAm)}</span>
          <span className={`status${status === "error" ? " err" : ""}`} role="status" aria-live="polite">
            {statusText}
          </span>
          <a className="linkish" href={`/m/${menu.cafe.slug}`} target="_blank" rel="noreferrer">
            {T("viewLive")} ↗
          </a>
          <a className="langlink" href={`/lang?to=${lang === "am" ? "en" : "am"}&back=/dashboard`}>
            {lang === "am" ? "EN" : "አማ"}
          </a>
          <form action="/logout" method="post">
            <button className="linkish" type="submit">
              {T("logout")}
            </button>
          </form>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        <div className="in">
          {(
            [
              ["menu", "tabMenu"],
              ["design", "tabDesign"],
              ["info", "tabInfo"],
              ["qr", "tabQr"],
              ["screen", "tabScreen"],
              ["stats", "tabStats"],
            ] as [Tab, UIKey][]
          ).map(([id, key]) => (
            <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => { setTab(id); setView("edit"); }}>
              {T(key)}
            </button>
          ))}
        </div>
      </nav>

      <main className="dash" data-view={view}>
        <div className="pane">
          {tab === "menu" ? <MenuTab menu={menu} ops={ops} structural={structural} run={run} patchCat={patchCat} flash={flash} /> : null}
          {tab === "design" ? (
            <section className="box">
              <h2>{T("designTitle")}</h2>
              <p className="sub">{T("designSub")}</p>
              <div className="tpls">
                {TEMPLATES.map((tp) => (
                  <button
                    key={tp.id}
                    type="button"
                    className="tpl"
                    aria-pressed={menu.cafe.template === tp.id}
                    onClick={() => {
                      patchCafe({ template: tp.id });
                      run(() => A.setTemplate(tp.id));
                    }}
                  >
                    <span className="sw" style={{ background: tp.swatch[0], color: tp.swatch[2] }}>
                      <i style={{ background: tp.swatch[1] }} />
                      <u />
                      <u />
                    </span>
                    <span>{lang === "am" ? tp.am : tp.en}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
          {tab === "info" ? <InfoTab cafe={menu.cafe} T={T} run={run} patchCafe={patchCafe} upload={upload} removePhoto={removePhoto} uploading={uploading} flash={flash} menuUrl={menuUrl} appUrl={appUrl} /> : null}
          {tab === "qr" ? (
            <>
              <section className="box">
                <h2>{T("qrTitle")}</h2>
                <div className="qr-wrap">
                  <img src={`/m/${menu.cafe.slug}/qr?format=svg`} alt={menuUrl} width={220} height={220} />
                  <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
                    <p className="sub">{T("qrSub")}</p>
                    <span className="qr-link">{menuUrl}</span>
                    <div className="row">
                      <a className="btn mus sm" href={`/m/${menu.cafe.slug}/qr?format=png&download=1`}>
                        {T("dlPng")}
                      </a>
                      <a className="btn sm" href={`/m/${menu.cafe.slug}/qr?format=svg&download=1`}>
                        {T("dlSvg")}
                      </a>
                      <a className="btn red sm" href="/dashboard/print" target="_blank" rel="noreferrer">
                        {T("printCards")}
                      </a>
                    </div>
                  </div>
                </div>
              </section>
              <section className="box">
                <h3>{T("standsTitle")}</h3>
                <p className="sub">{T("standsSub")}</p>
              </section>
            </>
          ) : null}
          {tab === "screen" ? (
            <ScreenTab cafe={menu.cafe} T={T} appUrl={appUrl} onChange={(f) => { patchCafe(f); run(() => A.updateScreen(f)); }} />
          ) : null}
          {tab === "stats" ? (
            <section className="box">
              <h2>{T("statsTitle")}</h2>
              <p className="sub">{T("statsSub")}</p>
              <div className="row" style={{ gap: 28 }}>
                <div>
                  <div className="big">{stats.total}</div>
                  <span className="hint">{T("total")}</span>
                </div>
                {stats.total ? (
                  <div>
                    <div className="big">{stats.amharicPct}%</div>
                    <span className="hint">{T("readAmharic")}</span>
                  </div>
                ) : null}
              </div>
              {stats.total ? (
                <div>
                  <div className="bars">
                    {stats.days.map((d) => {
                      const max = Math.max(...stats.days.map((x) => x.count), 1);
                      return (
                        <div key={d.key} className={`bar${d.count === max ? " top" : ""}`}>
                          <span>{d.count}</span>
                          <i style={{ height: `${(d.count / max) * 82}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <div className="days">
                    {stats.days.map((d) => (
                      <span key={d.key}>{d.label}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="empty">{T("statsEmpty")}</p>
              )}
            </section>
          ) : null}
        </div>

        <aside className="preview-col" aria-label={T("preview")}>
          <div className="phone">
            <div className="notch" />
            <div className="scr">
              <MenuView
                cafe={menu.cafe}
                categories={menu.categories}
                lang={previewLang}
                fastOnly={previewFast}
                controls={{ kind: "buttons", onLang: setPreviewLang, onFast: () => setPreviewFast((f) => !f) }}
              />
            </div>
          </div>
          <span className="hint">{menuUrl}</span>
        </aside>
      </main>

      <div className="mobile-switch">
        <button className="btn ink" type="button" onClick={() => setView((v) => (v === "edit" ? "preview" : "edit"))}>
          {view === "edit" ? T("preview") : T("edit")}
        </button>
      </div>

      {toast ? (
        <div className={`toast${toast.bad ? " bad" : ""}`} role="status">
          {toast.msg}
        </div>
      ) : null}
    </>
  );
}

// ---------------- menu tab ----------------

type ItemOps = {
  T: (k: UIKey) => string;
  lang: Lang;
  uploading: string | null;
  live: (id: string, f: Partial<ItemDTO>) => void;
  save: (id: string, f: Partial<Pick<ItemDTO, "nameEn" | "nameAm" | "descEn" | "descAm" | "price" | "fasting">>) => Promise<unknown>;
  soldOut: (id: string, on: boolean) => void;
  remove: (id: string) => Promise<unknown>;
  move: (id: string, dir: -1 | 1) => Promise<unknown>;
  moveTo: (id: string, categoryId: string) => Promise<unknown>;
  upload: (target: string, file: File | undefined) => Promise<void>;
  removePhoto: (target: string) => Promise<void>;
};

function MenuTab({
  menu,
  ops,
  structural,
  run,
  patchCat,
  flash,
}: {
  menu: MenuDTO;
  ops: ItemOps;
  structural: (fn: () => Promise<MenuDTO>) => Promise<MenuDTO | undefined>;
  run: <R>(fn: () => Promise<R>) => Promise<R | undefined>;
  patchCat: (id: string, f: Partial<CategoryDTO>) => void;
  flash: (m: string, bad?: boolean) => void;
}) {
  const { T } = ops;
  const [pct, setPct] = useState("10");
  const [scope, setScope] = useState("");
  const [secEn, setSecEn] = useState("");
  const [secAm, setSecAm] = useState("");
  const cats = menu.categories;

  return (
    <>
      {cats.some((c) => c.items.length) ? (
        <section className="box">
          <h3>{T("changePrices")}</h3>
          <p className="sub">{T("changePricesSub")}</p>
          <div className="bulk">
            <label className="f" htmlFor="bulk-scope">
              {T("applyTo")}
              <select className="inp" id="bulk-scope" value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="">{T("allSections")}</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {pick(ops.lang, c.nameEn, c.nameAm)}
                  </option>
                ))}
              </select>
            </label>
            <label className="f" htmlFor="bulk-pct">
              %
              <input className="inp num pct" id="bulk-pct" inputMode="numeric" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^0-9-]/g, "").slice(0, 4))} />
            </label>
            <button
              className="btn mus"
              type="button"
              onClick={async () => {
                const n = parseInt(pct, 10);
                if (!n || n < -50 || n > 100) return;
                if (await structural(() => A.bulkPrice(n, scope || null))) flash(`${T("pricesChanged")} (${n > 0 ? "+" : ""}${n}%)`);
              }}
            >
              {T("apply")}
            </button>
          </div>
        </section>
      ) : null}

      {cats.length === 0 ? <p className="box">{T("emptyMenu")}</p> : null}

      {cats.map((c, ci) => (
        <section key={c.id} className="sec">
          <div className="sec-h">
            <label className="f" htmlFor={`cen-${c.id}`}>
              {T("sectionEn")}
              <Field
                id={`cen-${c.id}`}
                className="inp"
                value={c.nameEn}
                required
                onLive={(v) => patchCat(c.id, { nameEn: v })}
                onCommit={(v) => run(() => A.updateCategory(c.id, { nameEn: v }))}
              />
            </label>
            <label className="f" htmlFor={`cam-${c.id}`}>
              {T("sectionAm")}
              <Field
                id={`cam-${c.id}`}
                className="inp am"
                value={c.nameAm}
                onLive={(v) => patchCat(c.id, { nameAm: v })}
                onCommit={(v) => run(() => A.updateCategory(c.id, { nameAm: v }))}
              />
            </label>
            <div className="tools">
              <button className="btn sm" type="button" aria-label={T("moveUp")} disabled={ci === 0} onClick={() => structural(() => A.moveCategory(c.id, -1))}>
                ↑
              </button>
              <button className="btn sm" type="button" aria-label={T("moveDown")} disabled={ci === cats.length - 1} onClick={() => structural(() => A.moveCategory(c.id, 1))}>
                ↓
              </button>
              <ConfirmButton className="btn sm" label="✕" confirmLabel={T("confirmDeleteSection")} ariaLabel={T("deleteSection")} onConfirm={() => structural(() => A.deleteCategory(c.id))} />
            </div>
          </div>
          <div className="items">
            {c.items.length === 0 ? <p className="empty">{T("emptySection")}</p> : null}
            {c.items.map((it, ii) => (
              <ItemRow key={it.id} item={it} first={ii === 0} last={ii === c.items.length - 1} cats={cats} ops={ops} />
            ))}
          </div>
          <AddItemRow categoryId={c.id} T={T} structural={structural} />
        </section>
      ))}

      <section className="box">
        <h3>{T("addSection")}</h3>
        <form
          className="grid2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!secEn.trim()) return;
            if (await structural(() => A.addCategory(secEn.trim(), secAm.trim()))) {
              setSecEn("");
              setSecAm("");
            }
          }}
        >
          <label className="f" htmlFor="new-sec-en">
            {T("sectionEn")}
            <input className="inp" id="new-sec-en" value={secEn} onChange={(e) => setSecEn(e.target.value)} placeholder={t("en", "newSectionPh")} maxLength={80} required />
          </label>
          <label className="f" htmlFor="new-sec-am">
            {T("sectionAm")}
            <input className="inp am" id="new-sec-am" value={secAm} onChange={(e) => setSecAm(e.target.value)} placeholder={t("am", "newSectionPh")} maxLength={80} />
          </label>
          <button className="btn red" type="submit">
            + {T("addSection")}
          </button>
        </form>
      </section>
      <p className="hint">{T("soldOutHint")}</p>
    </>
  );
}

function ItemRow({ item, first, last, cats, ops }: { item: ItemDTO; first: boolean; last: boolean; cats: CategoryDTO[]; ops: ItemOps }) {
  const { T } = ops;
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const busy = ops.uploading === item.id;
  return (
    <div className={`it${item.soldOut ? " out" : ""}`}>
      <button type="button" className="ph" onClick={() => fileRef.current?.click()} aria-label={item.imageId ? T("changePhoto") : T("addPhoto")} disabled={busy}>
        {busy ? T("uploading") : item.imageId ? <img src={`/media/${item.imageId}`} alt="" /> : `+ ${T("addPhoto")}`}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { ops.upload(item.id, e.target.files?.[0]); e.target.value = ""; }} />
      <div className="names">
        <Field
          className="inp en"
          aria-label={T("itemEn")}
          value={item.nameEn}
          required
          maxLength={80}
          onLive={(v) => ops.live(item.id, { nameEn: v })}
          onCommit={(v) => ops.save(item.id, { nameEn: v })}
        />
        <Field
          className="inp am"
          aria-label={T("itemAm")}
          placeholder={T("itemAm")}
          value={item.nameAm}
          maxLength={80}
          onLive={(v) => ops.live(item.id, { nameAm: v })}
          onCommit={(v) => ops.save(item.id, { nameAm: v })}
        />
      </div>
      <div className="right">
        <PriceField label={`${T("price")} (${T("birr")})`} value={item.price} onLive={(n) => ops.live(item.id, { price: n })} onCommit={(n) => ops.save(item.id, { price: n })} />
        <button className="btn ghost sm" type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? T("less") : T("more")}
        </button>
      </div>
      <div className="flags">
        <label className="toggle fast">
          <input
            type="checkbox"
            checked={item.fasting}
            onChange={(e) => {
              ops.live(item.id, { fasting: e.target.checked });
              ops.save(item.id, { fasting: e.target.checked });
            }}
          />
          {T("fasting")}
        </label>
        <label className="toggle out">
          <input type="checkbox" checked={item.soldOut} onChange={(e) => ops.soldOut(item.id, e.target.checked)} />
          {T("soldOut")}
        </label>
      </div>
      {open ? (
        <div className="more">
          <div className="grid2">
            <label className="f">
              {T("descEn")}
              <Field className="inp" value={item.descEn} maxLength={240} onLive={(v) => ops.live(item.id, { descEn: v })} onCommit={(v) => ops.save(item.id, { descEn: v })} />
            </label>
            <label className="f">
              {T("descAm")}
              <Field className="inp am" value={item.descAm} maxLength={240} onLive={(v) => ops.live(item.id, { descAm: v })} onCommit={(v) => ops.save(item.id, { descAm: v })} />
            </label>
          </div>
          <div className="row">
            <button className="btn sm" type="button" disabled={first} onClick={() => ops.move(item.id, -1)}>
              ↑ {T("moveUp")}
            </button>
            <button className="btn sm" type="button" disabled={last} onClick={() => ops.move(item.id, 1)}>
              ↓ {T("moveDown")}
            </button>
            {cats.length > 1 ? (
              <select className="inp" style={{ width: "auto" }} aria-label={T("moveTo")} value="" onChange={(e) => e.target.value && ops.moveTo(item.id, e.target.value)}>
                <option value="">{T("moveTo")}…</option>
                {cats
                  .filter((c) => c.id !== item.categoryId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {pick(ops.lang, c.nameEn, c.nameAm)}
                    </option>
                  ))}
              </select>
            ) : null}
            {item.imageId ? (
              <button className="btn sm" type="button" onClick={() => ops.removePhoto(item.id)}>
                {T("removePhoto")}
              </button>
            ) : null}
            <ConfirmButton className="btn sm" label={T("delete")} confirmLabel={T("confirmDelete")} onConfirm={() => ops.remove(item.id)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AddItemRow({ categoryId, T, structural }: { categoryId: string; T: (k: UIKey) => string; structural: (fn: () => Promise<MenuDTO>) => Promise<MenuDTO | undefined> }) {
  const [en, setEn] = useState("");
  const [am, setAm] = useState("");
  const [price, setPrice] = useState("");
  const firstRef = useRef<HTMLInputElement>(null);
  return (
    <form
      className="addrow"
      onSubmit={async (e) => {
        e.preventDefault();
        const p = parseInt(price, 10);
        if (!en.trim() || isNaN(p)) return;
        if (await structural(() => A.addItem(categoryId, { nameEn: en.trim(), nameAm: am.trim(), price: p }))) {
          setEn("");
          setAm("");
          setPrice("");
          firstRef.current?.focus();
        }
      }}
    >
      <label className="f">
        {T("itemEn")}
        <input ref={firstRef} className="inp" value={en} onChange={(e) => setEn(e.target.value)} maxLength={80} required />
      </label>
      <label className="f">
        {T("itemAm")}
        <input className="inp am" value={am} onChange={(e) => setAm(e.target.value)} maxLength={80} />
      </label>
      <label className="f">
        {T("price")}
        <input className="inp num" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))} required />
      </label>
      <button className="btn mus" type="submit">
        + {T("addItem")}
      </button>
    </form>
  );
}

// ---------------- info tab ----------------

function InfoTab({
  cafe,
  T,
  run,
  patchCafe,
  upload,
  removePhoto,
  uploading,
  flash,
  menuUrl,
  appUrl,
}: {
  cafe: CafeDTO;
  T: (k: UIKey) => string;
  run: <R>(fn: () => Promise<R>) => Promise<R | undefined>;
  patchCafe: (f: Partial<CafeDTO>) => void;
  upload: (target: string, file: File | undefined) => Promise<void>;
  removePhoto: (target: string) => Promise<void>;
  uploading: string | null;
  flash: (m: string, bad?: boolean) => void;
  menuUrl: string;
  appUrl: string;
}) {
  const [slug, setSlug] = useState(cafe.slug);
  const [slugErr, setSlugErr] = useState<UIKey | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const field = (key: "nameEn" | "nameAm" | "area" | "hoursEn" | "hoursAm", label: UIKey, opts: { am?: boolean; required?: boolean; placeholder?: string } = {}) => (
    <label className="f">
      {T(label)}
      <Field
        className={`inp${opts.am ? " am" : ""}`}
        value={cafe[key]}
        required={opts.required}
        maxLength={80}
        placeholder={opts.placeholder}
        onLive={(v) => patchCafe({ [key]: v })}
        onCommit={(v) => run(() => A.updateCafe({ [key]: v }))}
      />
    </label>
  );
  return (
    <>
      <section className="box">
        <h2>{T("infoTitle")}</h2>
        <div className="grid2">
          {field("nameEn", "cafeNameEn", { required: true })}
          {field("nameAm", "cafeNameAm", { am: true })}
          {field("hoursEn", "hoursEn", { placeholder: T("hoursPhEn") })}
          {field("hoursAm", "hoursAm", { am: true, placeholder: T("hoursPhAm") })}
          {field("area", "area", { placeholder: T("areaPh") })}
        </div>
      </section>
      <section className="box">
        <h3>{T("logo")}</h3>
        <div className="row">
          <button type="button" className="ph logo-ph" onClick={() => logoRef.current?.click()} disabled={uploading === "logo"}>
            {uploading === "logo" ? T("uploading") : cafe.logoId ? <img src={`/media/${cafe.logoId}`} alt="" /> : `+ ${T("addPhoto")}`}
          </button>
          <input ref={logoRef} type="file" accept="image/*" hidden onChange={(e) => { upload("logo", e.target.files?.[0]); e.target.value = ""; }} />
          {cafe.logoId ? (
            <button className="btn sm" type="button" onClick={() => removePhoto("logo")}>
              {T("removePhoto")}
            </button>
          ) : null}
        </div>
      </section>
      <section className="box">
        <h3>{T("link")}</h3>
        <span className="qr-link">{menuUrl}</span>
        <form
          className="row"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await run(() => A.setSlug(slug));
            if (!r) return;
            if (r.ok) {
              setSlugErr(null);
              setSlug(r.slug);
              patchCafe({ slug: r.slug });
              flash(T("linkSaved"));
            } else setSlugErr(r.error);
          }}
        >
          <label className="f" style={{ flex: 1 }}>
            {appUrl.replace(/^https?:\/\//, "")}/m/
            <input className="inp" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} maxLength={40} pattern={"[a-z0-9\\-]{3,40}"} required />
          </label>
          <button className="btn" type="submit" disabled={slug === cafe.slug} style={{ alignSelf: "end" }}>
            {T("saveLink")}
          </button>
        </form>
        {slugErr ? <p className="err">{T(slugErr)}</p> : null}
        <p className="hint">{T("linkHint")}</p>
      </section>
    </>
  );
}

// ---------------- screen tab ----------------

function ScreenTab({ cafe, T, appUrl, onChange }: { cafe: CafeDTO; T: (k: UIKey) => string; appUrl: string; onChange: (f: { screenSeconds?: number; screenLang?: string }) => void }) {
  const url = `${appUrl}/s/${cafe.slug}`;
  // The preview reloads when settings change so it shows the saved values.
  const previewKey = `${cafe.template}-${cafe.screenSeconds}-${cafe.screenLang}`;
  return (
    <>
      <section className="box">
        <h2>{T("screenTitle")}</h2>
        <p className="sub">{T("screenSub")}</p>
        <span className="qr-link">{url}</span>
        <div className="row">
          <a className="btn red sm" href={`/s/${cafe.slug}`} target="_blank" rel="noreferrer">
            {T("openScreen")} ↗
          </a>
          <span className="hint">{T("screenTip")}</span>
        </div>
        <div className="grid2">
          <label className="f">
            {T("slideSeconds")}
            <select className="inp" value={cafe.screenSeconds} onChange={(e) => onChange({ screenSeconds: Number(e.target.value) })}>
              {[6, 8, 10, 15, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="f">
            {T("screenLang")}
            <select className="inp" value={cafe.screenLang} onChange={(e) => onChange({ screenLang: e.target.value })}>
              <option value="both">{T("langBoth")}</option>
              <option value="en">{T("langEn")}</option>
              <option value="am">{T("langAm")}</option>
            </select>
          </label>
        </div>
      </section>
      <section className="box">
        <h3>{T("screenPreview")}</h3>
        <div className="tv-frame">
          <iframe key={previewKey} src={`/s/${cafe.slug}?embed=1`} title={T("screenPreview")} loading="lazy" />
        </div>
      </section>
    </>
  );
}

// ---------------- small inputs ----------------

// Text input that updates the preview on every keystroke and saves once, on blur or Enter.
function Field({
  value,
  onLive,
  onCommit,
  required,
  ...rest
}: { value: string; onLive: (v: string) => void; onCommit: (v: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const start = useRef(value);
  return (
    <input
      {...rest}
      value={value}
      onFocus={() => {
        start.current = value;
      }}
      onChange={(e) => onLive(e.target.value)}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (required && !v) return onLive(start.current);
        if (v !== start.current) onCommit(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

function PriceField({ value, onLive, onCommit, label }: { value: number; onLive: (n: number) => void; onCommit: (n: number) => void; label: string }) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);
  const start = useRef(value);
  useEffect(() => {
    if (!focused.current) setDraft(String(value));
  }, [value]);
  return (
    <input
      className="inp num"
      inputMode="numeric"
      aria-label={label}
      value={draft}
      onFocus={() => {
        focused.current = true;
        start.current = value;
      }}
      onChange={(e) => {
        const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 7);
        setDraft(v);
        if (v) onLive(parseInt(v, 10));
      }}
      onBlur={() => {
        focused.current = false;
        const n = parseInt(draft, 10);
        if (!draft || isNaN(n)) {
          setDraft(String(start.current));
          onLive(start.current);
        } else if (n !== start.current) onCommit(n);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
    />
  );
}

// Two-step delete: the first tap arms the button for 3 seconds.
function ConfirmButton({ label, confirmLabel, ariaLabel, onConfirm, className }: { label: string; confirmLabel: string; ariaLabel?: string; onConfirm: () => void; className: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      className={`${className} danger${armed ? " armed" : ""}`}
      aria-label={armed ? confirmLabel : ariaLabel ?? label}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

// Shrink photos in the browser before upload: max 800px, WebP (JPEG where WebP encoding is missing).
async function resizeImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bmp.width * scale));
  canvas.height = Math.max(1, Math.round(bmp.height * scale));
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const encode = (type: string, q: number) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, q));
  let blob = await encode("image/webp", 0.8);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.82);
  if (!blob) throw new Error("Could not encode image");
  return blob;
}
