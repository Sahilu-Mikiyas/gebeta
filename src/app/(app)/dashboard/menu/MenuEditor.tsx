"use client";

import { useRef, useState } from "react";
import { MenuView } from "@/components/MenuView";
import { ConfirmButton, Field, PageHead, PriceField, Sheet, Toggle, uploadPhoto, useToast, useTr } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { AnimatePresence, LayoutGroup, bouncy, m, soft } from "@/components/motion";
import { pick, type Lang } from "@/lib/i18n";
import { PHOTO_LIBRARY } from "@/lib/library";
import type { CategoryDTO, ItemDTO, MenuDTO, Option } from "@/lib/types";
import * as A from "../actions";

const TAGS = [
  { id: "new", en: "New", am: "አዲስ" },
  { id: "chef", en: "Chef's pick", am: "የሼፍ ምርጫ" },
  { id: "spicy", en: "Spicy", am: "ቅመም" },
  { id: "vegan", en: "Vegan", am: "ቪጋን" },
] as const;

export function MenuEditor({ initial, itemLimit }: { initial: MenuDTO; itemLimit: number | null }) {
  const { tr, lang } = useTr();
  const { run, toast } = useToast();
  const [menu, setMenu] = useState(initial);
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [pLang, setPLang] = useState<Lang>(lang);
  const [pFast, setPFast] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [pct, setPct] = useState("10");
  const [scope, setScope] = useState("");
  const [secEn, setSecEn] = useState("");
  const [secAm, setSecAm] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  const cats = menu.categories;
  const count = cats.reduce((n, c) => n + c.items.length, 0);
  const editing = cats.flatMap((c) => c.items).find((i) => i.id === open) ?? null;

  const structural = async (fn: () => Promise<MenuDTO>) => {
    const m = await run(fn);
    if (m) setMenu(m);
    return m;
  };
  const patchCat = (id: string, f: Partial<CategoryDTO>) => setMenu((m) => ({ ...m, categories: m.categories.map((c) => (c.id === id ? { ...c, ...f } : c)) }));
  const patchItem = (id: string, f: Partial<ItemDTO>) =>
    setMenu((m) => ({ ...m, categories: m.categories.map((c) => ({ ...c, items: c.items.map((i) => (i.id === id ? { ...i, ...f } : i)) })) }));
  const save = (id: string, f: Parameters<typeof A.updateItem>[1]) => run(() => A.updateItem(id, f));

  const upload = async (id: string, file?: File) => {
    if (!file) return;
    setUploading(id);
    try {
      const imageId = await run(() => uploadPhoto(id, file, A.uploadImage));
      if (imageId) patchItem(id, { imageId, photo: `/media/${imageId}` });
      else toast(tr("That photo could not be used. Try a JPG or PNG.", "ይህን ፎቶ መጠቀም አልተቻለም። JPG ወይም PNG ይሞክሩ።"), { bad: true });
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="menu-page" data-view={view}>
      <div className="pane stagger">
        <PageHead
          title={tr("Menu", "ምናሌ")}
          sub={tr("Changes save on their own and appear on customers' phones and your TV right away.", "ለውጦች በራሳቸው ይቀመጣሉ፤ በደንበኞች ስልክና በቲቪዎ ላይ ወዲያው ይታያሉ።")}
        >
          {itemLimit ? <span className={`pill-count${count >= itemLimit ? " warn" : ""}`}>{count}/{itemLimit} {tr("items", "ምግቦች")}</span> : null}
        </PageHead>

        {count ? (
          <section className="box">
            <div className="box-h">
              <h3>{tr("Change prices", "ዋጋ ቀይር")}</h3>
              <a className="btn sm ghost" href="/dashboard/specials">{tr("Schedule for later", "ለኋላ አቅድ")} →</a>
            </div>
            <p className="sub">{tr("Raise or lower prices by a percentage. New prices round to the nearest 5 birr. You can undo it from the message that appears.", "ዋጋዎችን በመቶኛ ይጨምሩ ወይም ይቀንሱ። አዲሶቹ ዋጋዎች ወደ 5 ብር ይጠጋጋሉ። ከሚመጣው መልእክት መቀልበስ ይችላሉ።")}</p>
            <div className="bulk">
              <label className="f">
                {tr("Apply to", "የሚቀየሩት")}
                <select className="inp" value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="">{tr("All sections", "ሁሉም ክፍሎች")}</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{pick(lang, c.nameEn, c.nameAm)}</option>
                  ))}
                </select>
              </label>
              <div className="chips">
                {["-10", "5", "10", "15", "20"].map((v) => (
                  <button key={v} type="button" className={`chip${pct === v ? " on" : ""}`} onClick={() => setPct(v)}>{Number(v) > 0 ? `+${v}` : v}%</button>
                ))}
                <input className="inp num pct" aria-label="%" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^0-9-]/g, "").slice(0, 4))} />
              </div>
              <button
                className="btn mus"
                type="button"
                onClick={async () => {
                  const n = parseInt(pct, 10);
                  if (!n || n < -50 || n > 100) return;
                  if (await structural(() => A.bulkPrice(n, scope || null)))
                    toast(tr(`Prices changed by ${n > 0 ? "+" : ""}${n}%`, `ዋጋዎች በ${n}% ተቀይረዋል`), {
                      action: { label: tr("Undo", "መልስ"), run: async () => { const { recentChanges } = await import("../history/actions"); const last = (await recentChanges())[0]; if (last && (await A.undo(last.id))) location.reload(); } },
                    });
                }}
              >
                {tr("Apply", "ተግብር")}
              </button>
            </div>
          </section>
        ) : null}

        {cats.length === 0 ? <p className="box empty">{tr("Your menu is empty. Add a section, like “Coffee & tea”, to start.", "ምናሌዎ ባዶ ነው። ለመጀመር እንደ «ቡና እና ሻይ» ያለ ክፍል ይጨምሩ።")}</p> : null}

        <LayoutGroup>
        <AnimatePresence initial={false}>
        {cats.map((c, ci) => (
          <m.section key={c.id} className="sec" layout initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9, height: 0, marginTop: 0 }} transition={soft}>
            <div className="sec-h">
              <label className="f">
                {tr("Section (English)", "ክፍል (እንግሊዝኛ)")}
                <Field className="inp" value={c.nameEn} required onLive={(v) => patchCat(c.id, { nameEn: v })} onCommit={(v) => run(() => A.updateCategory(c.id, { nameEn: v }))} />
              </label>
              <label className="f">
                {tr("Section (Amharic)", "ክፍል (አማርኛ)")}
                <Field className="inp am" value={c.nameAm} onLive={(v) => patchCat(c.id, { nameAm: v })} onCommit={(v) => run(() => A.updateCategory(c.id, { nameAm: v }))} />
              </label>
              <div className="tools">
                <button className="icon-btn" type="button" aria-label={tr("Move up", "ወደ ላይ")} disabled={ci === 0} onClick={() => structural(() => A.moveCategory(c.id, -1))}><Icon name="up" /></button>
                <button className="icon-btn" type="button" aria-label={tr("Move down", "ወደ ታች")} disabled={ci === cats.length - 1} onClick={() => structural(() => A.moveCategory(c.id, 1))}><Icon name="down" /></button>
                <ConfirmButton className="icon-btn" label={<Icon name="trash" />} confirmLabel={tr("Delete section?", "ይሰረዝ?")} onConfirm={() => structural(() => A.deleteCategory(c.id))} />
              </div>
              {c.fromMin != null ? <span className="sec-time"><Icon name="clock" size={14} /> {fmt(c.fromMin)}–{fmt(c.toMin!)}</span> : null}
            </div>
            <div className="items">
              {c.items.length === 0 ? <p className="empty">{tr("No items in this section yet.", "በዚህ ክፍል ገና ምግብ የለም።")}</p> : null}
              <AnimatePresence initial={false}>
              {c.items.map((it, ii) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  first={ii === 0}
                  last={ii === c.items.length - 1}
                  uploading={uploading === it.id}
                  onLive={(f) => patchItem(it.id, f)}
                  onSave={(f) => save(it.id, f)}
                  onSoldOut={(on) => { patchItem(it.id, { soldOut: on }); run(() => A.setSoldOut(it.id, on)); }}
                  onUpload={(f) => upload(it.id, f)}
                  onMove={(d) => structural(() => A.moveItem(it.id, d))}
                  onMore={() => setOpen(it.id)}
                />
              ))}
              </AnimatePresence>
            </div>
            <AddItemRow categoryId={c.id} structural={structural} />
          </m.section>
        ))}
        </AnimatePresence>
        </LayoutGroup>

        <section className="box">
          <h3>{tr("Add section", "ክፍል ጨምር")}</h3>
          <form
            className="grid3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!secEn.trim()) return;
              if (await structural(() => A.addCategory(secEn.trim(), secAm.trim()))) {
                setSecEn("");
                setSecAm("");
              }
            }}
          >
            <input className="inp" aria-label={tr("Section (English)", "ክፍል (እንግሊዝኛ)")} value={secEn} onChange={(e) => setSecEn(e.target.value)} placeholder="e.g. Pastries" maxLength={80} required />
            <input className="inp am" aria-label={tr("Section (Amharic)", "ክፍል (አማርኛ)")} value={secAm} onChange={(e) => setSecAm(e.target.value)} placeholder="ለምሳሌ ኬኮች" maxLength={80} />
            <button className="btn red" type="submit"><Icon name="plus" /> {tr("Add section", "ክፍል ጨምር")}</button>
          </form>
        </section>
      </div>

      <aside className="preview-col" aria-label={tr("Preview", "ቅድመ እይታ")}>
        <m.div className="phone" initial={{ opacity: 0, y: 40, rotate: 3 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ ...bouncy, delay: 0.15 }} whileHover={{ rotate: -1, y: -4 }}>
          <div className="notch" />
          <div className="scr">
            <MenuView cafe={menu.cafe} categories={menu.categories.map((c) => ({ ...c, items: c.items.filter((i) => !i.hidden) }))} lang={pLang} fastOnly={pFast} controls={{ kind: "buttons", onLang: setPLang, onFast: () => setPFast((f) => !f) }} />
          </div>
        </m.div>
        <span className="hint">{tr("Live preview", "ቀጥታ ቅድመ እይታ")}</span>
      </aside>

      <button className="fab only-mobile" type="button" onClick={() => setView((v) => (v === "edit" ? "preview" : "edit"))}>
        <Icon name={view === "edit" ? "eye" : "menu"} /> {view === "edit" ? tr("Preview", "ቅድመ እይታ") : tr("Edit", "አስተካክል")}
      </button>

      <Sheet open={!!editing} onClose={() => setOpen(null)} title={editing ? pick(lang, editing.nameEn, editing.nameAm) : ""}>
        {editing ? (
          <ItemDetails
            key={editing.id}
            item={editing}
            cats={cats}
            uploading={uploading === editing.id}
            onLive={(f) => patchItem(editing.id, f)}
            onSave={(f) => save(editing.id, f)}
            onUpload={(f) => upload(editing.id, f)}
            onRemovePhoto={() => { patchItem(editing.id, { imageId: null, photo: editing.libraryPhoto ? `/library/${editing.libraryPhoto}.webp` : null }); run(() => A.removeImage(editing.id)); }}
            onMoveTo={(cat) => { setOpen(null); structural(() => A.moveItemToCategory(editing.id, cat)); }}
            onDelete={() => { setOpen(null); structural(() => A.deleteItem(editing.id)); toast(tr("Item deleted. You can restore it from History.", "ተሰርዟል። ከታሪክ መመለስ ይችላሉ።")); }}
          />
        ) : null}
      </Sheet>
    </div>
  );
}

