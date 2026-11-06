// Time-of-day rules in Addis Ababa time (UTC+3, no daylight saving).

export function addisMinutes(now: Date = new Date()): number {
  const local = new Date(now.getTime() + 3 * 3_600_000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

export function addisWeekday(now: Date = new Date()): number {
  return new Date(now.getTime() + 3 * 3_600_000).getUTCDay();
}

// Window [from, to) in minutes. A window that wraps midnight (e.g. 22:00–02:00) is supported.
export function inWindow(minute: number, from: number | null | undefined, to: number | null | undefined): boolean {
  if (from == null || to == null) return true;
  if (from === to) return true;
  return from < to ? minute >= from && minute < to : minute >= from || minute < to;
}

export type SpecialRule = { price: number; days: number; fromMin: number; toMin: number; active: boolean; labelEn: string; labelAm: string };

export function activeSpecial<T extends SpecialRule>(specials: T[], now: Date = new Date()): T | null {
  const m = addisMinutes(now);
  const day = addisWeekday(now);
  return specials.find((s) => s.active && (s.days & (1 << day)) !== 0 && inWindow(m, s.fromMin, s.toMin)) ?? null;
}

export function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function hhmmToMinutes(s: string): number | null {
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 24 || mm > 59) return null;
  return Math.min(1440, h * 60 + mm);
}
