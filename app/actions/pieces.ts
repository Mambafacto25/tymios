"use server";

import { createClient } from "@/lib/supabase/server";
import type { PieceStatut } from "@/lib/types";

type Result = { error?: string };

/** Récupère le client serveur + l'utilisateur connecté (identité certifiée). */
async function authed() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return { supabase, user };
}

export async function createPieceAction(input: {
  titre_operation: string;
  numero_serie: string | null;
  numero_of: string | null;
  designation_article: string | null;
  atelier_id: number;
  priorite: number;
  echeance: string | null;
}): Promise<Result> {
  const { supabase, user } = await authed();
  const { data: created, error } = await supabase
    .from("pieces")
    .insert({
      ...input,
      statut_courant: "a_faire",
      proprietaire_courant_id: user.id,
    })
    .select("id")
    .single();
  if (error || !created) return { error: error?.message ?? "Création impossible." };

  await supabase.from("events").insert({
    piece_id: created.id,
    type: "creation",
    auteur_id: user.id,
    payload: {
      titre_operation: input.titre_operation,
      numero_serie: input.numero_serie,
      numero_of: input.numero_of,
    },
  });
  return {};
}

export async function changeStatutAction(
  pieceId: number,
  de: PieceStatut,
  vers: PieceStatut,
): Promise<Result> {
  const { supabase, user } = await authed();
  const { error: e1 } = await supabase.from("events").insert({
    piece_id: pieceId,
    type: "changement_statut",
    auteur_id: user.id,
    payload: { de, vers },
  });
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase
    .from("pieces")
    .update({ statut_courant: vers })
    .eq("id", pieceId);
  return e2 ? { error: e2.message } : {};
}

export async function envoiRelaisAction(
  pieceId: number,
  versId: string,
): Promise<Result> {
  const { supabase, user } = await authed();
  const { error: e1 } = await supabase.from("events").insert({
    piece_id: pieceId,
    type: "envoi_relais",
    auteur_id: user.id,
    payload: { vers: versId },
  });
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase
    .from("pieces")
    .update({ relais_vers_id: versId })
    .eq("id", pieceId);
  return e2 ? { error: e2.message } : {};
}

export async function annulerEnvoiAction(pieceId: number): Promise<Result> {
  const { supabase, user } = await authed();
  const { error: e1 } = await supabase.from("events").insert({
    piece_id: pieceId,
    type: "annulation_envoi",
    auteur_id: user.id,
    payload: {},
  });
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase
    .from("pieces")
    .update({ relais_vers_id: null })
    .eq("id", pieceId);
  return e2 ? { error: e2.message } : {};
}

export async function prendreRelaisAction(
  pieceId: number,
  pin: string,
  de: string | null,
): Promise<Result> {
  const { supabase, user } = await authed();
  const { data: ok, error: vErr } = await supabase.rpc("verify_my_pin", {
    p_pin: pin,
  });
  if (vErr) return { error: vErr.message };
  if (!ok) return { error: "PIN incorrect." };

  const { error: e1 } = await supabase.from("events").insert({
    piece_id: pieceId,
    type: "acceptation",
    auteur_id: user.id,
    payload: { de },
  });
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase
    .from("pieces")
    .update({ proprietaire_courant_id: user.id, relais_vers_id: null })
    .eq("id", pieceId);
  return e2 ? { error: e2.message } : {};
}

export async function refuserRelaisAction(pieceId: number): Promise<Result> {
  const { supabase, user } = await authed();
  const { error: e1 } = await supabase.from("events").insert({
    piece_id: pieceId,
    type: "refus",
    auteur_id: user.id,
    payload: {},
  });
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase
    .from("pieces")
    .update({ relais_vers_id: null })
    .eq("id", pieceId);
  return e2 ? { error: e2.message } : {};
}

export async function setMyPinAction(pin: string): Promise<Result> {
  const { supabase } = await authed();
  const { error } = await supabase.rpc("set_my_pin", { p_pin: pin });
  return error ? { error: error.message } : {};
}
