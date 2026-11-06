import { requireOwner } from "@/lib/auth";
import { getUiLang } from "@/lib/lang-server";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Set up your cafe · Gebeta" };

export default async function WelcomePage() {
  const owner = await requireOwner();
  return <Onboarding lang={await getUiLang()} ownerName={owner.name} />;
}
