import { prisma } from "@/lib/db";
import { chapaVerify } from "@/lib/chapa";

// Chapa calls this after a payment. We never trust the call itself: we verify the reference with Chapa.
async function handle(txRef: string | null) {
  if (!txRef) return new Response("missing tx_ref", { status: 400 });
  if (!(await chapaVerify(txRef))) return new Response("not paid", { status: 402 });
  const [kind, id] = txRef.split("-");
  if (kind === "plan") {
    const p = await prisma.planPayment.findUnique({ where: { id } });
    if (p && p.status === "pending") {
      const cafe = await prisma.cafe.findUnique({ where: { id: p.cafeId } });
      const from = cafe?.planUntil && cafe.planUntil > new Date() ? cafe.planUntil : new Date();
      await prisma.$transaction([
        prisma.planPayment.update({ where: { id }, data: { status: "paid", payMethod: "chapa", payRef: txRef } }),
        prisma.cafe.update({ where: { id: p.cafeId }, data: { plan: p.plan, planUntil: new Date(from.getTime() + p.months * 30 * 86_400_000) } }),
      ]);
    }
  } else if (kind === "shop") {
    await prisma.shopOrder.updateMany({ where: { id, status: "pending" }, data: { status: "paid", payMethod: "chapa", payRef: txRef } });
  }
  return Response.json({ ok: true });
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  return handle(sp.get("trx_ref") ?? sp.get("tx_ref"));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return handle(body?.trx_ref ?? body?.tx_ref ?? null);
}