const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function ItemRow({ item, first, last, uploading, onLive, onSave, onSoldOut, onUpload, onMove, onMore }: {
  item: ItemDTO; first: boolean; last: boolean; uploading: boolean;
  onLive: (f: Partial<ItemDTO>) => void; onSave: (f: Parameters<typeof A.updateItem>[1]) => void;
  onSoldOut: (on: boolean) => void; onUpload: (f?: File) => void; onMove: (d: -1 | 1) => void; onMore: () => void;
}) {
  const { tr } = useTr();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <m.div layout="position" className={`it${item.soldOut ? " out" : ""}${item.hidden ? " hid" : ""}`} initial={{ opacity: 0, x: -30, backgroundColor: "#fff3c4" }} animate={{ opacity: 1, x: 0, backgroundColor: item.soldOut ? "#fff4f3" : "#ffffff" }} exit={{ opacity: 0, x: 60, height: 0, paddingTop: 0, paddingBottom: 0 }} transition={bouncy}>
      <button type="button" className="ph" onClick={() => fileRef.current?.click()} aria-label={tr("Photo", "ፎቶ")} disabled={uploading}>
        {uploading ? <span className="spin" /> : item.photo ? <img src={item.photo} alt="" /> : <><Icon name="camera" /><small>{tr("Photo", "ፎቶ")}</small></>}
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
      <div className="names">
        <Field className="inp en" aria-label={tr("Name (English)", "ስም (እንግሊዝኛ)")} value={item.nameEn} required maxLength={80} onLive={(v) => onLive({ nameEn: v })} onCommit={(v) => onSave({ nameEn: v })} />
        <Field className="inp am" aria-label={tr("Name (Amharic)", "ስም (አማርኛ)")} placeholder={tr("Name in Amharic", "ስም በአማርኛ")} value={item.nameAm} maxLength={80} onLive={(v) => onLive({ nameAm: v })} onCommit={(v) => onSave({ nameAm: v })} />
      </div>
      <div className="right">
        {item.variants.length ? (
          <button type="button" className="sizes-chip" onClick={onMore}>{item.variants.map((v) => v.price).join(" / ")}</button>
        ) : (
          <PriceField label={tr("Price (birr)", "ዋጋ (ብር)")} value={item.price} onLive={(n) => onLive({ price: n })} onCommit={(n) => onSave({ price: n })} />
        )}
        <button className="btn ghost sm" type="button" onClick={onMore}>{tr("More", "ተጨማሪ")}</button>
      </div>
      <div className="flags">
        <Toggle checked={item.fasting} onChange={(v) => { onLive({ fasting: v }); onSave({ fasting: v }); }} label={tr("Fasting", "ጾም")} />
        <Toggle tone="red" checked={item.soldOut} onChange={onSoldOut} label={tr("Sold out", "አልቋል")} />
        {item.hidden ? <span className="tag-mini">{tr("Hidden", "ተደብቋል")}</span> : null}
        {item.special ? <span className="tag-mini hot">{tr("Special now", "ልዩ ዋጋ")}</span> : null}
        {item.tags.map((t) => <span key={t} className="tag-mini">{TAGS.find((x) => x.id === t)?.en}</span>)}
        <span className="move">
          <button className="icon-btn sm" type="button" disabled={first} aria-label={tr("Move up", "ወደ ላይ")} onClick={() => onMove(-1)}><Icon name="up" size={16} /></button>
          <button className="icon-btn sm" type="button" disabled={last} aria-label={tr("Move down", "ወደ ታች")} onClick={() => onMove(1)}><Icon name="down" size={16} /></button>
        </span>
      </div>
    </m.div>
  );
}

