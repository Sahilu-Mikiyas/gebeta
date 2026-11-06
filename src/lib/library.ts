// Built-in photos owners can use before they take their own. Files live in /public/library.
export const PHOTO_LIBRARY = [
  { key: "macchiato", en: "Macchiato", am: "ማኪያቶ" },
  { key: "jebena", en: "Jebena buna", am: "ጀበና ቡና" },
  { key: "spris", en: "Spris", am: "ስፕሪስ" },
  { key: "ful", en: "Ful", am: "ፉል" },
  { key: "chechebsa", en: "Chechebsa", am: "ጨጨብሳ" },
  { key: "shiro", en: "Shiro", am: "ሽሮ" },
  { key: "beyaynetu", en: "Beyaynetu", am: "በያይነቱ" },
  { key: "tibs", en: "Tibs", am: "ጥብስ" },
  { key: "burger", en: "Burger", am: "በርገር" },
  { key: "beans", en: "Coffee beans", am: "የቡና ፍሬ" },
] as const;

export const isLibraryKey = (k: string) => PHOTO_LIBRARY.some((p) => p.key === k);

export function photoSrc(imageId: string | null | undefined, library: string | null | undefined): string | null {
  if (imageId) return `/media/${imageId}`;
  if (library && isLibraryKey(library)) return `/library/${library}.webp`;
  return null;
}
