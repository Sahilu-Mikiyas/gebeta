"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { requireCafe, CAFE_COOKIE } from "@/lib/access";
import { loadMenu } from "@/lib/menu-data";
import { applyPercent, nextMorningReset } from "@/lib/menu";
import { slugify } from "@/lib/slug";
import { isTemplate } from "@/lib/templates";
import { STARTERS, type StarterId } from "@/lib/starter";
import { PLANS, effectivePlan } from "@/lib/plans";
import { isLibraryKey } from "@/lib/library";
import { logChange, undoChange } from "@/lib/history";
import type { MenuDTO, Option } from "@/lib/types";
import type { UIKey } from "@/lib/i18n";

const MAX_IMAGE_BYTES = 600 * 1024;

const shortText = z.string().trim().max(80);
const longText = z.string().trim().max(240);
const price = z.number().int().min(0).max(1_000_000);
const option = z.object({ nameEn: shortText.min(1), nameAm: shortText, price });
const TAGS = ["spicy", "vegan", "new", "chef"] as const;

async function menuOf(cafeId: string): Promise<MenuDTO> {
  const menu = await loadMenu({ id: cafeId });
  if (!menu) throw new Error("Cafe not found");
  return menu;
}

async function ownedCategory(cafeId: string, id: string) {
  const c = await prisma.category.findFirst({ where: { id, cafeId } });
  if (!c) throw new Error("Section not found");
  return c;
}

async function ownedItem(cafeId: string, id: string) {
  const i = await prisma.item.findFirst({ where: { id, cafeId } });
  if (!i) throw new Error("Item not found");
  return i;
}

export async function uniqueSlug(base: string, exceptCafeId?: string): Promise<string> {
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? base : `${base.slice(0, 36)}-${n}`;
    const hit = await prisma.cafe.findUnique({ where: { slug: candidate } });
    if (!hit || hit.id === exceptCafeId) return candidate;
  }
  return `${base.slice(0, 30)}-${Date.now().toString(36)}`;
}

async function checkItemLimit(cafe: { id: string; plan: string; planUntil: Date | null }, adding = 1): Promise<void> {
  const limit = PLANS[effectivePlan(cafe.plan, cafe.planUntil)].items;
  if (limit === Infinity) return;
  const count = await prisma.item.count({ where: { cafeId: cafe.id } });
  if (count + adding > limit) throw new Error(`PLAN_LIMIT:${limit}`);
}

// ---------- onboarding ----------

export type CreateCafeState = { error?: UIKey } | undefined;

