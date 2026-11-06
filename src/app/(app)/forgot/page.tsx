import { getUiLang } from "@/lib/lang-server";
import { telegramEnabled } from "@/lib/telegram";
import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "Forgot password · Gebeta" };

export default async function ForgotPage() {
  return (
    <main className="auth">
      <ForgotForm lang={await getUiLang()} bot={telegramEnabled()} />
    </main>
  );
}