function OptionsEditor({ title, hint, value, onChange, firstIsBase }: { title: string; hint: string; value: Option[]; onChange: (v: Option[]) => void; firstIsBase?: boolean }) {
  const { tr } = useTr();
  const [rows, setRows] = useState(value);
  const commit = (next: Option[]) => {
    setRows(next);
    onChange(next.filter((r) => r.nameEn.trim()));
  };
  return (
    <div className="opts">
      <div className="opts-h">
        <b>{title}</b>
        <span className="hint">{hint}</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} className="opt-row pop-in">
          <input className="inp" placeholder={firstIsBase && i === 0 ? "Single" : "Extra shot"} value={r.nameEn} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, nameEn: e.target.value } : x)))} onBlur={() => commit(rows)} />
          <input className="inp am" placeholder={firstIsBase && i === 0 ? "ነጠላ" : "ተጨማሪ ሾት"} value={r.nameAm} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, nameAm: e.target.value } : x)))} onBlur={() => commit(rows)} />
          <PriceField label={tr("Price", "ዋጋ")} value={r.price} onCommit={(n) => commit(rows.map((x, j) => (j === i ? { ...x, price: n } : x)))} />
          <button type="button" className="icon-btn sm" aria-label={tr("Remove", "አስወግድ")} onClick={() => commit(rows.filter((_, j) => j !== i))}><Icon name="close" size={16} /></button>
        </div>
      ))}
      <button type="button" className="btn sm" onClick={() => setRows([...rows, { nameEn: "", nameAm: "", price: 0 }])}>
        <Icon name="plus" size={16} /> {tr("Add", "ጨምር")}
      </button>
    </div>
  );
}

