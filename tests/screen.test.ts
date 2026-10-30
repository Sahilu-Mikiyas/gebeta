import { describe, expect, it } from "vitest";
import { buildSlides } from "../src/lib/screen";
import type { CategoryDTO, ItemDTO } from "../src/lib/types";

const item = (id: string, extra: Partial<ItemDTO> = {}): ItemDTO => ({
  id, categoryId: "c", nameEn: id, nameAm: "", descEn: "", descAm: "", price: 10, fasting: false, soldOut: false, imageId: null, ...extra,
});
const cat = (id: string, n: number, extra: (i: number) => Partial<ItemDTO> = () => ({})): CategoryDTO => ({
  id, nameEn: id, nameAm: "", items: Array.from({ length: n }, (_, i) => item(`${id}${i}`, extra(i))),
});

describe("buildSlides", () => {
  it("makes one board per section and skips empty sections", () => {
    const s = buildSlides([cat("a", 3), cat("b", 0), cat("c", 8)]);
    expect(s.map((x) => [x.category.id, x.items.length])).toEqual([["a", 3], ["c", 8]]);
  });
  it("balances long sections across boards", () => {
    const s = buildSlides([cat("a", 11)]);
    expect(s.map((x) => x.items.length)).toEqual([6, 5]);
    expect(s.map((x) => `${x.page}/${x.pages}`)).toEqual(["1/2", "2/2"]);
  });
  it("features the first available item with a photo", () => {
    const s = buildSlides([cat("a", 4, (i) => ({ imageId: i > 0 ? `img${i}` : null, soldOut: i === 1 }))]);
    expect(s[0].feature?.id).toBe("a2");
  });
});
