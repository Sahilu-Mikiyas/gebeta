export type Option = { nameEn: string; nameAm: string; price: number };

export type ItemDTO = {
  id: string;
  categoryId: string;
  nameEn: string;
  nameAm: string;
  descEn: string;
  descAm: string;
  price: number; // base price, or the first size's price when there are sizes
  fasting: boolean;
  soldOut: boolean;
  imageId: string | null;
  libraryPhoto: string | null;
  photo: string | null; // resolved image URL
  tags: string[];
  variants: Option[];
  addons: Option[];
  hidden: boolean;
  special: { price: number; labelEn: string; labelAm: string } | null;
  popular: boolean;
};

export type CategoryDTO = {
  id: string;
  nameEn: string;
  nameAm: string;
  fromMin: number | null;
  toMin: number | null;
  showOnScreen: boolean;
  availableNow: boolean;
  items: ItemDTO[];
};

export type CafeDTO = {
  id: string;
  slug: string;
  nameEn: string;
  nameAm: string;
  area: string;
  hoursEn: string;
  hoursAm: string;
  template: string;
  logoId: string | null;
  coverId: string | null;
  brandColor: string | null;
  accentColor: string | null;
  phone: string;
  mapUrl: string;
  instagram: string;
  tiktok: string;
  telegram: string;
  facebook: string;
  wifiName: string;
  wifiPass: string;
  fastingMode: string;
  fastingNow: { en: string; am: string } | null; // set when today is a fasting day and the mode allows it
  tableCount: number;
  orderingOn: boolean;
  callsOn: boolean;
  plan: "free" | "cafe" | "group";
  screenSeconds: number;
  screenLang: string;
  screenPortrait: boolean;
  slides: string[]; // promo image ids for the TV
};

export type MenuDTO = { cafe: CafeDTO; categories: CategoryDTO[] };
