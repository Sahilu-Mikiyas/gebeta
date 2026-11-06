// Chapa online checkout (Telebirr, CBE Birr, cards). Off until CHAPA_SECRET_KEY is set.
const API = "https://api.chapa.co/v1";

export const chapaEnabled = () => !!process.env.CHAPA_SECRET_KEY;

export async function chapaInit(input: { txRef: string; amount: number; phone?: string; title: string; returnUrl: string; callbackUrl: string }): Promise<string | null> {
  const res = await fetch(`${API}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: String(input.amount),
      currency: "ETB",
      tx_ref: input.txRef,
      phone_number: input.phone,
      callback_url: input.callbackUrl,
      return_url: input.returnUrl,
      customization: { title: input.title.slice(0, 16) },
    }),
  }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return data?.status === "success" ? data.data?.checkout_url ?? null : null;
}

export async function chapaVerify(txRef: string): Promise<boolean> {
  const res = await fetch(`${API}/transaction/verify/${encodeURIComponent(txRef)}`, { headers: { Authorization: `Bearer ${process.env.CHAPA_SECRET_KEY}` } }).catch(() => null);
  const data = await res?.json().catch(() => null);
  return data?.status === "success" && data.data?.status === "success";
}
