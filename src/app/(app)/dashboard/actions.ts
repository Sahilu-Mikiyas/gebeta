"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { loadMenu } from "@/lib/menu-data";
import { applyPercent, nextMorningReset } from "@/lib/menu";
import { isValidSlug, slugify } from "@/lib/slug";
import { isTemplate } from "@/lib/templates";
import { STARTER_MENU } from "@/lib/starter";
import type { MenuDTO } from "@/lib/types";
import type { UIKey } from "@/lib/i18n";

const MAX_IMAGE_BYTES = 600 * 1024;

const shortText = z.string().trim().max(80);
const longText = z.string().trim().max(240);
const price = z.number().int().min(0).max(1_000_000);

async function myCafe() {
  const owner = await requireOwner();
  const cafe = await prisma.cafe.findFirst({ where: { ownerId: owner.id }, orderBy: { createdAt: "asc" } });
  if (!cafe) redirect("/dashboard");
  return cafe;
}

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

async function uniqueSlug(base: string, exceptCafeId?: string): Promise<string> {
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? base : `${base.slice(0, 36)}-${n}`;
    const hit = await prisma.cafe.findUnique({ where: { slug: candidate } });
    if (!hit || hit.id === exceptCafeId) return candidate;
  }
  return `${base.slice(0, 30)}-${Date.now().toString(36)}`;
}

// ---------- onboarding ----------

export type CreateCafeState = { error?: UIKey } | undefined;

export async function createCafe(_prev: CreateCafeState, fd: FormData): Promise<CreateCafeState> {
  const owner = await requireOwner();
  if (await prisma.cafe.findFirst({ where: { ownerId: owner.id } })) redirect("/dashboard");

  const parsed = z
    .object({ nameEn: shortText.min(2), nameAm: shortText, area: shortText, starter: z.boolean() })
    .safeParse({
      nameEn: String(fd.get("nameEn") ?? ""),
      nameAm: String(fd.get("nameAm") ?? ""),
      area: String(fd.get("area") ?? ""),
      starter: fd.get("starter") === "on",
    });
  if (!parsed.success) return { error: "err_cafe" };
  const d = parsed.data;

  const slug = await uniqueSlug(slugify(d.nameEn));
  await prisma.$transaction(async (tx) => {
    const cafe = await tx.cafe.create({
      data: { ownerId: owner.id, slug, nameEn: d.nameEn, nameAm: d.nameAm, area: d.area },
    });
    if (d.starter) {
      for (const [ci, c] of STARTER_MENU.entries()) {
        await tx.category.create({
          data: {
            cafeId: cafe.id,
            nameEn: c.en,
            nameAm: c.am,
            position: ci,
            items: {
              create: c.items.map((it, ii) => ({
                cafeId: cafe.id,
                nameEn: it.en,
                nameAm: it.am,
                descEn: it.descEn ?? "",
                descAm: it.descAm ?? "",
                price: it.price,
                fasting: !!it.fasting,
                position: ii,
              })),
            },
          },
        });
      }
    }
  });
  redirect("/dashboard");
}

// ---------- cafe ----------

const cafeFields = z
  .object({
    nameEn: shortText.min(2),
    nameAm: shortText,
    area: shortText,
    hoursEn: shortText,
    hoursAm: shortText,
  })
  .partial();

export async function updateCafe(fields: z.input<typeof cafeFields>): Promise<void> {
  const cafe = await myCafe();
  const data = cafeFields.parse(fields);
  await prisma.cafe.update({ where: { id: cafe.id }, data });
}

export async function setTemplate(template: string): Promise<void> {
  const cafe = await myCafe();
  if (!isTemplate(template)) throw new Error("Unknown template");
  await prisma.cafe.update({ where: { id: cafe.id }, data: { template } });
}

export async function setSlug(slug: string): Promise<{ ok: true; slug: string } | { ok: false; error: UIKey }> {
  const cafe = await myCafe();
  const s = slug.trim().toLowerCase();
  if (!isValidSlug(s)) return { ok: false, error: "err_slug" };
  const hit = await prisma.cafe.findUnique({ where: { slug: s } });
  if (hit && hit.id !== cafe.id) return { ok: false, error: "err_slugTaken" };
  await prisma.cafe.update({ where: { id: cafe.id }, data: { slug: s } });
  return { ok: true, slug: s };
}

// ---------- sections ----------

export async function addCategory(nameEn: string, nameAm: string): Promise<MenuDTO> {
  const cafe = await myCafe();
  const d = z.object({ nameEn: shortText.min(1), nameAm: shortText }).parse({ nameEn, nameAm });
  const last = await prisma.category.findFirst({ where: { cafeId: cafe.id }, orderBy: { position: "desc" } });
  await prisma.category.create({ data: { cafeId: cafe.id, ...d, position: (last?.position ?? -1) + 1 } });
  return menuOf(cafe.id);
}

