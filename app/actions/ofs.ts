"use server";

import { createClient } from "@/lib/supabase/server";

type OfInput = {
  numero_of: string;
  designation_article: string | null;
  numero_serie: string | null;
  echeance: string | null;
};

export async function importOfsAction(
  rows: OfInput[],
): Promise<{ error?: string; count?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const clean = rows
    .map((r) => ({
      numero_of: (r.numero_of ?? "").trim(),
      designation_article: r.designation_article?.trim() || null,
      numero_serie: r.numero_serie?.trim() || null,
      echeance: r.echeance?.trim() || null,
    }))
    .filter((r) => r.numero_of.length > 0);

  if (clean.length === 0) return { error: "Aucune ligne d’OF valide trouvée." };

  const { error } = await supabase.from("ofs").insert(clean);
  if (error) return { error: error.message };
  return { count: clean.length };
}
