"use server";

import { createClient } from "@/lib/supabase/server";
import { sendEmail, renderEmail, esc, appUrl, detailLignes } from "@/lib/email";
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
  proprietaireId?: string | null;
}): Promise<Result> {
  const { supabase, user } = await authed();
  const ownerId = input.proprietaireId || user.id;
  const { proprietaireId: _ignore, ...champs } = input;
  const { data: created, error } = await supabase
    .from("pieces")
    .insert({
      ...champs,
      statut_courant: "a_faire",
      proprietaire_courant_id: ownerId,
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
      assigne_a: ownerId,
    },
  });

  // Email : au destinataire de la tâche.
  const cta = appUrl() ? { label: "Ouvrir Tymios", url: appUrl() } : undefined;
  const details = detailLignes({
    titre: input.titre_operation,
    designation: input.designation_article,
    numeroSerie: input.numero_serie,
    numeroOf: input.numero_of,
  });
  if (ownerId === user.id) {
    await sendEmail({
      to: user.email ?? "",
      subject: `Nouvelle tâche : ${input.titre_operation}`,
      html: renderEmail(
        "Nouvelle tâche créée",
        ["Une nouvelle tâche a été créée :", ...details],
        cta,
      ),
    });
  } else {
    const [destRes, moiRes] = await Promise.all([
      supabase.from("users").select("email, prenom").eq("id", ownerId).single(),
      supabase.from("users").select("prenom, nom").eq("id", user.id).single(),
    ]);
    const dest = destRes.data as { email: string; prenom: string } | null;
    const moi = moiRes.data as { prenom: string; nom: string } | null;
    if (dest?.email) {
      const par = moi ? `${moi.prenom} ${moi.nom}` : "Un collègue";
      await sendEmail({
        to: dest.email,
        subject: `Tâche assignée : ${input.titre_operation}`,
        html: renderEmail(
          "Une tâche t’a été assignée",
          [
            `Bonjour ${esc(dest.prenom)},`,
            `<strong>${esc(par)}</strong> t’a assigné une tâche :`,
            ...details,
          ],
          cta,
        ),
      });
    }
  }

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
  // Date de fin réelle : posée au passage en « terminee », effacée si on en sort.
  const { error: e2 } = await supabase
    .from("pieces")
    .update({
      statut_courant: vers,
      terminee_at: vers === "terminee" ? new Date().toISOString() : null,
    })
    .eq("id", pieceId);
  return e2 ? { error: e2.message } : {};
}

export async function pointerTempsAction(
  pieceId: number,
  dureeSec: number,
  manuel: boolean,
  debutIso?: string,
  finIso?: string,
): Promise<Result> {
  const { supabase, user } = await authed();
  if (!Number.isFinite(dureeSec) || dureeSec <= 0) {
    return { error: "Durée invalide." };
  }
  const { error: e1 } = await supabase.from("events").insert({
    piece_id: pieceId,
    type: manuel ? "pointage_manuel" : "pointage",
    auteur_id: user.id,
    payload: { duree_sec: dureeSec },
  });
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase.from("time_entries").insert({
    piece_id: pieceId,
    user_id: user.id,
    duree_sec: dureeSec,
    debut: debutIso ?? null,
    fin: finIso ?? null,
  });
  return e2 ? { error: e2.message } : {};
}

export async function corrigerTempsAction(
  pieceId: number,
  ancienTotalSec: number,
  nouveauTotalSec: number,
  raison: string,
): Promise<Result> {
  const { supabase, user } = await authed();
  if (!Number.isFinite(nouveauTotalSec) || nouveauTotalSec < 0) {
    return { error: "Total invalide." };
  }
  // On n'efface jamais : on ajoute une écriture corrective (delta) + un événement.
  const { error: e1 } = await supabase.from("events").insert({
    piece_id: pieceId,
    type: "correction_temps",
    auteur_id: user.id,
    payload: { de: ancienTotalSec, vers: nouveauTotalSec, raison },
  });
  if (e1) return { error: e1.message };
  const { error: e2 } = await supabase.from("time_entries").insert({
    piece_id: pieceId,
    user_id: user.id,
    duree_sec: nouveauTotalSec - ancienTotalSec,
  });
  return e2 ? { error: e2.message } : {};
}

export async function envoiRelaisAction(
  pieceId: number,
  versId: string,
): Promise<Result> {
  const { supabase, user } = await authed();

  // Règle « pas de relais sans temps » : le propriétaire courant doit avoir
  // pointé du temps sur la pièce avant de la passer.
  const { data: te } = await supabase
    .from("time_entries")
    .select("duree_sec")
    .eq("piece_id", pieceId)
    .eq("user_id", user.id);
  const total = (te ?? []).reduce((s, r) => s + (r.duree_sec ?? 0), 0);
  if (total <= 0) {
    return { error: "Pointe ton temps sur cette pièce avant de passer le relais." };
  }

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
  if (e2) return { error: e2.message };

  // Email au destinataire : une pièce lui a été transmise.
  const [destRes, pieceRes, moiRes] = await Promise.all([
    supabase.from("users").select("email, prenom").eq("id", versId).single(),
    supabase
      .from("pieces")
      .select("titre_operation, numero_of, numero_serie, designation_article")
      .eq("id", pieceId)
      .single(),
    supabase.from("users").select("prenom, nom").eq("id", user.id).single(),
  ]);
  const dest = destRes.data as { email: string; prenom: string } | null;
  const piece = pieceRes.data as {
    titre_operation: string;
    numero_of: string | null;
    numero_serie: string | null;
    designation_article: string | null;
  } | null;
  const moi = moiRes.data as { prenom: string; nom: string } | null;
  if (dest?.email) {
    const expediteur = moi ? `${moi.prenom} ${moi.nom}` : "Un collègue";
    await sendEmail({
      to: dest.email,
      subject: `Relais : « ${piece?.titre_operation ?? "une pièce"} » t'a été transmise`,
      html: renderEmail(
        "Une pièce t’a été transmise",
        [
          `Bonjour ${esc(dest.prenom)},`,
          `<strong>${esc(expediteur)}</strong> t’a passé le relais d’une pièce :`,
          ...detailLignes({
            titre: piece?.titre_operation,
            designation: piece?.designation_article,
            numeroSerie: piece?.numero_serie,
            numeroOf: piece?.numero_of,
          }),
          "Connecte-toi à Tymios pour la prendre (avec ton code PIN).",
        ],
        appUrl() ? { label: "Prendre la pièce", url: appUrl() } : undefined,
      ),
    });
  }
  return {};
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
): Promise<Result> {
  const { supabase } = await authed();
  const { error } = await supabase.rpc("accept_relais", {
    p_piece_id: pieceId,
    p_pin: pin,
  });
  return error ? { error: error.message } : {};
}

