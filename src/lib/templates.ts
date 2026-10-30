export const TEMPLATES = [
  { id: "wood", en: "Wood & Red", am: "እንጨትና ቀይ", swatch: ["#1a1210", "#d7261e", "#f5b700"] },
  { id: "mustard", en: "Mustard", am: "ሰናፍጭ ቢጫ", swatch: ["#f5b700", "#0b0a0a", "#d7261e"] },
  { id: "paper", en: "Paper & Orange", am: "ወረቀትና ብርቱካን", swatch: ["#fbf6ec", "#f26a1b", "#1a1a1a"] },
  { id: "green", en: "Fasting Green", am: "የጾም አረንጓዴ", swatch: ["#1f6b35", "#f5b700", "#ffffff"] },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]["id"];

export function isTemplate(t: string): t is TemplateId {
  return TEMPLATES.some((x) => x.id === t);
}
