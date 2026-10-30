import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { getUiLang } from "@/lib/lang-server";
import { t } from "@/lib/i18n";
import { menuUrl, qrSvg } from "@/lib/qr";
import { PrintButton } from "./PrintButton";
import "./print.css";

export const metadata = { title: "Table cards · Gebeta" };

export default async function PrintPage() {
  const owner = await requireOwner();
  const lang = await getUiLang();
  const cafe = await prisma.cafe.findFirst({ where: { ownerId: owner.id }, orderBy: { createdAt: "asc" } });
  if (!cafe) redirect("/dashboard");

  const h = await headers();
  const appUrl = process.env.APP_URL?.replace(/\/$/, "") || `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const svg = await qrSvg(menuUrl(appUrl, cafe.slug));
  const name = cafe.nameEn;
  const nameAm = cafe.nameAm;

  return (
    <main className="print-page">
      <div className="print-bar">
        <a className="btn sm" href="/dashboard">
          ← {t(lang, "backToDashboard")}
        </a>
        <span>{t(lang, "printHint")}</span>
        <PrintButton label={t(lang, "print")} />
      </div>
      <div className="sheet">
        {Array.from({ length: 4 }, (_, i) => (
          <div className="card" key={i}>
            <div className="card-tab">
              <b>{name}</b>
              {nameAm ? <span>{nameAm}</span> : null}
            </div>
            <div className="card-qr" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="card-scan">
              <b>{t("en", "scanForMenu")}</b>
              <span>{t("am", "scanForMenu")}</span>
            </div>
            <div className="card-url">{`${appUrl.replace(/^https?:\/\//, "")}/m/${cafe.slug}`}</div>
            <div className="card-foot">Menu by Gebeta · ምናሌው በገበታ</div>
          </div>
        ))}
      </div>
    </main>
  );
}