export async function refuserRelaisAction(pieceId: number): Promise<Result> {
  const { supabase } = await authed();
  const { error } = await supabase.rpc("refuse_relais", {
    p_piece_id: pieceId,
  });
  return error ? { error: error.message } : {};
}

/** Active/désactive la relance automatique quotidienne. */
export async function setRelanceAutoAction(on: boolean): Promise<Result> {
  const { supabase } = await authed();
  const { error } = await supabase
    .from("app_settings")
    .update({ relance_auto: on })
    .eq("id", 1);
  return error ? { error: error.message } : {};
}

/** Relance par email TOUS les propriétaires de pièces en retard. */
export async function relancerTousAction(): Promise<{
  error?: string;
  count?: number;
}> {
  const { supabase } = await authed();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("pieces")
    .select(
      `id, titre_operation, numero_of, numero_serie, designation_article, echeance,
       proprietaire:users!proprietaire_courant_id ( email, prenom )`,
    )
    .lt("echeance", today)
    .neq("statut_courant", "terminee");
  if (error) return { error: error.message };
  const cta = appUrl() ? { label: "Ouvrir Tymios", url: appUrl() } : undefined;
  let count = 0;
  for (const p of (data as unknown as RetardRow[]) ?? []) {
    if (!p.proprietaire?.email) continue;
    const ech = p.echeance
      ? new Date(p.echeance).toLocaleDateString("fr-FR")
      : "—";
    await sendEmail({
      to: p.proprietaire.email,
      subject: `⏰ Rappel : « ${p.titre_operation} » en retard`,
      html: renderEmail(
        "Pièce en retard",
        [
          `Bonjour ${esc(p.proprietaire.prenom)},`,
          `Cette pièce est <strong>en retard</strong> (échéance du ${esc(ech)}) :`,
          ...detailLignes({
            titre: p.titre_operation,
            designation: p.designation_article,
            numeroSerie: p.numero_serie,
            numeroOf: p.numero_of,
          }),
        ],
        cta,
      ),
    });
    count++;
  }
  return { count };
}

type RetardRow = {
  id: number;
  titre_operation: string;
  numero_of: string | null;
  numero_serie: string | null;
  designation_article: string | null;
  echeance: string | null;
  proprietaire: { email: string; prenom: string } | null;
};

/** Relance par email le propriétaire d'une pièce (retard). */
export async function relancerAction(pieceId: number): Promise<Result> {
  const { supabase } = await authed();
  const { data } = await supabase
    .from("pieces")
    .select(
      `titre_operation, numero_of, numero_serie, designation_article, echeance,
       proprietaire:users!proprietaire_courant_id ( email, prenom )`,
    )
    .eq("id", pieceId)
    .single();
  const p = data as {
    titre_operation: string;
    numero_of: string | null;
    numero_serie: string | null;
    designation_article: string | null;
    echeance: string | null;
    proprietaire: { email: string; prenom: string } | null;
  } | null;
  if (!p?.proprietaire?.email) {
    return { error: "Pas d'email pour le propriétaire de cette pièce." };
  }
  const ech = p.echeance
    ? new Date(p.echeance).toLocaleDateString("fr-FR")
    : "—";
  await sendEmail({
    to: p.proprietaire.email,
    subject: `⏰ Rappel : « ${p.titre_operation} » en retard`,
    html: renderEmail(
      "Pièce en retard",
      [
        `Bonjour ${esc(p.proprietaire.prenom)},`,
        `Cette pièce est <strong>en retard</strong> (échéance du ${esc(ech)}) :`,
        ...detailLignes({
          titre: p.titre_operation,
          designation: p.designation_article,
          numeroSerie: p.numero_serie,
          numeroOf: p.numero_of,
        }),
        "Merci de la traiter ou de la passer en relais.",
      ],
      appUrl() ? { label: "Ouvrir Tymios", url: appUrl() } : undefined,
    ),
  });
  return {};
}

export async function setMyPinAction(pin: string): Promise<Result> {
  const { supabase } = await authed();
  const { error } = await supabase.rpc("set_my_pin", { p_pin: pin });
  return error ? { error: error.message } : {};
}

/** Définit le taux horaire (€/h) d'un secteur (réservé au chef d'atelier). */
export async function setTauxHoraireAction(
  poleId: number,
  taux: number,
): Promise<Result> {
  const { supabase } = await authed();
  if (!Number.isFinite(taux) || taux < 0) return { error: "Taux invalide." };
  const { error } = await supabase.rpc("set_taux_horaire", {
    p_pole: poleId,
    p_taux: taux,
  });
  return error ? { error: error.message } : {};
}
