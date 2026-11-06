// Starter menus by cafe type. New cafes start from one and just change prices.
type Opt = { nameEn: string; nameAm: string; price: number };
type StarterItem = { en: string; am: string; descEn?: string; descAm?: string; price: number; fasting?: boolean; photo?: string; variants?: Opt[]; addons?: Opt[] };
type StarterSection = { en: string; am: string; fromMin?: number; toMin?: number; items: StarterItem[] };

const coffee: StarterSection = {
  en: "Coffee & tea",
  am: "ቡና እና ሻይ",
  items: [
    {
      en: "Macchiato", am: "ማኪያቶ", descEn: "Espresso with steamed milk", descAm: "ኤስፕሬሶ ከወተት ጋር", price: 90, photo: "macchiato",
      variants: [{ nameEn: "Single", nameAm: "ነጠላ", price: 90 }, { nameEn: "Double", nameAm: "ድርብ", price: 120 }],
      addons: [{ nameEn: "Extra shot", nameAm: "ተጨማሪ ሾት", price: 30 }, { nameEn: "Oat milk", nameAm: "የአጃ ወተት", price: 40 }],
    },
    { en: "Jebena buna", am: "የጀበና ቡና", descEn: "Ceremony coffee with popcorn", descAm: "ከፈንዲሻ ጋር", price: 70, fasting: true, photo: "jebena" },
    { en: "Spiced shai", am: "ሻይ በቅመም", descEn: "Black tea, cinnamon, clove", descAm: "ቀረፋ እና ቅርንፉድ", price: 50, fasting: true },
  ],
};
const juice: StarterSection = {
  en: "Juice",
  am: "ጭማቂ",
  items: [
    {
      en: "Spris", am: "ስፕሪስ", descEn: "Avocado, mango, papaya, strawberry", descAm: "አቮካዶ፣ ማንጎ፣ ፓፓያ", price: 150, fasting: true, photo: "spris",
      variants: [{ nameEn: "Regular", nameAm: "መደበኛ", price: 150 }, { nameEn: "Large", nameAm: "ትልቅ", price: 190 }],
    },
    { en: "Avocado juice", am: "የአቮካዶ ጭማቂ", price: 140, fasting: true },
    { en: "Mango juice", am: "የማንጎ ጭማቂ", price: 130, fasting: true },
  ],
};
const breakfast: StarterSection = {
  en: "Breakfast",
  am: "ቁርስ",
  fromMin: 6 * 60,
  toMin: 11 * 60,
  items: [
    { en: "Special ful", am: "ስፔሻል ፉል", descEn: "Fava beans, tomato, egg, bread", descAm: "ባቄላ፣ ቲማቲም፣ እንቁላል", price: 220, photo: "ful" },
    { en: "Chechebsa", am: "ጨጨብሳ", descEn: "Flatbread, spiced butter, honey", descAm: "ቂጣ በቅቤና በማር", price: 240, photo: "chechebsa" },
    { en: "Firfir", am: "ፍርፍር", descEn: "Injera tossed in berbere sauce", descAm: "እንጀራ በበርበሬ ወጥ", price: 200, fasting: true },
  ],
};
const lunch: StarterSection = {
  en: "Lunch",
  am: "ምሳ",
  fromMin: 11 * 60,
  toMin: 22 * 60,
  items: [
    { en: "Shiro tegabino", am: "ሽሮ ተጋቢኖ", descEn: "Chickpea stew in a clay pot", descAm: "በሸክላ የሚቀርብ ሽሮ", price: 260, fasting: true, photo: "shiro" },
    { en: "Beyaynetu", am: "በያይነቱ", descEn: "Fasting stews on injera", descAm: "የጾም በያይነቱ", price: 320, fasting: true, photo: "beyaynetu" },
    { en: "Shekla tibs", am: "ሸክላ ጥብስ", descEn: "Sizzling beef, rosemary, chili", descAm: "በሸክላ የሚቀርብ ጥብስ", price: 390, photo: "tibs" },
  ],
};
const grill: StarterSection = {
  en: "Burgers & grill",
  am: "በርገርና ጥብስ",
  items: [
    { en: "Cheeseburger", am: "ቺዝ በርገር", descEn: "Beef, cheese, lettuce, tomato, fries", descAm: "ሥጋ፣ አይብ፣ ሰላጣ፣ ቲማቲም ከድንች ጋር", price: 420, photo: "burger", addons: [{ nameEn: "Extra cheese", nameAm: "ተጨማሪ አይብ", price: 50 }, { nameEn: "Egg", nameAm: "እንቁላል", price: 30 }] },
    { en: "Shekla tibs", am: "ሸክላ ጥብስ", descEn: "Sizzling beef, rosemary, chili", descAm: "በሸክላ የሚቀርብ ጥብስ", price: 390, photo: "tibs" },
  ],
};
const drinks: StarterSection = {
  en: "Drinks",
  am: "መጠጦች",
  items: [
    { en: "Soft drink", am: "ለስላሳ", price: 60, fasting: true },
    { en: "Bottled water", am: "የታሸገ ውሃ", price: 40, fasting: true, variants: [{ nameEn: "0.5 L", nameAm: "0.5 ሊ", price: 40 }, { nameEn: "1 L", nameAm: "1 ሊ", price: 60 }] },
    { en: "Draft beer", am: "ድራፍት ቢራ", price: 110 },
    { en: "Tej", am: "ጠጅ", descEn: "Honey wine", descAm: "የማር ጠጅ", price: 150, variants: [{ nameEn: "Glass", nameAm: "ብርጭቆ", price: 150 }, { nameEn: "Bottle (berele)", nameAm: "በረሌ", price: 350 }] },
  ],
};

export type StarterId = "coffee" | "juice" | "restaurant" | "lounge";

export const STARTERS: Record<StarterId, { en: string; am: string; menu: StarterSection[] }> = {
  coffee: { en: "Coffee house", am: "ቡና ቤት", menu: [coffee, juice, breakfast, lunch] },
  juice: { en: "Juice & pastry bar", am: "ጭማቂና ኬክ ቤት", menu: [juice, { ...coffee, items: coffee.items.slice(0, 2) }, { en: "Pastries", am: "ኬኮች", items: [{ en: "Croissant", am: "ክሮሳን", price: 120 }, { en: "Chocolate cake", am: "የቸኮሌት ኬክ", price: 180 }] }] },
  restaurant: { en: "Restaurant", am: "ምግብ ቤት", menu: [breakfast, lunch, grill, drinks] },
  lounge: { en: "Lounge & bar", am: "ላውንጅና ባር", menu: [drinks, grill, coffee] },
};

// Kept for the seed script.
export const STARTER_MENU = STARTERS.coffee.menu;
