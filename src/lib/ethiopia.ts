// Ethiopian Orthodox fasting calendar, used to highlight fasting dishes automatically.

// Orthodox Easter (Fasika) in the Gregorian calendar, via the Julian computus (Meeus) + 13 days (valid 1900–2099).
export function fasika(year: number): Date {
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31); // Julian month
  const day = ((d + e + 114) % 31) + 1;
  const julian = Date.UTC(year, month - 1, day);
  return new Date(julian + 13 * 86_400_000);
}

const DAY = 86_400_000;

export type FastingSeason = { en: string; am: string } | null;

// Is this Addis calendar day a fasting day, and which season (if a named one)?
export function fastingToday(now: Date = new Date()): { fasting: boolean; season: FastingSeason } {
  const local = new Date(now.getTime() + 3 * 3_600_000);
  const y = local.getUTCFullYear();
  const today = Date.UTC(y, local.getUTCMonth(), local.getUTCDate());
  const easter = fasika(y).getTime();

  // Abiy Tsom (Great Lent): 55 days ending the day before Fasika.
  if (today >= easter - 55 * DAY && today < easter) return { fasting: true, season: { en: "Great Lent", am: "ዐቢይ ጾም" } };
  // The 50 days after Fasika have no Wednesday/Friday fast.
  const afterEaster = today >= easter && today < easter + 50 * DAY;

  const m = local.getUTCMonth() + 1;
  const d = local.getUTCDate();
  // Fast of the Prophets (Tsome Nebiyat): Nov 25 – Jan 6. Filseta: Aug 7 – 21.
  if ((m === 11 && d >= 25) || m === 12 || (m === 1 && d <= 6)) return { fasting: true, season: { en: "Advent fast", am: "ጾመ ነቢያት" } };
  if (m === 8 && d >= 7 && d <= 21) return { fasting: true, season: { en: "Fast of Filseta", am: "ጾመ ፍልሰታ" } };

  const weekday = local.getUTCDay();
  if (!afterEaster && (weekday === 3 || weekday === 5)) return { fasting: true, season: { en: weekday === 3 ? "Wednesday fast" : "Friday fast", am: weekday === 3 ? "የረቡዕ ጾም" : "የዓርብ ጾም" } };
  return { fasting: false, season: null };
}
