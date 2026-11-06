import { prisma } from "@/lib/db";
import { requireCafe } from "@/lib/access";
import { chapaEnabled, chapaInit } from "@/lib/chapa";
import { appUrlFrom } from "@/lib/qr";

// GET /api/chapa/start?kind=shop|plan&id=… — sends the owner to Chapa's checkout page.
export async function GET(req: Request) {
  if (!chapaEnabled()) return new Response("Online payment is not switched on.", { status: 404 });
  const { cafe } = await requireCafe("owner");
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind");
  const id = sp.get("id") ?? "";
  const row = kind === "plan" ? await prisma.planPayment.findFirst({ where: { id, cafeId: cafe.id, status: "pending" } }) : await prisma.shopOrder.findFirst({ where: { id, cafeId: cafe.id, status: "pending" } });
  if (!row) return new Response("Not found", { status: 404 });
  const base = appUrlFrom(req);
  const txRef = `${kind}-${row.id}-${Date.now().toString(36)}`;
  const url = await chapaInit({
    txRef,
    amount: "amount" in row ? row.amount : row.total,
    title: "Gebeta",
    returnUrl: `${base}/dashboard/shop`,
    callbackUrl: `${base}/api/chapa/callback`,
  });
  if (!url) return new Response("Chapa did not accept the payment. Try another method.", { status: 502 });
  return Response.redirect(url, 303);
}
