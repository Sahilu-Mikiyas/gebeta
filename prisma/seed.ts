// Creates a demo owner and cafe. Log in with 0911 00 00 00 / gebeta-demo.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { STARTER_MENU } from "../src/lib/starter";

const prisma = new PrismaClient();

async function main() {
  const phone = "+251911000000";
  await prisma.owner.deleteMany({ where: { phone } });
  const owner = await prisma.owner.create({
    data: { phone, name: "Demo Owner", passwordHash: await bcrypt.hash("gebeta-demo", 10) },
  });
  const cafe = await prisma.cafe.create({
    data: {
      ownerId: owner.id,
      slug: "selam-buna-house",
      nameEn: "Selam Buna House",
      nameAm: "ሰላም ቡና ቤት",
      area: "Bole, Addis Ababa",
      hoursEn: "7:00 AM – 10:00 PM",
      hoursAm: "ከጠዋቱ 1:00 – ምሽቱ 4:00",
    },
  });
  for (const [ci, c] of STARTER_MENU.entries()) {
    await prisma.category.create({
      data: {
        cafeId: cafe.id,
        nameEn: c.en,
        nameAm: c.am,
        position: ci,
        items: {
          create: c.items.map((it, ii) => ({
            cafeId: cafe.id,
            nameEn: it.en,
            nameAm: it.am,
            descEn: it.descEn ?? "",
            descAm: it.descAm ?? "",
            price: it.price,
            fasting: !!it.fasting,
            position: ii,
          })),
        },
      },
    });
  }
  console.log("Seeded: log in with 0911 00 00 00 / gebeta-demo, menu at /m/selam-buna-house");
}

main().finally(() => prisma.$disconnect());
