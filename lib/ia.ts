// Copilote Tymios — intelligence de pilotage à partir du registre (sans API).
// Estimations de temps (médianes historiques), prévision des retards (scoring),
// détection des pièces qui stagnent.

import type { PieceRow } from "./types";

const DAY = 86_400_000;
/** Capacité productive supposée par jour ouvré (heures) pour la projection. */
export const HEURES_JOUR = 6;
/** Sans activité depuis ce nombre de jours → considérée comme stagnante. */
export const SEUIL_STAGNATION = 4;

export function totalSec(p: PieceRow): number {
  return (p.temps ?? []).reduce((s, t) => s + (t.duree_sec ?? 0), 0);
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function ts(v: string | null | undefined): number {
  return v ? new Date(v).getTime() : 0;
}

/** Dernière activité connue d'une pièce (création, dernier pointage, fin). */
export function lastActivity(p: PieceRow): number {
  let t = ts(p.created_at);
  for (const e of p.temps ?? []) t = Math.max(t, ts(e.created_at));
  t = Math.max(t, ts(p.terminee_at));
  return t;
}

function fmtH(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return `${h} h${m ? ` ${String(m).padStart(2, "0")}` : ""}`;
  return `${Math.max(1, m)} min`;
}

export type EstimSource = "operation" | "secteur" | "global";
export type Estimation = { sec: number; source: EstimSource; n: number } | null;

export type Risque = {
  piece: PieceRow;
  niveau: "critique" | "eleve" | "modere";
  score: number;
  raisons: string[];
  pointeSec: number;
  resteSec: number;
  finPrevue: number | null;
  estim: Estimation;
};

export type Stagnante = { piece: PieceRow; jours: number };

export type EstimationLigne = {
  op: string;
  label: string;
  median: number;
  n: number;
  actifs: number;
  depassements: number;
};

export type Analyse = {
  couverture: number; // nb de pièces terminées exploitables
  risques: Risque[];
  stagnantes: Stagnante[];
  estimations: EstimationLigne[];
};

export function analysePilotage(pieces: PieceRow[], now: number): Analyse {
  const startToday = (() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();

  // --- Apprentissage : médianes par opération / secteur / global ---
  const done = pieces.filter(
    (p) => p.statut_courant === "terminee" && totalSec(p) > 0,
  );
  const byOp = new Map<string, number[]>();
  const opLabel = new Map<string, string>();
  const bySec = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of done) {
    const t = totalSec(p);
    all.push(t);
    const op = p.titre_operation.trim().toLowerCase();
    if (!byOp.has(op)) {
      byOp.set(op, []);
      opLabel.set(op, p.titre_operation.trim());
    }
    byOp.get(op)!.push(t);
    const sec = p.atelier?.pole?.libelle;
    if (sec) {
      if (!bySec.has(sec)) bySec.set(sec, []);
      bySec.get(sec)!.push(t);
    }
  }

  function estimate(p: PieceRow): Estimation {
    const op = p.titre_operation.trim().toLowerCase();
    const o = byOp.get(op);
    if (o && o.length >= 2) return { sec: median(o), source: "operation", n: o.length };
    const sec = p.atelier?.pole?.libelle;
    const s = sec ? bySec.get(sec) : undefined;
    if (s && s.length >= 3) return { sec: median(s), source: "secteur", n: s.length };
    if (all.length >= 3) return { sec: median(all), source: "global", n: all.length };
    return null;
  }

  const actives = pieces.filter((p) => p.statut_courant !== "terminee");
  const risques: Risque[] = [];
  const stagnantes: Stagnante[] = [];

  for (const p of actives) {
    const pointe = totalSec(p);
    const estim = estimate(p);
    const resteSec = estim ? Math.max(0, estim.sec - pointe) : 0;
    const neededDays = estim ? resteSec / (HEURES_JOUR * 3600) : 0;
    const finPrevue = estim ? now + neededDays * DAY : null;

    const raisons: string[] = [];
    let score = 0;

    const ech = p.echeance ? ts(p.echeance) : null;
    const daysLeft = ech != null ? (ech - startToday) / DAY : null;

    if (ech != null && daysLeft! < 0) {
      score += 60;
      raisons.push(`En retard de ${Math.abs(Math.round(daysLeft!))} j`);
    } else if (ech != null && estim && neededDays > daysLeft! + 0.5) {
      score += 45;
      raisons.push(
        `Charge restante ${fmtH(resteSec)} > ${Math.max(0, Math.round(daysLeft!))} j avant échéance`,
      );
    } else if (ech != null && daysLeft! <= 2 && resteSec > 0) {
      score += 24;
      raisons.push(`Échéance dans ${Math.max(0, Math.round(daysLeft!))} j`);
    }

    if (p.statut_courant === "bloquee") {
      score += 26;
      raisons.push("Pièce bloquée");
    }

    const stagnDays = (now - lastActivity(p)) / DAY;
    if (stagnDays >= SEUIL_STAGNATION + 1) {
      score += 20;
      raisons.push(`Sans activité depuis ${Math.round(stagnDays)} j`);
    }

    if (p.priorite >= 3) {
      score += 14;
      raisons.push("Marquée urgente");
    }

    if (estim && pointe > estim.sec * 1.15) {
      score += 12;
      raisons.push(`Dépasse l'estimation (${fmtH(pointe)} / ${fmtH(estim.sec)})`);
    }

    if (score > 0 && raisons.length) {
      const niveau = score >= 58 ? "critique" : score >= 34 ? "eleve" : "modere";
      risques.push({ piece: p, niveau, score, raisons, pointeSec: pointe, resteSec, finPrevue, estim });
    }

    if (stagnDays >= SEUIL_STAGNATION) {
      stagnantes.push({ piece: p, jours: Math.round(stagnDays) });
    }
  }

  risques.sort((a, b) => b.score - a.score);
  stagnantes.sort((a, b) => b.jours - a.jours);

  // --- Tableau d'estimations par opération (≥ 2 historiques) ---
  const estimations: EstimationLigne[] = [];
  for (const [op, xs] of byOp.entries()) {
    if (xs.length < 2) continue;
    const med = median(xs);
    const actifs = actives.filter(
      (p) => p.titre_operation.trim().toLowerCase() === op,
    );
    const depassements = actifs.filter((p) => totalSec(p) > med * 1.15).length;
    estimations.push({
      op,
      label: opLabel.get(op) ?? op,
      median: med,
      n: xs.length,
      actifs: actifs.length,
      depassements,
    });
  }
  estimations.sort((a, b) => b.n - a.n || b.actifs - a.actifs);

  return { couverture: done.length, risques, stagnantes, estimations };
}
