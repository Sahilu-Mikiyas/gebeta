export const PLANS = {
  free: { en: "Free", am: "ነፃ", price: 0, items: 30, branches: 1, staff: 0, screens: false, ordering: false, label: true },
  cafe: { en: "Cafe", am: "ካፌ", price: 590, items: Infinity, branches: 1, staff: 5, screens: true, ordering: true, label: false },
  group: { en: "Group", am: "ቡድን", price: 1490, items: Infinity, branches: 5, staff: 25, screens: true, ordering: true, label: false },
} as const;

export type PlanId = keyof typeof PLANS;

// A paid plan counts only while planUntil is in the future.
export function effectivePlan(plan: string, planUntil: Date | string | null | undefined, now = new Date()): PlanId {
  if ((plan === "cafe" || plan === "group") && planUntil && new Date(planUntil) > now) return plan;
  return "free";
}

export const STANDS = {
  acrylic: { en: "Printed acrylic stand", am: "የታተመ አክሪሊክ መቆሚያ", price: 850 },
  wood: { en: "Wanza wood stand", am: "የዋንዛ እንጨት መቆሚያ", price: 1400 },
  led: { en: "LED backlit stand", am: "የLED መቆሚያ", price: 3900 },
  tv: { en: "43\" menu screen with mount", am: "43 ኢንች የምናሌ ስክሪን", price: 38500 },
} as const;

export type StandId = keyof typeof STANDS;

export function standTotal(kind: StandId, qty: number): { subtotal: number; discount: number; delivery: number; total: number } {
  const subtotal = STANDS[kind].price * qty;
  const rate = kind === "tv" ? 0 : qty >= 20 ? 0.15 : qty >= 10 ? 0.1 : 0;
  const discount = Math.round(subtotal * rate);
  const delivery = kind === "tv" || qty >= 10 ? 0 : 300;
  return { subtotal, discount, delivery, total: subtotal - discount + delivery };
}

// Where owners send manual payments until online checkout is switched on. Set these on the server.
export function paymentAccounts() {
  return {
    telebirr: process.env.PAY_TELEBIRR ?? "",
    cbe: process.env.PAY_CBE ?? "",
    chapa: !!process.env.CHAPA_SECRET_KEY,
  };
}
