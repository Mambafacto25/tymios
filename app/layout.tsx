import type { Metadata } from "next";
import "./globals.css";
import { PreferencesProvider } from "@/components/preferences-provider";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tymios",
  description:
    "Suivi de pièces, relais entre établis et pointage du temps — atelier horloger",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Préférences d'affichage sauvegardées sur le compte (si connecté).
  let initialPrefs: Record<string, unknown> | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("users")
        .select("prefs")
        .eq("id", user.id)
        .single();
      initialPrefs = (data?.prefs as Record<string, unknown>) ?? null;
    }
  } catch {
    // ignore
  }

  return (
    <html lang="fr">
      <body>
        <PreferencesProvider initialPrefs={initialPrefs}>
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