function ItemDetails({ item, cats, uploading, onLive, onSave, onUpload, onRemovePhoto, onMoveTo, onDelete }: {
  item: ItemDTO; cats: CategoryDTO[]; uploading: boolean;
  onLive: (f: Partial<ItemDTO>) => void; onSave: (f: Parameters<typeof A.updateItem>[1]) => void;
  onUpload: (f?: File) => void; onRemovePhoto: () => void; onMoveTo: (cat: string) => void; onDelete: () => void;
}) {
  const { tr, lang } = useTr();
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="details">
      <div className="det-photo">
        <div className="det-img">{uploading ? <span className="spin" /> : item.photo ? <img src={item.photo} alt="" /> : <Icon name="camera" size={32} />}</div>
        <div className="col">
          <button className="btn sm mus" type="button" onClick={() => fileRef.current?.click()}><Icon name="camera" size={16} /> {item.imageId ? tr("Change photo", "ፎቶ ቀይር") : tr("Upload photo", "ፎቶ ጫን")}</button>
          {item.imageId ? <button className="btn sm" type="button" onClick={onRemovePhoto}>{tr("Remove photo", "ፎቶ አስወግድ")}</button> : null}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { onUpload(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      </div>
      {!item.imageId ? (
        <div>
          <span className="f">{tr("Or use a built-in photo", "ወይም የተዘጋጀ ፎቶ ይጠቀሙ")}</span>
          <div className="lib">
            {PHOTO_LIBRARY.map((p) => (
              <button key={p.key} type="button" className={`lib-ph${item.libraryPhoto === p.key ? " on" : ""}`} title={p.en} onClick={() => {
                const next = item.libraryPhoto === p.key ? null : p.key;
                onLive({ libraryPhoto: next, photo: next ? `/library/${next}.webp` : null });
                onSave({ libraryPhoto: next });
              }}>
                <img src={`/library/${p.key}.webp`} alt={p.en} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid2">
        <label className="f">{tr("Description (English)", "መግለጫ (እንግሊዝኛ)")}<Field className="inp" value={item.descEn} maxLength={240} onLive={(v) => onLive({ descEn: v })} onCommit={(v) => onSave({ descEn: v })} /></label>
        <label className="f">{tr("Description (Amharic)", "መግለጫ (አማርኛ)")}<Field className="inp am" value={item.descAm} maxLength={240} onLive={(v) => onLive({ descAm: v })} onCommit={(v) => onSave({ descAm: v })} /></label>
      </div>
      <OptionsEditor
        title={tr("Sizes", "መጠኖች")}
        hint={tr("For example Single 90 / Double 120. The first size is shown as the price.", "ለምሳሌ ነጠላ 90 / ድርብ 120። የመጀመሪያው መጠን እንደ ዋጋ ይታያል።")}
        value={item.variants}
        firstIsBase
        onChange={(v) => { onLive({ variants: v, price: v[0]?.price ?? item.price }); onSave({ variants: v, ...(v[0] ? { price: v[0].price } : {}) }); }}
      />
      <OptionsEditor
        title={tr("Add-ons", "ተጨማሪዎች")}
        hint={tr("Extras customers can add, like an extra shot or oat milk.", "ደንበኞች የሚጨምሯቸው፣ እንደ ተጨማሪ ሾት ወይም የአጃ ወተት።")}
        value={item.addons}
        onChange={(v) => { onLive({ addons: v }); onSave({ addons: v }); }}
      />
      <div>
        <span className="f">{tr("Tags", "መለያዎች")}</span>
        <div className="chips">
          {TAGS.map((t) => {
            const on = item.tags.includes(t.id);
            return (
              <button key={t.id} type="button" className={`chip${on ? " on" : ""}`} onClick={() => {
                const tags = on ? item.tags.filter((x) => x !== t.id) : [...item.tags, t.id];
                onLive({ tags });
                onSave({ tags: tags as ("new" | "chef" | "spicy" | "vegan")[] });
              }}>{tr(t.en, t.am)}</button>
            );
          })}
        </div>
      </div>
      <Toggle checked={item.hidden} onChange={(v) => { onLive({ hidden: v }); onSave({ hidden: v }); }} label={tr("Hide from the menu (keep it for later, e.g. seasonal)", "ከምናሌው ደብቅ (ለኋላ ያቆዩ፣ ለምሳሌ ወቅታዊ)")} />
      <div className="row">
        {cats.length > 1 ? (
          <select className="inp" style={{ width: "auto" }} value="" onChange={(e) => e.target.value && onMoveTo(e.target.value)}>
            <option value="">{tr("Move to section…", "ወደ ሌላ ክፍል…")}</option>
            {cats.filter((c) => c.id !== item.categoryId).map((c) => <option key={c.id} value={c.id}>{pick(lang, c.nameEn, c.nameAm)}</option>)}
          </select>
        ) : null}
        <ConfirmButton label={<><Icon name="trash" size={16} /> {tr("Delete item", "ምግቡን ሰርዝ")}</>} confirmLabel={tr("Tap again to delete", "ለመሰረዝ እንደገና ይንኩ")} onConfirm={onDelete} />
      </div>
    </div>
  );
}

function AddItemRow({ categoryId, structural }: { categoryId: string; structural: (fn: () => Promise<MenuDTO>) => Promise<MenuDTO | undefined> }) {
  const { tr } = useTr();
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
      <input ref={firstRef} className="inp" aria-label={tr("New item (English)", "አዲስ ምግብ (እንግሊዝኛ)")} placeholder={tr("New item", "አዲስ ምግብ")} value={en} onChange={(e) => setEn(e.target.value)} maxLength={80} required />
      <input className="inp am" aria-label={tr("New item (Amharic)", "አዲስ ምግብ (አማርኛ)")} placeholder={tr("In Amharic", "በአማርኛ")} value={am} onChange={(e) => setAm(e.target.value)} maxLength={80} />
      <input className="inp num" aria-label={tr("Price", "ዋጋ")} placeholder={tr("Price", "ዋጋ")} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, "").slice(0, 7))} required />
      <button className="btn mus" type="submit"><Icon name="plus" size={16} /> {tr("Add", "ጨምር")}</button>
    </form>
  );
}
