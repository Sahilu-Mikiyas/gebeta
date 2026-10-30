export type ItemDTO = {
  id: string;
  categoryId: string;
  nameEn: string;
  nameAm: string;
  descEn: string;
  descAm: string;
  price: number;
  fasting: boolean;
  soldOut: boolean;
  imageId: string | null;
};

export type CategoryDTO = {
  id: string;
  nameEn: string;
  nameAm: string;
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
  screenSeconds: number;
  screenLang: string;
};

export type MenuDTO = { cafe: CafeDTO; categories: CategoryDTO[] };
