import type { Metadata } from "next";
import "./globals.css";
import { PreferencesProvider } from "@/components/preferences-provider";

export const metadata: Metadata = {
  title: "Tymios",
  description:
    "Suivi de pièces, relais entre établis et pointage du temps — atelier horloger",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <PreferencesProvider>{children}</PreferencesProvider>
      </body>
    </html>
  );
}