export async function updateCategory(id: string, fields: { nameEn?: string; nameAm?: string }): Promise<void> {
  const cafe = await myCafe();
  await ownedCategory(cafe.id, id);
  const data = z.object({ nameEn: shortText.min(1), nameAm: shortText }).partial().parse(fields);
  await prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(id: string): Promise<MenuDTO> {
  const cafe = await myCafe();
  await ownedCategory(cafe.id, id);
  const images = await prisma.item.findMany({ where: { categoryId: id, imageId: { not: null } }, select: { imageId: true } });
  await prisma.$transaction([
    prisma.category.delete({ where: { id } }),
    prisma.image.deleteMany({ where: { id: { in: images.map((i) => i.imageId!) }, cafeId: cafe.id } }),
  ]);
  return menuOf(cafe.id);
}

export async function moveCategory(id: string, dir: -1 | 1): Promise<MenuDTO> {
  const cafe = await myCafe();
  const list = await prisma.category.findMany({ where: { cafeId: cafe.id }, orderBy: { position: "asc" } });
  await reorder(list, id, dir, (cid, position) => prisma.category.update({ where: { id: cid }, data: { position } }));
  return menuOf(cafe.id);
}

// ---------- items ----------

export async function addItem(categoryId: string, fields: { nameEn: string; nameAm: string; price: number }): Promise<MenuDTO> {
  const cafe = await myCafe();
  await ownedCategory(cafe.id, categoryId);
  const d = z.object({ nameEn: shortText.min(1), nameAm: shortText, price }).parse(fields);
  const last = await prisma.item.findFirst({ where: { categoryId }, orderBy: { position: "desc" } });
  await prisma.item.create({ data: { cafeId: cafe.id, categoryId, ...d, position: (last?.position ?? -1) + 1 } });
  return menuOf(cafe.id);
}

const itemFields = z
  .object({ nameEn: shortText.min(1), nameAm: shortText, descEn: longText, descAm: longText, price, fasting: z.boolean() })
  .partial();

export async function updateItem(id: string, fields: z.input<typeof itemFields>): Promise<void> {
  const cafe = await myCafe();
  await ownedItem(cafe.id, id);
  await prisma.item.update({ where: { id }, data: itemFields.parse(fields) });
}

export async function setSoldOut(id: string, soldOut: boolean): Promise<void> {
  const cafe = await myCafe();
  await ownedItem(cafe.id, id);
  await prisma.item.update({ where: { id }, data: { soldOutUntil: soldOut ? nextMorningReset() : null } });
}

export async function deleteItem(id: string): Promise<MenuDTO> {
  const cafe = await myCafe();
  const item = await ownedItem(cafe.id, id);
  await prisma.item.delete({ where: { id } });
  if (item.imageId) await prisma.image.deleteMany({ where: { id: item.imageId, cafeId: cafe.id } });
  return menuOf(cafe.id);
}

export async function moveItem(id: string, dir: -1 | 1): Promise<MenuDTO> {
  const cafe = await myCafe();
  const item = await ownedItem(cafe.id, id);
  const list = await prisma.item.findMany({ where: { categoryId: item.categoryId }, orderBy: { position: "asc" } });
  await reorder(list, id, dir, (iid, position) => prisma.item.update({ where: { id: iid }, data: { position } }));
  return menuOf(cafe.id);
}

export async function moveItemToCategory(id: string, categoryId: string): Promise<MenuDTO> {
  const cafe = await myCafe();
  await ownedItem(cafe.id, id);
  await ownedCategory(cafe.id, categoryId);
  const last = await prisma.item.findFirst({ where: { categoryId }, orderBy: { position: "desc" } });
  await prisma.item.update({ where: { id }, data: { categoryId, position: (last?.position ?? -1) + 1 } });
  return menuOf(cafe.id);
}

export async function bulkPrice(percent: number, categoryId: string | null): Promise<MenuDTO> {
  const cafe = await myCafe();
  const pct = z.number().min(-50).max(100).refine((n) => n !== 0).parse(percent);
  if (categoryId) await ownedCategory(cafe.id, categoryId);
  const items = await prisma.item.findMany({ where: { cafeId: cafe.id, ...(categoryId ? { categoryId } : {}) } });
  await prisma.$transaction(items.map((i) => prisma.item.update({ where: { id: i.id }, data: { price: applyPercent(i.price, pct) } })));
  return menuOf(cafe.id);
}

// ---------- photos ----------

function sniffImage(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const head = new TextDecoder().decode(bytes.slice(0, 12));
  if (head.startsWith("RIFF") && head.slice(8, 12) === "WEBP") return "image/webp";
  return null;
}

// target is "logo" or an item id. The browser resizes photos before upload, so they arrive small.
export async function uploadImage(fd: FormData): Promise<{ ok: true; imageId: string } | { ok: false }> {
  const cafe = await myCafe();
  const target = String(fd.get("target") ?? "");
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_IMAGE_BYTES) return { ok: false };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = sniffImage(bytes);
  if (!mime) return { ok: false };

  const oldId = target === "logo" ? cafe.logoId : (await ownedItem(cafe.id, target)).imageId;
  const img = await prisma.image.create({ data: { cafeId: cafe.id, mime, data: bytes } });
  if (target === "logo") await prisma.cafe.update({ where: { id: cafe.id }, data: { logoId: img.id } });
  else await prisma.item.update({ where: { id: target }, data: { imageId: img.id } });
  if (oldId) await prisma.image.deleteMany({ where: { id: oldId, cafeId: cafe.id } });
  return { ok: true, imageId: img.id };
}

export async function removeImage(target: string): Promise<void> {
  const cafe = await myCafe();
  let oldId: string | null;
  if (target === "logo") {
    oldId = cafe.logoId;
    await prisma.cafe.update({ where: { id: cafe.id }, data: { logoId: null } });
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
