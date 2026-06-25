"use client";

import { useState } from "react";
import { relancerAction } from "@/app/actions/pieces";
import {
  STATUTS,
  STATUT_LABEL,
  STATUT_HEX,
  type PieceRow,
  type Pole,
  type Personne,
} from "@/lib/types";

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function joursDepuis(dateIso: string, ref: number): number {
  return Math.floor((ref - new Date(dateIso).getTime()) / 86_400_000);
}

function Carte({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      style={accent ? { borderColor: `${accent}55` } : undefined}
    >
      <h3 className="font-display mb-3 text-base font-semibold tracking-tight">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function Pilotage({
  pieces,
  poles,
  users,
}: {
  pieces: PieceRow[];
  poles: Pole[];
  users: Personne[];
}) {
  const today = startOfToday();
  const semaineFin = today + 7 * 86_400_000;
  const actif = (p: PieceRow) => p.statut_courant !== "terminee";

  const retards = pieces
    .filter((p) => actif(p) && p.echeance && new Date(p.echeance).getTime() < today)
    .sort((a, b) => (a.echeance! < b.echeance! ? -1 : 1));

  const semaine = pieces
    .filter(
      (p) =>
        actif(p) &&
        p.echeance &&
        new Date(p.echeance).getTime() >= today &&
        new Date(p.echeance).getTime() <= semaineFin,
    )
    .sort((a, b) => (a.echeance! < b.echeance! ? -1 : 1));

  const bloquees = pieces.filter((p) => p.statut_courant === "bloquee");

  const parSecteur = poles
    .map((pole) => ({
      pole,
      n: pieces.filter(
        (p) => actif(p) && p.atelier?.pole?.libelle === pole.libelle,
      ).length,
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  const parPersonne = users
    .map((u) => ({
      u,
      n: pieces.filter((p) => actif(p) && p.proprietaire_courant_id === u.id)
        .length,
    }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);

  const parStatut = STATUTS.map((s) => ({
    s,
    n: pieces.filter((p) => p.statut_courant === s).length,
  }));

  const maxSecteur = Math.max(1, ...parSecteur.map((x) => x.n));
  const maxPersonne = Math.max(1, ...parPersonne.map((x) => x.n));

  const [relances, setRelances] = useState<Record<number, string>>({});
  async function relancer(p: PieceRow) {
    setRelances((r) => ({ ...r, [p.id]: "…" }));
    const { error } = await relancerAction(p.id);
    setRelances((r) => ({ ...r, [p.id]: error ? "Échec" : "Relancé ✓" }));
  }

  return (
    <div className="space-y-5">
      {/* Retards */}
      <Carte title={`🔴 Retards (${retards.length})`} accent="#f87171">
        {retards.length === 0 ? (
          <p className="text-sm text-white/50">Aucun retard. 👌</p>
        ) : (
          <div className="space-y-2">
            {retards.map((p) => {
              const j = joursDepuis(p.echeance!, today);
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/20 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{p.titre_operation}</span>
                    <span className="text-white/45">
                      {" "}
                      · {p.atelier?.pole?.libelle ?? "—"} ·{" "}
                      {p.proprietaire
                        ? `${p.proprietaire.prenom} ${p.proprietaire.nom}`
                        : "—"}
                    </span>
                    <span className="ml-2 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-300">
                      {j} j de retard
                    </span>
                  </div>
                  <button
                    onClick={() => relancer(p)}
                    disabled={!!relances[p.id]}
                    className="hover-gold rounded-md border border-white/15 px-3 py-1 text-xs disabled:opacity-60"
                  >
                    {relances[p.id] ?? "Relancer par email"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Carte>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Charge à venir (7 jours) */}
        <Carte title={`📅 Charge à venir — 7 jours (${semaine.length})`}>
          {semaine.length === 0 ? (
            <p className="text-sm text-white/50">Rien de prévu cette semaine.</p>
          ) : (
            <div className="space-y-1.5">
              {semaine.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{p.titre_operation}</span>
                  <span className="shrink-0 text-white/45">
                    {new Date(p.echeance!).toLocaleDateString("fr-FR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Carte>

        {/* Pièces bloquées */}
        <Carte title={`⛔ Bloquées (${bloquees.length})`}>
          {bloquees.length === 0 ? (
            <p className="text-sm text-white/50">Aucune pièce bloquée.</p>
          ) : (
            <div className="space-y-1.5">
              {bloquees.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{p.titre_operation}</span>
                  <span className="shrink-0 text-white/45">
                    {p.proprietaire
                      ? `${p.proprietaire.prenom} ${p.proprietaire.nom}`
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Carte>

        {/* Charge par secteur */}
        <Carte title="🏭 Charge par secteur">
          <div className="space-y-2">
            {parSecteur.map(({ pole, n }) => (
              <div key={pole.id} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate">{pole.libelle}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(n / maxSecteur) * 100}%`,
                      backgroundColor: pole.couleur ?? "#cdb06a",
                    }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right tabular-nums text-white/70">
                  {n}
                </span>
              </div>
            ))}
          </div>
        </Carte>

        {/* Charge par personne */}
        <Carte title="👥 Charge par personne">
          <div className="space-y-2">
            {parPersonne.map(({ u, n }) => (
              <div key={u.id} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 truncate">
                  {u.prenom} {u.nom}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-indigo-400"
                    style={{ width: `${(n / maxPersonne) * 100}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right tabular-nums text-white/70">
                  {n}
                </span>
              </div>
            ))}
          </div>
        </Carte>
      </div>

      {/* Répartition par statut */}
      <Carte title="📊 Répartition par statut">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {parStatut.map(({ s, n }) => (
            <div
              key={s}
              className="rounded-xl border border-white/10 bg-black/15 p-4"
            >
              <div
                className="text-2xl font-bold"
                style={{ color: STATUT_HEX[s] }}
              >
                {n}
              </div>
              <div className="text-sm text-white/55">{STATUT_LABEL[s]}</div>
            </div>
          ))}
        </div>
      </Carte>
    </div>
  );
}
