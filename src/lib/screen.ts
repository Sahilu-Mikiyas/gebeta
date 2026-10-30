import type { CategoryDTO, ItemDTO } from "./types";

export type Slide = {
  key: string;
  category: Pick<CategoryDTO, "id" | "nameEn" | "nameAm">;
  items: ItemDTO[];
  page: number; // 1-based page within the category
  pages: number;
  feature: ItemDTO | null; // item whose photo fills the right side
};

// Split the menu into TV boards: one section per board, long sections spread over several boards.
// Pages are balanced (11 items -> 6 + 5, not 8 + 3) so no board looks half empty.
export function buildSlides(categories: CategoryDTO[], perSlide = 8): Slide[] {
  const slides: Slide[] = [];
  for (const c of categories) {
    if (c.items.length === 0) continue;
    const pages = Math.ceil(c.items.length / perSlide);
    const size = Math.ceil(c.items.length / pages);
    for (let p = 0; p < pages; p++) {
      const items = c.items.slice(p * size, (p + 1) * size);
      slides.push({
        key: `${c.id}-${p}`,
        category: { id: c.id, nameEn: c.nameEn, nameAm: c.nameAm },
        items,
        page: p + 1,
        pages,
        feature: items.find((i) => i.imageId && !i.soldOut) ?? null,
      });
    }
  }
  return slides;
}
