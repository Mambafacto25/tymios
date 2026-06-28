"use client";

import { useState } from "react";
import {
  relancerAction,
  relancerTousAction,
  setRelanceAutoAction,
} from "@/app/actions/pieces";
import {
  STATUTS,
  STATUT_LABEL,
  STATUT_HEX,
  type PieceRow,
  type Pole,
  type Personne,
} from "@/lib/types";

const DAY = 86_400_000;
const AV_PALETTE = [
  "#8b5cf6",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function colorFor(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AV_PALETTE[h % AV_PALETTE.length];
}
function initials(prenom: string, nom: string): string {
  return ((prenom[0] ?? "") + (nom[0] ?? "")).toUpperCase();
}
function Avatar({ u }: { u: Personne }) {
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: colorFor(u.id) }}
    >
      {initials(u.prenom, u.nom)}
    </span>
  );
}

const EUR = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
function fmtEur(n: number): string {
  return EUR.format(Math.round(n));
}
function fmtHeures(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
}

type Bucket = { label: string; sub: string; from: number; to: number };

function buildBuckets(horizon: number, today: number): Bucket[] {
  const fmt = (t: number, opts: Intl.DateTimeFormatOptions) =>
    new Date(t).toLocaleDateString("fr-FR", opts);
  if (horizon === 7) {
    return Array.from({ length: 7 }, (_, i) => {
      const f = today + i * DAY;
      return {
        label: i === 0 ? "Auj." : fmt(f, { weekday: "short" }),
        sub: fmt(f, { day: "2-digit", month: "2-digit" }),
        from: f,
        to: f + DAY - 1,
      };
    });
  }
  if (horizon === 15) {
    // 5 tranches de 3 jours
    return Array.from({ length: 5 }, (_, i) => {
      const f = today + i * 3 * DAY;
      const t = f + 3 * DAY - 1;
      return {
        label: i === 0 ? "Auj.→J+2" : `J+${i * 3}`,
        sub: `${fmt(f, { day: "2-digit", month: "2-digit" })}`,
        from: f,
        to: t,
      };
    });
  }
  // 30 jours : 4 semaines
  return Array.from({ length: 4 }, (_, i) => {
    const f = today + i * 7 * DAY;
    const t = f + 7 * DAY - 1;
    return {
      label: `Sem. ${i + 1}`,
      sub: `${fmt(f, { day: "2-digit", month: "2-digit" })}`,
      from: f,
      to: t,
    };
  });
}

function Carte({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
      style={accent ? { borderColor: `${accent}55` } : undefined}
    >
      {children}
    </section>
  );
}

