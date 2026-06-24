"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

export async function updateProfileAction(
  prenom: string,
  nom: string,
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  if (!prenom.trim() || !nom.trim()) {
    return { error: "Le nom et le prénom sont obligatoires." };
  }
  const { error } = await supabase
    .from("users")
    .update({ prenom: prenom.trim(), nom: nom.trim() })
    .eq("id", user.id);
  return error ? { error: error.message } : {};
}

/** Sauvegarde les préférences d'affichage sur le compte. */
export async function savePrefsAction(
  prefs: Record<string, unknown>,
): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  const { error } = await supabase
    .from("users")
    .update({ prefs })
    .eq("id", user.id);
  return error ? { error: error.message } : {};
}