export async function createCafe(_prev: CreateCafeState, fd: FormData): Promise<CreateCafeState> {
  const owner = await requireOwner();
  const parsed = z
    .object({ nameEn: shortText.min(2), nameAm: shortText, area: shortText, starter: z.enum(["none", "coffee", "juice", "restaurant", "lounge"]) })
    .safeParse({
      nameEn: String(fd.get("nameEn") ?? ""),
      nameAm: String(fd.get("nameAm") ?? ""),
      area: String(fd.get("area") ?? ""),
      starter: String(fd.get("starter") ?? "coffee"),
    });
  if (!parsed.success) return { error: "err_cafe" };
  const d = parsed.data;
  const existing = await prisma.cafe.count({ where: { ownerId: owner.id } });
  if (existing > 0) {
    // Extra cafes are branches, which need the Group plan.
    const first = await prisma.cafe.findFirst({ where: { ownerId: owner.id }, orderBy: { createdAt: "asc" } });
    if (existing >= PLANS[effectivePlan(first!.plan, first!.planUntil)].branches) return { error: "err_branchLimit" };
  }

  const slug = await uniqueSlug(slugify(d.nameEn));
  const cafe = await prisma.$transaction(async (tx) => {
    const cafe = await tx.cafe.create({ data: { ownerId: owner.id, slug, nameEn: d.nameEn, nameAm: d.nameAm, area: d.area } });
    if (d.starter !== "none") await seedStarter(tx, cafe.id, d.starter);
    return cafe;
  });
  (await cookies()).set(CAFE_COOKIE, cafe.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  redirect("/dashboard");
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function seedStarter(tx: Tx, cafeId: string, starter: StarterId) {
  for (const [ci, c] of STARTERS[starter].menu.entries()) {
    await tx.category.create({
      data: {
        cafeId,
        nameEn: c.en,
        nameAm: c.am,
        position: ci,
        fromMin: c.fromMin ?? null,
        toMin: c.toMin ?? null,
        items: {
          create: c.items.map((it, ii) => ({
            cafeId,
            nameEn: it.en,
            nameAm: it.am,
            descEn: it.descEn ?? "",
            descAm: it.descAm ?? "",
            price: it.price,
            fasting: !!it.fasting,
            libraryPhoto: it.photo ?? null,
            variants: it.variants ?? [],
            addons: it.addons ?? [],
            position: ii,
          })),
        },
      },
    });
  }
}

export async function switchCafe(cafeId: string) {
  const { cafes } = await requireCafe();
  if (!cafes.some((c) => c.id === cafeId)) throw new Error("Not your cafe");
  (await cookies()).set(CAFE_COOKIE, cafeId, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

// ---------- cafe ----------

const hex = z.string().regex(/^#[0-9a-f]{6}$/i).nullable();
const cafeFields = z
  .object({
    nameEn: shortText.min(2),
    nameAm: shortText,
    area: shortText,
    hoursEn: shortText,
    hoursAm: shortText,
    phone: shortText,
    mapUrl: z.string().trim().max(300),
    instagram: shortText,
    tiktok: shortText,
    telegram: shortText,
    facebook: shortText,
    wifiName: shortText,
    wifiPass: shortText,
    fastingMode: z.enum(["auto", "on", "off"]),
    brandColor: hex,
    accentColor: hex,
    tableCount: z.number().int().min(0).max(200),
    orderingOn: z.boolean(),
    callsOn: z.boolean(),
    screenSeconds: z.number().int().min(5).max(60),
    screenLang: z.enum(["both", "en", "am"]),
    screenPortrait: z.boolean(),
  })
  .partial();

export async function updateCafe(fields: z.input<typeof cafeFields>): Promise<void> {
  const { cafe, user } = await requireCafe("manager");
  const data = cafeFields.parse(fields);
  if (data.orderingOn && effectivePlan(cafe.plan, cafe.planUntil) === "free") throw new Error("PLAN_ORDERING");
  const before = Object.fromEntries(Object.keys(data).map((k) => [k, (cafe as Record<string, unknown>)[k]]));
  await prisma.cafe.update({ where: { id: cafe.id }, data });
  await logChange(cafe.id, user.name, "cafe", `Cafe settings: ${Object.keys(data).join(", ")}`, { kind: "cafe", data: before });
}

export async function setTemplate(template: string): Promise<void> {
  const { cafe, user } = await requireCafe("manager");
  if (!isTemplate(template)) throw new Error("Unknown template");
  await prisma.cafe.update({ where: { id: cafe.id }, data: { template } });
  await logChange(cafe.id, user.name, "design", `Board style: ${cafe.template} → ${template}`, { kind: "cafe", data: { template: cafe.template } });
}

export async function setSlug(slug: string): Promise<{ ok: true; slug: string } | { ok: false; error: UIKey }> {
  const { cafe } = await requireCafe("owner");
  const { isValidSlug } = await import("@/lib/slug");
  const s = slug.trim().toLowerCase();
  if (!isValidSlug(s)) return { ok: false, error: "err_slug" };
  const hit = await prisma.cafe.findUnique({ where: { slug: s } });
  if (hit && hit.id !== cafe.id) return { ok: false, error: "err_slugTaken" };
  await prisma.cafe.update({ where: { id: cafe.id }, data: { slug: s } });
  return { ok: true, slug: s };
}

// ---------- sections ----------

export async function addCategory(nameEn: string, nameAm: string): Promise<MenuDTO> {
  const { cafe, user } = await requireCafe("manager");
  const d = z.object({ nameEn: shortText.min(1), nameAm: shortText }).parse({ nameEn, nameAm });
  const last = await prisma.category.findFirst({ where: { cafeId: cafe.id }, orderBy: { position: "desc" } });
  await prisma.category.create({ data: { cafeId: cafe.id, ...d, position: (last?.position ?? -1) + 1 } });
  await logChange(cafe.id, user.name, "section", `Added section ${d.nameEn}`);
  return menuOf(cafe.id);
}

const catFields = z
  .object({ nameEn: shortText.min(1), nameAm: shortText, fromMin: z.number().int().min(0).max(1440).nullable(), toMin: z.number().int().min(0).max(1440).nullable(), showOnScreen: z.boolean() })
  .partial();

export async function updateCategory(id: string, fields: z.input<typeof catFields>): Promise<void> {
  const { cafe, user } = await requireCafe("manager");
  const c = await ownedCategory(cafe.id, id);
  const data = catFields.parse(fields);
  const before = Object.fromEntries(Object.keys(data).map((k) => [k, (c as Record<string, unknown>)[k]]));
  await prisma.category.update({ where: { id }, data });
  await logChange(cafe.id, user.name, "section", `Section ${c.nameEn}: ${Object.keys(data).join(", ")}`, { kind: "category", id, data: before });
}

export async function deleteCategory(id: string): Promise<MenuDTO> {
  const { cafe, user } = await requireCafe("manager");
  const c = await ownedCategory(cafe.id, id);
  const images = await prisma.item.findMany({ where: { categoryId: id, imageId: { not: null } }, select: { imageId: true } });
  await prisma.$transaction([
    prisma.category.delete({ where: { id } }),
    prisma.image.deleteMany({ where: { id: { in: images.map((i) => i.imageId!) }, cafeId: cafe.id } }),
  ]);
  await logChange(cafe.id, user.name, "section", `Deleted section ${c.nameEn}`);
  return menuOf(cafe.id);
}

export async function moveCategory(id: string, dir: -1 | 1): Promise<MenuDTO> {
  const { cafe } = await requireCafe("manager");
  const list = await prisma.category.findMany({ where: { cafeId: cafe.id }, orderBy: { position: "asc" } });
  await reorder(list, id, dir, (cid, position) => prisma.category.update({ where: { id: cid }, data: { position } }));
  return menuOf(cafe.id);
}

// ---------- items ----------

export async function addItem(categoryId: string, fields: { nameEn: string; nameAm: string; price: number }): Promise<MenuDTO> {
  const { cafe, user } = await requireCafe("manager");
  await ownedCategory(cafe.id, categoryId);
  const d = z.object({ nameEn: shortText.min(1), nameAm: shortText, price }).parse(fields);
  await checkItemLimit(cafe);
  const last = await prisma.item.findFirst({ where: { categoryId }, orderBy: { position: "desc" } });
  await prisma.item.create({ data: { cafeId: cafe.id, categoryId, ...d, position: (last?.position ?? -1) + 1 } });
  await logChange(cafe.id, user.name, "item", `Added ${d.nameEn} (${d.price} birr)`);
  return menuOf(cafe.id);
}

const itemFields = z
  .object({
    nameEn: shortText.min(1),
    nameAm: shortText,
    descEn: longText,
    descAm: longText,
    price,
    fasting: z.boolean(),
    hidden: z.boolean(),
    tags: z.array(z.enum(TAGS)).max(4),
    variants: z.array(option).max(6),
    addons: z.array(option).max(10),
    libraryPhoto: z.string().refine(isLibraryKey).nullable(),
  })
  .partial();

export async function updateItem(id: string, fields: z.input<typeof itemFields>): Promise<void> {
  const { cafe, user } = await requireCafe("manager");
  const item = await ownedItem(cafe.id, id);
  const data = itemFields.parse(fields);
  const before = Object.fromEntries(Object.keys(data).map((k) => [k, (item as Record<string, unknown>)[k]]));
  await prisma.item.update({ where: { id }, data });
  const what = "price" in data ? `${item.nameEn}: ${item.price} → ${data.price} birr` : `${item.nameEn}: ${Object.keys(data).join(", ")}`;
  await logChange(cafe.id, user.name, "price" in data ? "price" : "item", what, { kind: "items", rows: [{ id, data: before }] });
}

// Staff may do this one.
export async function setSoldOut(id: string, soldOut: boolean): Promise<void> {
  const { cafe, user } = await requireCafe("staff");
  const item = await ownedItem(cafe.id, id);
  await prisma.item.update({ where: { id }, data: { soldOutUntil: soldOut ? nextMorningReset() : null } });
  await logChange(cafe.id, user.name, "soldout", `${item.nameEn}: ${soldOut ? "sold out" : "available again"}`, { kind: "items", rows: [{ id, data: { soldOutUntil: item.soldOutUntil } }] });
}

export async function deleteItem(id: string): Promise<MenuDTO> {
  const { cafe, user } = await requireCafe("manager");
  const item = await ownedItem(cafe.id, id);
  await prisma.item.delete({ where: { id } });
  if (item.imageId) await prisma.image.deleteMany({ where: { id: item.imageId, cafeId: cafe.id } });
  const { imageId: _photo, ...snapshot } = item;
  await logChange(cafe.id, user.name, "item", `Deleted ${item.nameEn}`, { kind: "restoreItem", item: snapshot as Record<string, unknown> });
  return menuOf(cafe.id);
}

export async function moveItem(id: string, dir: -1 | 1): Promise<MenuDTO> {
  const { cafe } = await requireCafe("manager");
  const item = await ownedItem(cafe.id, id);
  const list = await prisma.item.findMany({ where: { categoryId: item.categoryId }, orderBy: { position: "asc" } });
  await reorder(list, id, dir, (iid, position) => prisma.item.update({ where: { id: iid }, data: { position } }));
  return menuOf(cafe.id);
}

export async function moveItemToCategory(id: string, categoryId: string): Promise<MenuDTO> {
  const { cafe } = await requireCafe("manager");
  await ownedItem(cafe.id, id);
  await ownedCategory(cafe.id, categoryId);
  const last = await prisma.item.findFirst({ where: { categoryId }, orderBy: { position: "desc" } });
  await prisma.item.update({ where: { id }, data: { categoryId, position: (last?.position ?? -1) + 1 } });
  return menuOf(cafe.id);
}

export async function bulkPrice(percent: number, categoryId: string | null): Promise<MenuDTO> {
  const { cafe, user } = await requireCafe("manager");
  const pct = z.number().int().min(-50).max(100).refine((n) => n !== 0).parse(percent);
  if (categoryId) await ownedCategory(cafe.id, categoryId);
  const items = await prisma.item.findMany({ where: { cafeId: cafe.id, ...(categoryId ? { categoryId } : {}) } });
  await prisma.$transaction(
    items.map((i) =>
      prisma.item.update({
        where: { id: i.id },
        data: { price: applyPercent(i.price, pct), variants: (i.variants as Option[]).map((v) => ({ ...v, price: applyPercent(v.price, pct) })) },
      }),
    ),
  );
  await logChange(cafe.id, user.name, "price", `${pct > 0 ? "+" : ""}${pct}% on ${items.length} items`, {
    kind: "items",
    rows: items.map((i) => ({ id: i.id, data: { price: i.price, variants: i.variants } })),
  });
  return menuOf(cafe.id);
}

export async function undo(changeId: string): Promise<boolean> {
  const { cafe } = await requireCafe("manager");
  return undoChange(cafe.id, changeId);
}

// ---------- photos ----------

function sniffImage(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const head = new TextDecoder().decode(bytes.slice(0, 12));
  if (head.startsWith("RIFF") && head.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

// target is "logo", "cover", "slide" or an item id. The browser resizes photos before upload, so they arrive small.
export async function uploadImage(fd: FormData): Promise<{ ok: true; imageId: string } | { ok: false }> {
  const { cafe } = await requireCafe("manager");
  const target = String(fd.get("target") ?? "");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_IMAGE_BYTES) return { ok: false };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return { ok: false };

  let oldId: string | null = null;
  if (target === "logo") oldId = cafe.logoId;
  else if (target === "cover") oldId = cafe.coverId;
  else if (target !== "slide") oldId = (await ownedItem(cafe.id, target)).imageId;

  const img = await prisma.image.create({ data: { cafeId: cafe.id, mime, data: bytes } });
  if (target === "logo") await prisma.cafe.update({ where: { id: cafe.id }, data: { logoId: img.id } });
  else if (target === "cover") await prisma.cafe.update({ where: { id: cafe.id }, data: { coverId: img.id } });
  else if (target === "slide") {
    const last = await prisma.screenSlide.findFirst({ where: { cafeId: cafe.id }, orderBy: { position: "desc" } });
    await prisma.screenSlide.create({ data: { cafeId: cafe.id, imageId: img.id, position: (last?.position ?? -1) + 1 } });
  } else await prisma.item.update({ where: { id: target }, data: { imageId: img.id } });
  if (oldId) await prisma.image.deleteMany({ where: { id: oldId, cafeId: cafe.id } });
  return { ok: true, imageId: img.id };
}

export async function removeImage(target: string): Promise<void> {
  const { cafe } = await requireCafe("manager");
  let oldId: string | null;
  if (target === "logo" || target === "cover") {
    oldId = target === "logo" ? cafe.logoId : cafe.coverId;
    await prisma.cafe.update({ where: { id: cafe.id }, data: target === "logo" ? { logoId: null } : { coverId: null } });
  } else if (target.startsWith("slide:")) {
    oldId = target.slice(6);
    await prisma.screenSlide.deleteMany({ where: { cafeId: cafe.id, imageId: oldId } });
  } else {
    oldId = (await ownedItem(cafe.id, target)).imageId;
    await prisma.item.update({ where: { id: target }, data: { imageId: null } });
  }
  if (oldId) await prisma.image.deleteMany({ where: { id: oldId, cafeId: cafe.id } });
}

// ---------- helpers ----------

// Swap an entry with its neighbour and rewrite positions as 0..n-1 so gaps never build up.
async function reorder<T extends { id: string }>(
  list: T[],
  id: string,
  dir: -1 | 1,
  write: (id: string, position: number) => ReturnType<typeof prisma.item.update> | ReturnType<typeof prisma.category.update>,
) {
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  await prisma.$transaction(next.map((x, pos) => write(x.id, pos)));
}
