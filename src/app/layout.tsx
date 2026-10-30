import type { Metadata, Viewport } from "next";
import { getUiLang } from "@/lib/lang-server";
import "./globals.css";
import "./menu.css";

export const metadata: Metadata = {
  title: "Gebeta · Digital menus for Ethiopian cafes",
  description: "Build a bilingual QR menu for your cafe in ten minutes.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getUiLang();
  return (
    <html lang={lang}>
      <body>{children}</body>
    </html>
  );
}