export function Pilotage({
  pieces: allPieces,
  poles,
  users,
  relanceAuto,
  secteur,
}: {
  pieces: PieceRow[];
  poles: Pole[];
  users: Personne[];
  relanceAuto: boolean;
  secteur: string;
}) {
  // Limité au secteur sélectionné (Paramètres), sinon tous.
  const pieces = secteur
    ? allPieces.filter((p) => p.atelier?.pole?.libelle === secteur)
    : allPieces;
  const today = startOfToday();
  const actif = (p: PieceRow) => p.statut_courant !== "terminee";
  const ech = (p: PieceRow) => (p.echeance ? new Date(p.echeance).getTime() : 0);

  const [horizon, setHorizon] = useState(7);
  const [selUser, setSelUser] = useState<string | null>(null);
  const buckets = buildBuckets(horizon, today);

  // Personnes ayant de la charge (active) ou des retards
  const gens = users.filter((u) =>
    pieces.some((p) => actif(p) && p.proprietaire_courant_id === u.id),
  );

  const retardOf = (uid: string) =>
    pieces.filter(
      (p) => actif(p) && p.proprietaire_courant_id === uid && p.echeance && ech(p) < today,
    ).length;
  const cellOf = (uid: string, b: Bucket) =>
    pieces.filter(
      (p) =>
        actif(p) &&
        p.proprietaire_courant_id === uid &&
        p.echeance &&
        ech(p) >= b.from &&
        ech(p) <= b.to,
    ).length;

  let maxCell = 1;
  for (const u of gens)
    for (const b of buckets) maxCell = Math.max(maxCell, cellOf(u.id, b));

  // Retards (liste)
  const retards = pieces
    .filter((p) => actif(p) && p.echeance && ech(p) < today)
    .sort((a, b) => ech(a) - ech(b));
  const bloquees = pieces.filter((p) => p.statut_courant === "bloquee");
  const parStatut = STATUTS.map((s) => ({
    s,
    n: pieces.filter((p) => p.statut_courant === s).length,
  }));

  // ---- Coûts ----
  const tempsSec = (p: PieceRow) =>
    (p.temps ?? []).reduce((s, t) => s + (t.duree_sec ?? 0), 0);
  const tauxOf = (p: PieceRow) => p.atelier?.pole?.taux_horaire ?? 0;
  const coutOf = (p: PieceRow) => (tempsSec(p) / 3600) * tauxOf(p);

  const tempsTotalSec = pieces.reduce((s, p) => s + tempsSec(p), 0);
  const coutTotal = pieces.reduce((s, p) => s + coutOf(p), 0);
  const avecTaux = pieces.some((p) => tauxOf(p) > 0);

  // Coût par secteur (utile surtout en vue « tous les secteurs »).
  const parSecteur = poles
    .map((pole) => {
      const ps = pieces.filter((p) => p.atelier?.pole?.libelle === pole.libelle);
      return {
        libelle: pole.libelle,
        couleur: pole.couleur,
        cout: ps.reduce((s, p) => s + coutOf(p), 0),
        sec: ps.reduce((s, p) => s + tempsSec(p), 0),
        n: ps.length,
      };
    })
    .filter((x) => x.n > 0)
    .sort((a, b) => b.cout - a.cout);

  // ---- Respect des échéances (sur les pièces terminées datées) ----
  const dayKey = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const livrees = pieces.filter(
    (p) => p.statut_courant === "terminee" && p.terminee_at && p.echeance,
  );
  const aLheure = livrees.filter(
    (p) => dayKey(new Date(p.terminee_at!).getTime()) <= dayKey(ech(p)),
  ).length;
  const tauxRespect = livrees.length
    ? Math.round((aLheure / livrees.length) * 100)
    : null;
  const ecartMoyenJours = livrees.length
    ? livrees.reduce(
        (s, p) =>
          s + (dayKey(new Date(p.terminee_at!).getTime()) - dayKey(ech(p))) / DAY,
        0,
      ) / livrees.length
    : null;

  const [auto, setAuto] = useState(relanceAuto);
  const [relances, setRelances] = useState<Record<number, string>>({});
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  async function toggleAuto() {
    const next = !auto;
    setAuto(next);
    await setRelanceAutoAction(next);
  }
  async function relancer(id: number) {
    setRelances((r) => ({ ...r, [id]: "…" }));
    const { error } = await relancerAction(id);
    setRelances((r) => ({ ...r, [id]: error ? "Échec" : "Relancé ✓" }));
  }
  async function relancerTous() {
    setBulkMsg("Envoi…");
    const { error, count } = await relancerTousAction();
    setBulkMsg(error ? `Erreur : ${error}` : `${count} relance(s) envoyée(s)`);
  }

  function exportCsv() {
    const sep = ";";
    const esc = (v: string | number) => {
      const s = String(v);
      return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const num = (n: number) => n.toFixed(2).replace(".", ","); // Excel FR
    const dateFr = (iso: string | null) =>
      iso ? new Date(iso).toLocaleDateString("fr-FR") : "";
    const cols = [
      "Pièce",
      "OF",
      "N° série",
      "Secteur",
      "Statut",
      "Échéance",
      "Terminée le",
      "Temps (h)",
      "Taux (€/h)",
      "Coût (€)",
      "Retard (j)",
    ];
    const rows = [...pieces]
      .sort((a, b) => coutOf(b) - coutOf(a))
      .map((p) => {
        const retard =
          p.echeance && actif(p) && ech(p) < today
            ? Math.floor((today - ech(p)) / DAY)
            : p.terminee_at && p.echeance
              ? Math.round((dayKey(new Date(p.terminee_at).getTime()) - dayKey(ech(p))) / DAY)
              : 0;
        return [
          p.titre_operation,
          p.numero_of ?? "",
          p.numero_serie ?? "",
          p.atelier?.pole?.libelle ?? "",
          STATUT_LABEL[p.statut_courant],
          dateFr(p.echeance),
          dateFr(p.terminee_at),
          num(tempsSec(p) / 3600),
          num(tauxOf(p)),
          num(coutOf(p)),
          retard,
        ];
      });
    const totalRow = [
      "TOTAL",
      "",
      "",
      secteur || "Tous secteurs",
      "",
      "",
      "",
      num(tempsTotalSec / 3600),
      "",
      num(coutTotal),
      "",
    ];
    const csv = [cols, ...rows, totalRow]
      .map((r) => r.map(esc).join(sep))
      .join("\r\n");
    // BOM pour les accents sous Excel.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `tymios-couts-${secteur || "tous"}-${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/50">
          Périmètre :{" "}
          <span className="font-medium text-white/80">
            {secteur || "Tous les secteurs"}
          </span>
          {secteur ? " (modifiable dans Paramètres → Apparence)" : ""}
        </div>
        <button
          onClick={exportCsv}
          className="hover-gold rounded-lg border border-white/15 px-3 py-1.5 text-sm font-medium"
        >
          ⬇︎ Export Excel (CSV)
        </button>
      </div>

      {/* COÛTS & ÉCHÉANCES */}
      <Carte accent="#CFB53B">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display flex items-center gap-2 text-base font-semibold tracking-tight">
            💰 Coût de revient & délais
          </h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-[#CFB53B]/30 bg-[#CFB53B]/[0.06] p-4">
            <div className="text-2xl font-bold text-[#F0D879]">
              {avecTaux ? fmtEur(coutTotal) : "—"}
            </div>
            <div className="text-sm text-white/55">Coût de revient total</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <div className="text-2xl font-bold">{fmtHeures(tempsTotalSec)}</div>
            <div className="text-sm text-white/55">Temps pointé total</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <div
              className="text-2xl font-bold"
              style={{
                color:
                  tauxRespect == null
                    ? "#9fb0c8"
                    : tauxRespect >= 80
                      ? "#34d399"
                      : tauxRespect >= 50
                        ? "#fbbf24"
                        : "#f87171",
              }}
            >
              {tauxRespect == null ? "—" : `${tauxRespect} %`}
            </div>
            <div className="text-sm text-white/55">
              Échéances respectées
              {livrees.length ? (
                <span className="text-white/35"> ({livrees.length} livrée·s)</span>
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <div
              className="text-2xl font-bold"
              style={{
                color:
                  ecartMoyenJours == null
                    ? "#9fb0c8"
                    : ecartMoyenJours <= 0
                      ? "#34d399"
                      : "#f87171",
              }}
            >
              {ecartMoyenJours == null
                ? "—"
                : ecartMoyenJours <= 0
                  ? `${Math.abs(Math.round(ecartMoyenJours))} j av.`
                  : `+${Math.round(ecartMoyenJours)} j`}
            </div>
            <div className="text-sm text-white/55">
              Écart moyen livraison
              <span className="text-white/35"> (réel vs prévu)</span>
            </div>
          </div>
        </div>

        {!avecTaux ? (
          <p className="mt-3 text-xs text-amber-300/80">
            Renseigne un taux horaire par secteur dans Paramètres → Secteurs pour
            calculer le coût de revient.
          </p>
        ) : parSecteur.length > 1 ? (
          <div className="mt-4 space-y-1.5">
            {parSecteur.map((s) => {
              const pct = coutTotal ? (s.cout / coutTotal) * 100 : 0;
              return (
                <div key={s.libelle} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 truncate text-white/70">
                    {s.libelle}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: s.couleur ?? "#CFB53B",
                      }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right font-medium tabular-nums">
                    {fmtEur(s.cout)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </Carte>

      {/* RETARDS & ALERTES */}
      <Carte accent="#f87171">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-display flex items-center gap-2 text-base font-semibold tracking-tight">
            ⏰ Retards & alertes
          </h3>
          <span className="text-sm font-medium text-red-300">
            {retards.length} en retard
          </span>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={toggleAuto}
            className="inline-flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
          >
            <span
              className={`relative inline-block h-5 w-9 rounded-full transition ${auto ? "bg-emerald-500" : "bg-white/15"}`}
            >
              <span
                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${auto ? "left-[1.15rem]" : "left-0.5"}`}
              />
            </span>
            Relance automatique quotidienne
          </button>

          {retards.length > 0 ? (
            <div className="flex items-center gap-3">
              {bulkMsg ? (
                <span className="text-sm text-white/60">{bulkMsg}</span>
              ) : null}
              <button
                onClick={relancerTous}
                style={{
                  background:
                    "linear-gradient(180deg, #F0D879 0%, #E6C84D 45%, #CFB53B 100%)",
                }}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-[#2a2200] shadow-md transition hover:brightness-105"
              >
                ✉️ Tout relancer
              </button>
            </div>
          ) : null}
        </div>

        {retards.length === 0 ? (
          <p className="text-sm text-white/50">Aucun retard. 👌</p>
        ) : (
          <div className="space-y-2">
            {retards.map((p) => {
              const u = users.find((x) => x.id === p.proprietaire_courant_id);
              const j = Math.floor((today - ech(p)) / DAY);
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.05] px-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {u ? <Avatar u={u} /> : null}
                    <div className="min-w-0">
                      <div className="truncate font-medium">
                        {p.titre_operation}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/45">
                        <span>{u ? `${u.prenom} ${u.nom}` : "—"}</span>
                        {p.numero_of ? <span>· {p.numero_of}</span> : null}
                        {p.atelier?.pole ? (
                          <span
                            className="rounded-full px-2 py-0.5"
                            style={{
                              backgroundColor: `${p.atelier.pole.couleur}22`,
                              color: p.atelier.pole.couleur ?? "#cdb06a",
                            }}
                          >
                            {p.atelier.pole.libelle}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-red-300">
                      +{j} j
                    </span>
                    <button
                      onClick={() => relancer(p.id)}
                      disabled={!!relances[p.id]}
                      className="rounded-lg border border-[#CFB53B]/50 px-3 py-1.5 text-xs font-medium text-[#F0D879] transition hover:bg-[#CFB53B]/10 disabled:opacity-60"
                    >
                      {relances[p.id] ?? "Relancer"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Carte>

      {/* CHARGE À VENIR — heatmap */}
      <Carte>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display flex items-center gap-2 text-base font-semibold tracking-tight">
            📅 Charge à venir
          </h3>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/45 sm:inline">
              pièces dues par établi
            </span>
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/15 p-1 text-sm">
              {[7, 15, 30].map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`rounded-md px-3 py-1 font-medium transition ${
                    horizon === h
                      ? "bg-[#CFB53B] text-black"
                      : "text-white/70 hover-gold"
                  }`}
                >
                  {h} j
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr className="text-center text-xs">
                <th className="w-36" />
                <th className="px-1 pb-1 font-semibold uppercase text-red-300">
                  Retard
                </th>
                {buckets.map((b, i) => (
                  <th key={i} className="px-1 pb-1 font-medium text-white/70">
                    <div className="uppercase">{b.label}</div>
                    <div className="text-[10px] text-white/40">{b.sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gens.map((u) => {
                const dim = selUser && selUser !== u.id;
                return (
                  <tr
                    key={u.id}
                    onClick={() =>
                      setSelUser((s) => (s === u.id ? null : u.id))
                    }
                    className={`cursor-pointer transition ${dim ? "opacity-40" : ""}`}
                  >
                    <td className="py-1">
                      <div className="flex items-center gap-2">
                        <Avatar u={u} />
                        <span className="text-sm">{u.prenom}</span>
                      </div>
                    </td>
                    {(() => {
                      const r = retardOf(u.id);
                      return (
                        <td>
                          <div
                            className="flex h-11 items-center justify-center rounded-lg text-sm font-semibold"
                            style={{
                              backgroundColor: r
                                ? `rgba(248,113,113,${0.2 + 0.5 * Math.min(1, r / 3)})`
                                : "rgba(255,255,255,0.03)",
                              color: r ? "#fff" : "transparent",
                            }}
                          >
                            {r || "·"}
                          </div>
                        </td>
                      );
                    })()}
                    {buckets.map((b, i) => {
                      const n = cellOf(u.id, b);
                      const a = n ? 0.14 + 0.62 * (n / maxCell) : 0;
                      return (
                        <td key={i}>
                          <div
                            className="flex h-11 items-center justify-center rounded-lg text-sm font-semibold"
                            style={{
                              backgroundColor: n
                                ? `rgba(205,176,106,${a})`
                                : "rgba(255,255,255,0.03)",
                              color: n ? "#fff" : "rgba(255,255,255,0.15)",
                            }}
                          >
                            {n || "·"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {gens.length === 0 ? (
                <tr>
                  <td colSpan={buckets.length + 2} className="py-6 text-center text-sm text-white/45">
                    Aucune charge planifiée.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-white/40">
          Clique sur un établi pour le mettre en avant. Plus la case est foncée,
          plus la charge est élevée.
        </p>
      </Carte>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Bloquées */}
        <Carte>
          <h3 className="font-display mb-3 text-base font-semibold tracking-tight">
            ⛔ Bloquées ({bloquees.length})
          </h3>
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

        {/* Répartition par statut */}
        <Carte>
          <h3 className="font-display mb-3 text-base font-semibold tracking-tight">
            📊 Répartition par statut
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {parStatut.map(({ s, n }) => (
              <div
                key={s}
                className="rounded-xl border border-white/10 bg-black/15 p-3"
              >
                <div
                  className="text-xl font-bold"
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
    </div>
  );
}
