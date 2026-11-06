import { describe, expect, it } from "vitest";
import { fasika, fastingToday } from "../src/lib/ethiopia";
import { activeSpecial, hhmmToMinutes, inWindow, minutesToHHMM } from "../src/lib/pricing";
import { effectivePlan, standTotal } from "../src/lib/plans";

// Times are given in UTC; Addis is UTC+3.
describe("Ethiopian calendar", () => {
  it("finds Fasika (Orthodox Easter)", () => {
    expect(fasika(2025).toISOString().slice(0, 10)).toBe("2025-04-20");
    expect(fasika(2026).toISOString().slice(0, 10)).toBe("2026-04-12");
    expect(fasika(2027).toISOString().slice(0, 10)).toBe("2027-05-02");
  });
  it("knows fasting days", () => {
    expect(fastingToday(new Date("2026-03-10T09:00:00Z")).season?.en).toBe("Great Lent");
    expect(fastingToday(new Date("2026-11-06T09:00:00Z")).season?.en).toBe("Friday fast");
    expect(fastingToday(new Date("2026-12-01T09:00:00Z")).season?.en).toBe("Advent fast");
    expect(fastingToday(new Date("2026-08-10T09:00:00Z")).season?.en).toBe("Fast of Filseta");
    expect(fastingToday(new Date("2026-11-07T09:00:00Z")).fasting).toBe(false); // Saturday
    expect(fastingToday(new Date("2026-04-17T09:00:00Z")).fasting).toBe(false); // Friday after Fasika
  });
});

describe("time windows and specials", () => {
  it("handles plain and overnight windows", () => {
    expect(inWindow(8 * 60, 6 * 60, 11 * 60)).toBe(true);
    expect(inWindow(11 * 60, 6 * 60, 11 * 60)).toBe(false);
    expect(inWindow(23 * 60, 22 * 60, 2 * 60)).toBe(true);
    expect(inWindow(60, 22 * 60, 2 * 60)).toBe(true);
    expect(inWindow(12 * 60, null, null)).toBe(true);
  });
  it("converts times", () => {
    expect(hhmmToMinutes("06:30")).toBe(390);
    expect(hhmmToMinutes("25:00")).toBeNull();
    expect(minutesToHHMM(1439)).toBe("23:59");
  });
  it("picks a special by Addis day and time", () => {
    const tue = 1 << 2;
    const rules = [{ price: 390, days: tue, fromMin: 12 * 60, toMin: 15 * 60, active: true, labelEn: "Tibs Tuesday", labelAm: "" }];
    expect(activeSpecial(rules, new Date("2026-11-10T10:00:00Z"))?.price).toBe(390); // Tue 13:00 Addis
    expect(activeSpecial(rules, new Date("2026-11-10T13:00:00Z"))).toBeNull(); // Tue 16:00 Addis
    expect(activeSpecial(rules, new Date("2026-11-11T10:00:00Z"))).toBeNull(); // Wednesday
    expect(activeSpecial([{ ...rules[0], active: false }], new Date("2026-11-10T10:00:00Z"))).toBeNull();
  });
});

describe("plans and shop", () => {
  it("expires paid plans", () => {
    const now = new Date("2026-11-06T00:00:00Z");
    expect(effectivePlan("cafe", new Date("2026-12-01"), now)).toBe("cafe");
    expect(effectivePlan("cafe", new Date("2026-11-01"), now)).toBe("free");
    expect(effectivePlan("cafe", null, now)).toBe("free");
  });
  it("prices stand orders", () => {
    expect(standTotal("acrylic", 5)).toEqual({ subtotal: 4250, discount: 0, delivery: 300, total: 4550 });
    expect(standTotal("led", 12)).toEqual({ subtotal: 46800, discount: 4680, delivery: 0, total: 42120 });
    expect(standTotal("wood", 20).discount).toBe(4200);
    expect(standTotal("tv", 2).delivery).toBe(0);
  });
});
