import { redirect } from "next/navigation";
import { currentOwnerId } from "@/lib/auth";
import { getUiLang } from "@/lib/lang-server";
import { AuthForm } from "../AuthForm";

export const metadata = { title: "Create account · Gebeta" };

export default async function SignupPage() {
  if (await currentOwnerId()) redirect("/dashboard");
  return (
    <main className="auth">
      <AuthForm mode="signup" lang={await getUiLang()} />
    </main>
  );
}
