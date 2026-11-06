import { z } from "zod";
import { prisma } from "@/lib/db";
import { loadMenu } from "@/lib/menu-data";
import { notifyCafe } from "@/lib/notify";
import { tooManyAttempts } from "@/lib/ratelimit";
import { esc } from "@/lib/telegram";

// Customer actions from the public menu: place an order, call a waiter, leave feedback, record an item view.
const body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("view"), slug: z.string(), itemId: z.string() }),
  z.object({ type: z.literal("call"), slug: z.string(), table: z.string().min(1).max(10), kind: z.enum(["waiter", "bill"]) }),
  z.object({ type: z.literal("feedback"), slug: z.string(), table: z.string().max(10), rating: z.number().int().min(1).max(5), comment: z.string().trim().max(500) }),
  z.object({
    type: z.literal("order"),
    slug: z.string(),
    table: z.string().min(1).max(10),
    note: z.string().trim().max(200),
    lines: z.array(z.object({ itemId: z.string(), variant: z.number().int().min(-1).max(10), addons: z.array(z.number().int().min(0).max(20)).max(10), qty: z.number().int().min(1).max(50) })).min(1).max(40),
  }),
  z.object({ type: z.literal("status"), slug: z.string(), orderIds: z.array(z.string()).max(20) }),
]);

export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad_request" }, { status: 400 });
  const d = parsed.data;
  const cafe = await prisma.cafe.findUnique({ where: { slug: d.slug } });
  if (!cafe) return Response.json({ error: "not_found" }, { status: 404 });
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";

  if (d.type === "view") {
    if (!(await tooManyAttempts(`view:${ip}`, 120, 60_000))) {
      await prisma.itemView.create({ data: { cafeId: cafe.id, itemId: d.itemId } }).catch(() => {});
    }
    return Response.json({ ok: true });
  }

  if (d.type === "status") {
    const orders = await prisma.order.findMany({ where: { cafeId: cafe.id, id: { in: d.orderIds } }, select: { id: true, number: true, status: true } });
    return Response.json({ orders });
  }

  if (await tooManyAttempts(`public:${ip}`, 30, 10 * 60_000)) return Response.json({ error: "rate" }, { status: 429 });

  if (d.type === "call") {
    if (!cafe.callsOn) return Response.json({ error: "off" }, { status: 403 });
    const open = await prisma.serviceCall.findFirst({ where: { cafeId: cafe.id, table: d.table, kind: d.kind, doneAt: null } });
    if (!open) {
      await prisma.serviceCall.create({ data: { cafeId: cafe.id, table: d.table, kind: d.kind } });
      await notifyCafe(cafe.id, d.kind === "bill" ? `🧾 Table ${esc(d.table)} wants the bill` : `🙋 Table ${esc(d.table)} is calling a waiter`);
    }
    return Response.json({ ok: true });
  }

  if (d.type === "feedback") {
    await prisma.feedback.create({ data: { cafeId: cafe.id, table: d.table, rating: d.rating, comment: d.comment } });
    if (d.rating <= 2 || d.comment) await notifyCafe(cafe.id, `${"⭐".repeat(d.rating)} feedback${d.table ? ` from table ${esc(d.table)}` : ""}${d.comment ? `\n“${esc(d.comment)}”` : ""}`);
    return Response.json({ ok: true });
  }

  // Order: prices always come from the server's menu, never from the phone.
  if (!cafe.orderingOn) return Response.json({ error: "off" }, { status: 403 });
  const menu = await loadMenu({ id: cafe.id }, { publicView: true });
  const items = new Map(menu!.categories.flatMap((c) => c.items.map((i) => [i.id, { ...i, open: c.availableNow }] as const)));
  const lines: { itemId: string; name: string; variant: string; addons: string; qty: number; unitPrice: number; lineTotal: number }[] = [];
  for (const l of d.lines) {
    const it = items.get(l.itemId);
    if (!it || it.soldOut || !it.open) return Response.json({ error: "unavailable", itemId: l.itemId }, { status: 409 });
    const variant = l.variant >= 0 ? it.variants[l.variant] : undefined;
    if (l.variant >= 0 && !variant) return Response.json({ error: "bad_request" }, { status: 400 });
    const extras = l.addons.map((a) => it.addons[a]).filter(Boolean);
    const base = it.special ? it.special.price : variant ? variant.price : it.price;
    const unit = base + extras.reduce((s, a) => s + a.price, 0);
    lines.push({ itemId: it.id, name: it.nameEn, variant: variant?.nameEn ?? "", addons: extras.map((a) => a.nameEn).join(", "), qty: l.qty, unitPrice: unit, lineTotal: unit * l.qty });
  }
  const total = lines.reduce((s, l) => s + l.lineTotal, 0);
  const order = await prisma.$transaction(async (tx) => {
    const last = await tx.order.findFirst({ where: { cafeId: cafe.id }, orderBy: { number: "desc" }, select: { number: true } });
    return tx.order.create({ data: { cafeId: cafe.id, number: (last?.number ?? 0) + 1, table: d.table, note: d.note, total, lines: { create: lines } } });
  });
  await notifyCafe(cafe.id, `🧾 <b>Order #${order.number}</b> · table ${esc(d.table)} · ${total} ብር\n${lines.map((l) => `${l.qty} × ${esc(l.name)}${l.variant ? ` (${esc(l.variant)})` : ""}${l.addons ? ` + ${esc(l.addons)}` : ""}`).join("\n")}${d.note ? `\n📝 ${esc(d.note)}` : ""}`);
  return Response.json({ ok: true, orderId: order.id, number: order.number, total });
}
