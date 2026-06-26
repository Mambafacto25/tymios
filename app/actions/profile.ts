"use server";

import { createClient } from "@/lib/supabase/server";

type Result = { error?: string };

export async function updateProfileAction(input: {
  prenom: string;
  nom: string;
  role: string | null;
  poleId: number | null;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };
  if (!input.prenom.trim() || !input.nom.trim()) {
    return { error: "Le nom et le prénom sont obligatoires." };
  }
  const { error } = await supabase
    .from("users")
    .update({
      prenom: input.prenom.trim(),
      nom: input.nom.trim(),
      role: input.role,
      pole_id: input.poleId,
    })
    .eq("id", user.id);
  return error ? { error: error.message } : {};
}

/** Désactive / réactive un compte (réservé au chef d'atelier, via RPC). */
export async function setUserActifAction(
  userId: string,
  actif: boolean,
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_actif", {
    p_user: userId,
    p_actif: actif,
  });
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
