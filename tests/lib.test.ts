import { describe, expect, it } from "vitest";
import { normalizePhone, displayPhone } from "../src/lib/phone";
import { slugify, isValidSlug } from "../src/lib/slug";
import { applyPercent, isSoldOut, nextMorningReset, roundTo5, addisDayKey } from "../src/lib/menu";

describe("normalizePhone", () => {
  it.each([
    ["0911234567", "+251911234567"],
    ["0911 23 45 67", "+251911234567"],
    ["911234567", "+251911234567"],
    ["+251911234567", "+251911234567"],
    ["251-911-234-567", "+251911234567"],
    ["0712345678", "+251712345678"],
  ])("accepts %s", (input, out) => expect(normalizePhone(input)).toBe(out));

  it.each(["", "0111234567", "091123456", "09112345678", "+1 555 123 4567", "abc"])("rejects %s", (input) =>
    expect(normalizePhone(input)).toBeNull(),
  );

  it("formats for display", () => expect(displayPhone("+251911234567")).toBe("0911 23 45 67"));
});

describe("slug", () => {
  it("slugifies cafe names", () => {
    expect(slugify("Selam Buna House")).toBe("selam-buna-house");
    expect(slugify("  Café   Kaldi's!! ")).toBe("cafe-kaldi-s");
    expect(slugify("ሰላም ቡና")).toBe("cafe");
    expect(slugify("Go")).toBe("go-cafe");
  });
  it("validates slugs", () => {
    expect(isValidSlug("selam-buna")).toBe(true);
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("-abc")).toBe(false);
    expect(isValidSlug("abc-")).toBe(false);
    expect(isValidSlug("a--b")).toBe(false);
    expect(isValidSlug("Abc")).toBe(false);
    expect(isValidSlug("a".repeat(40))).toBe(true);
    expect(isValidSlug("a".repeat(41))).toBe(false);
  });
});

describe("prices", () => {
  it("rounds to the nearest 5 birr", () => {
    expect(roundTo5(92)).toBe(90);
    expect(roundTo5(93)).toBe(95);
    expect(roundTo5(1)).toBe(5);
  });
  it("applies percentages", () => {
    expect(applyPercent(90, 10)).toBe(100);
    expect(applyPercent(150, 10)).toBe(165);
    expect(applyPercent(240, -10)).toBe(215);
  });
});

describe("sold out", () => {
  it("resets at 6:00 AM Addis time (03:00 UTC)", () => {
    expect(nextMorningReset(new Date("2026-10-30T10:00:00Z")).toISOString()).toBe("2026-10-31T03:00:00.000Z");
    expect(nextMorningReset(new Date("2026-10-30T01:00:00Z")).toISOString()).toBe("2026-10-30T03:00:00.000Z");
    expect(nextMorningReset(new Date("2026-10-30T03:00:00Z")).toISOString()).toBe("2026-10-31T03:00:00.000Z");
  });
  it("is sold out only before the reset", () => {
    const now = new Date("2026-10-30T10:00:00Z");
    expect(isSoldOut(null, now)).toBe(false);
    expect(isSoldOut(new Date("2026-10-31T03:00:00Z"), now)).toBe(true);
    expect(isSoldOut(new Date("2026-10-30T03:00:00Z"), now)).toBe(false);
  });
  it("buckets days in Addis time", () => {
    expect(addisDayKey(new Date("2026-10-30T22:30:00Z"))).toBe("2026-10-31");
  });
});
