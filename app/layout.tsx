import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relais",
  description:
    "Suivi de pièces, relais entre établis et pointage du temps — atelier horloger",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
