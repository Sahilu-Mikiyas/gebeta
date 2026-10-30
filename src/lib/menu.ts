// Addis Ababa is UTC+3 all year. Sold-out items come back at 6:00 AM local time (03:00 UTC).
export function nextMorningReset(now: Date = new Date()): Date {
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 0, 0));
  if (reset <= now) reset.setUTCDate(reset.getUTCDate() + 1);
  return reset;
}

export function isSoldOut(until: Date | string | null | undefined, now: Date = new Date()): boolean {
  return !!until && new Date(until).getTime() > now.getTime();
}

export function roundTo5(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5);
}

// Raise (or lower) a price by a percentage and round to the nearest 5 birr.
export function applyPercent(price: number, percent: number): number {
  return roundTo5(price * (1 + percent / 100));
}

export function formatBirr(n: number): string {
  return n.toLocaleString("en-US");
}

// Day key (YYYY-MM-DD) in Addis time, used to bucket scans per day.
export function addisDayKey(d: Date): string {
  return new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}
