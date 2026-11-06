import { requireCafe } from "@/lib/access";
import { displayPhone } from "@/lib/phone";
import { telegramEnabled } from "@/lib/telegram";
import { Account } from "./Account";

export const metadata = { title: "Account · Gebeta" };

export default async function AccountPage() {
  const { user } = await requireCafe();
  return <Account name={user.name} phone={displayPhone(user.phone)} linked={!!user.telegramChatId} botOn={telegramEnabled()} />;
}
