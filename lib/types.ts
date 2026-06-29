// Types des données métier (miroir du schéma supabase/migrations).

export type PieceStatut = "a_faire" | "en_cours" | "bloquee" | "terminee";

/** Référentiel secteur (pôle). */
export type Pole = {
  id: number;
  libelle: string;
  couleur: string | null;
  taux_horaire?: number;
};

/** Atelier (utilisé pour relier une pièce à un secteur). */
export type Atelier = { id: number; pole_id: number };

export const STATUTS: PieceStatut[] = [
  "a_faire",
  "en_cours",
  "bloquee",
  "terminee",
];

/** Niveaux d'urgence (stockés dans pieces.priorite : 0 à 3). */
export type Urgence = { value: number; label: string; color: string };
export const URGENCES: Urgence[] = [
  { value: 0, label: "Basse", color: "#34D399" },
  { value: 1, label: "Moyenne", color: "#FBBF24" },
  { value: 2, label: "Haute", color: "#FB923C" },
  { value: 3, label: "Urgence", color: "#F87171" },
];
export const SEUIL_URGENCE = 3;
export function urgenceOf(priorite: number): Urgence {
  return URGENCES[Math.max(0, Math.min(URGENCES.length - 1, priorite))];
}

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
  terminee_at: string | null;
  created_at?: string | null;
  proprietaire_courant_id: string | null;
  relais_vers_id: string | null;
  atelier: {
    nom: string;
    pole: { libelle: string; couleur: string | null; taux_horaire?: number } | null;
  } | null;
  proprietaire: { prenom: string; nom: string } | null;
  destinataire: { prenom: string; nom: string } | null;
  temps: { duree_sec: number; user_id: string; created_at?: string | null }[];
};

/** Personne (établi) pour le choix d'un destinataire de relais. */
export type Personne = { id: string; prenom: string; nom: string };

/** Rôles disponibles dans l'atelier. */
export const ROLES = [
  "Décorateur",
  "Horloger",
  "Technicien",
  "Chef Atelier",
  "Contrôleur",
  "Logisticien",
  "Programmeur",
] as const;

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

/** Couleur (hex) par statut — pour le sous-cadran chronographe. */
export const STATUT_HEX: Record<PieceStatut, string> = {
  a_faire: "#9fb0c8",
  en_cours: "#60a5fa",
  bloquee: "#f87171",
  terminee: "#34d399",
};

/** Avancement (0..1) par statut, pour l'arc du sous-cadran. */
export const STATUT_PROGRESS: Record<PieceStatut, number> = {
  a_faire: 0.1,
  en_cours: 0.55,
  bloquee: 0.55,
  terminee: 1,
};
