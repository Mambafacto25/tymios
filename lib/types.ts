// Types des données métier (miroir du schéma supabase/migrations).

export type PieceStatut = "a_faire" | "en_cours" | "bloquee" | "terminee";

/** Référentiel secteur (pôle). */
export type Pole = { id: number; libelle: string; couleur: string | null };

/** Atelier (utilisé pour relier une pièce à un secteur). */
export type Atelier = { id: number; pole_id: number };

export const STATUTS: PieceStatut[] = [
  "a_faire",
  "en_cours",
  "bloquee",
  "terminee",
];

/** Ligne de pièce telle que lue par le tableau de bord (avec jointures). */
export type PieceRow = {
  id: number;
  numero_serie: string | null;
  numero_of: string | null;
  designation_article: string | null;
  titre_operation: string;
  priorite: number;
  echeance: string | null;
  statut_courant: PieceStatut;
  proprietaire_courant_id: string | null;
  relais_vers_id: string | null;
  atelier: { nom: string; pole: { libelle: string; couleur: string | null } | null } | null;
  proprietaire: { prenom: string; nom: string } | null;
  destinataire: { prenom: string; nom: string } | null;
  temps: { duree_sec: number; user_id: string }[];
};

/** Personne (établi) pour le choix d'un destinataire de relais. */
export type Personne = { id: string; prenom: string; nom: string };

/** Ordre de fabrication importé (référentiel, alimenté par CSV). */
export type Of = {
  id: number;
  numero_of: string;
  designation_article: string | null;
  numero_serie: string | null;
  echeance: string | null;
};

export const STATUT_LABEL: Record<PieceStatut, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  bloquee: "Bloquée",
  terminee: "Terminée",
};

/** Classes Tailwind par statut (pastille colorée). */
export const STATUT_CLASSES: Record<PieceStatut, string> = {
  a_faire: "bg-white/10 text-white/70",
  en_cours: "bg-blue-500/20 text-blue-300",
  bloquee: "bg-red-500/20 text-red-300",
  terminee: "bg-emerald-500/20 text-emerald-300",
};
