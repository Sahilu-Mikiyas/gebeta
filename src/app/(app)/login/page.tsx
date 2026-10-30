import { redirect } from "next/navigation";
import { currentOwnerId } from "@/lib/auth";
import { getUiLang } from "@/lib/lang-server";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Log in · Gebeta" };

export default async function LoginPage() {
  if (await currentOwnerId()) redirect("/dashboard");
  return (
    <main className="auth">
      <AuthForm mode="login" lang={await getUiLang()} />
    </main>
  );
}
