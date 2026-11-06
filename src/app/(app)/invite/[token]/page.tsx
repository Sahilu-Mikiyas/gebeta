import { prisma } from "@/lib/db";
import { currentOwnerId } from "@/lib/auth";
import { getUiLang } from "@/lib/lang-server";
import { InviteForm } from "./InviteForm";

export const metadata = { title: "Join a cafe · Gebeta" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.invite.findUnique({ where: { token }, include: { cafe: { select: { nameEn: true } } } });
  const lang = await getUiLang();
  return (
    <main className="auth">
      <InviteForm token={token} lang={lang} cafe={invite && !invite.acceptedAt ? invite.cafe.nameEn : null} role={invite?.role ?? "staff"} signedIn={!!(await currentOwnerId())} />
    </main>
  );
}
