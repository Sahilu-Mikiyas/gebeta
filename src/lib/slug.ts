export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return s.length >= 3 ? s : s ? `${s}-cafe` : "cafe";
}

// 3–40 characters: lowercase letters, digits and single hyphens, not at either end.
export function isValidSlug(s: string): boolean {
  return /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){2,39}$/.test(s);
}
