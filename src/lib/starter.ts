// A typical Addis cafe menu. New cafes can start from this and just change prices.
export const STARTER_MENU: {
  en: string;
  am: string;
  items: { en: string; am: string; descEn?: string; descAm?: string; price: number; fasting?: boolean }[];
}[] = [
  {
    en: "Coffee & tea",
    am: "ቡና እና ሻይ",
    items: [
      { en: "Macchiato", am: "ማኪያቶ", descEn: "Double ristretto, steamed milk", descAm: "ድርብ ኤስፕሬሶ ከወተት ጋር", price: 90 },
      { en: "Jebena buna", am: "የጀበና ቡና", descEn: "Ceremony coffee with popcorn", descAm: "ከፈንዲሻ ጋር", price: 70, fasting: true },
      { en: "Spiced shai", am: "ሻይ በቅመም", descEn: "Black tea, cinnamon, clove", descAm: "ቀረፋ እና ቅርንፉድ", price: 50, fasting: true },
    ],
  },
  {
    en: "Juice",
    am: "ጭማቂ",
    items: [
      { en: "Spris", am: "ስፕሪስ", descEn: "Avocado, mango, papaya, strawberry", descAm: "አቮካዶ፣ ማንጎ፣ ፓፓያ", price: 150, fasting: true },
      { en: "Avocado juice", am: "የአቮካዶ ጭማቂ", price: 140, fasting: true },
    ],
  },
  {
    en: "Breakfast",
    am: "ቁርስ",
    items: [
      { en: "Special ful", am: "ስፔሻል ፉል", descEn: "Fava beans, tomato, egg, bread", descAm: "ባቄላ፣ ቲማቲም፣ እንቁላል", price: 220 },
      { en: "Chechebsa", am: "ጨጨብሳ", descEn: "Flatbread, spiced butter, honey", descAm: "ቂጣ በቅቤና በማር", price: 240 },
      { en: "Firfir", am: "ፍርፍር", descEn: "Injera tossed in berbere sauce", descAm: "እንጀራ በበርበሬ ወጥ", price: 200, fasting: true },
    ],
  },
  {
    en: "Lunch",
    am: "ምሳ",
    items: [
      { en: "Shiro tegabino", am: "ሽሮ ተጋቢኖ", descEn: "Chickpea stew in a clay pot", descAm: "በሸክላ የሚቀርብ ሽሮ", price: 260, fasting: true },
      { en: "Beyaynetu", am: "በያይነቱ", descEn: "Fasting stews on injera", descAm: "የጾም በያይነቱ", price: 320, fasting: true },
      { en: "Shekla tibs", am: "ሸክላ ጥብስ", descEn: "Sizzling beef, rosemary, chili", descAm: "በሸክላ የሚቀርብ ጥብስ", price: 390 },
    ],
  },
];
