import type { PieceStatut } from "./types";
import { STATUT_LABEL } from "./types";

/** Libellés lisibles des types d'événements du journal. */
export const EVENT_TYPE_LABEL: Record<string, string> = {
  creation: "Création",
  envoi_relais: "Relais envoyé",
  acceptation: "Relais accepté",
  refus: "Relais refusé",
  annulation_envoi: "Envoi annulé",
  changement_statut: "Changement de statut",
  pointage: "Pointage (chrono)",
  pointage_manuel: "Pointage (manuel)",
  correction_temps: "Correction de temps",
  mise_sous_traitance: "Mise en sous-traitance",
  retour_sous_traitance: "Retour de sous-traitance",
};

export function formatDureeSec(sec: number): string {
  if (!sec) return "0 min";
  const neg = sec < 0;
  const a = Math.abs(sec);
  const h = Math.floor(a / 3600);
  const m = Math.round((a % 3600) / 60);
  const s = h > 0 ? `${h} h ${m.toString().padStart(2, "0")}` : `${m} min`;
  return neg ? `-${s}` : s;
}

type Payload = Record<string, unknown>;

/** Détail lisible d'un événement, en résolvant les identifiants d'utilisateurs. */
export function describeEvent(
  type: string,
  payload: Payload | null,
  resolveUser: (id: string) => string,
): string {
  const p = payload ?? {};
  switch (type) {
    case "changement_statut":
      return `${STATUT_LABEL[p.de as PieceStatut] ?? p.de} → ${
        STATUT_LABEL[p.vers as PieceStatut] ?? p.vers
      }`;
    case "envoi_relais":
      return p.vers ? `vers ${resolveUser(String(p.vers))}` : "";
    case "acceptation":
      return p.de ? `repris à ${resolveUser(String(p.de))}` : "";
    case "pointage":
    case "pointage_manuel":
      return formatDureeSec(Number(p.duree_sec ?? 0));
    case "correction_temps":
      return `${formatDureeSec(Number(p.de ?? 0))} → ${formatDureeSec(
        Number(p.vers ?? 0),
      )}${p.raison ? ` — ${p.raison}` : ""}`;
    default:
      return "";
  }
}
