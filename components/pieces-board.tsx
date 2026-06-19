"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PIECE_SELECT } from "@/lib/queries";
import {
  STATUT_CLASSES,
  STATUT_LABEL,
  STATUTS,
  type Atelier,
  type PieceRow,
  type PieceStatut,
  type Pole,
} from "@/lib/types";

type Props = {
  initialPieces: PieceRow[];
  poles: Pole[];
  ateliers: Atelier[];
  userId: string;
};

function formatEcheance(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function PiecesBoard({ initialPieces, poles, ateliers, userId }: Props) {
  const supabase = createClient();
  const [pieces, setPieces] = useState<PieceRow[]>(initialPieces);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Champs du formulaire de création
  const [titre, setTitre] = useState("");
  const [poleId, setPoleId] = useState<number | "">("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [numeroOf, setNumeroOf] = useState("");
  const [designation, setDesignation] = useState("");
  const [echeance, setEcheance] = useState("");
  const [prioritaire, setPrioritaire] = useState(false);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("pieces")
      .select(PIECE_SELECT)
      .order("echeance", { ascending: true, nullsFirst: false });
    if (data) setPieces(data as unknown as PieceRow[]);
  }, [supabase]);

  // Temps réel : tout changement sur la table pieces rafraîchit la liste.
  useEffect(() => {
    const channel = supabase
      .channel("pieces-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pieces" },
        () => {
          refetch();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch]);

  async function changeStatut(piece: PieceRow, vers: PieceStatut) {
    if (vers === piece.statut_courant) return;
    setError(null);
    // 1) écriture de l'événement dans le journal (registre sacré)
    const { error: evtErr } = await supabase.from("events").insert({
      piece_id: piece.id,
      type: "changement_statut",
      auteur_id: userId,
      payload: { de: piece.statut_courant, vers },
    });
    if (evtErr) {
      setError(evtErr.message);
      return;
    }
    // 2) mise à jour du cache d'état
    await supabase
      .from("pieces")
      .update({ statut_courant: vers })
      .eq("id", piece.id);
    refetch();
  }

  async function createPiece(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!titre.trim() || poleId === "") {
      setError("Le titre de l’opération et le secteur sont obligatoires.");
      return;
    }
    const atelier = ateliers.find((a) => a.pole_id === poleId);
    if (!atelier) {
      setError("Aucun atelier rattaché à ce secteur.");
      return;
    }

    setBusy(true);
    // 1) création de la pièce
    const { data: created, error: insErr } = await supabase
      .from("pieces")
      .insert({
        titre_operation: titre.trim(),
        numero_serie: numeroSerie.trim() || null,
        numero_of: numeroOf.trim() || null,
        designation_article: designation.trim() || null,
        atelier_id: atelier.id,
        priorite: prioritaire ? 1 : 0,
        echeance: echeance || null,
        statut_courant: "a_faire",
        proprietaire_courant_id: userId,
      })
      .select("id")
      .single();

    if (insErr || !created) {
      setError(insErr?.message ?? "Création impossible.");
      setBusy(false);
      return;
    }

    // 2) événement de création dans le journal
    await supabase.from("events").insert({
      piece_id: created.id,
      type: "creation",
      auteur_id: userId,
      payload: {
        titre_operation: titre.trim(),
        numero_serie: numeroSerie.trim() || null,
        numero_of: numeroOf.trim() || null,
      },
    });

    // reset + refresh
    setTitre("");
    setPoleId("");
    setNumeroSerie("");
    setNumeroOf("");
    setDesignation("");
    setEcheance("");
    setPrioritaire(false);
    setShowForm(false);
    setBusy(false);
    refetch();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-medium">Pièces</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Temps réel
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50">
            {pieces.length} pièce{pieces.length > 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-400"
          >
            {showForm ? "Fermer" : "+ Nouvelle pièce"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <form
          onSubmit={createPiece}
          className="grid grid-cols-1 gap-4 rounded-xl border border-white/10 bg-white/5 p-5 sm:grid-cols-2"
        >
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-white/70">Titre de l’opération *</span>
            <input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              required
              placeholder="ex. Contrôle entrée"
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-white/70">Secteur *</span>
            <select
              value={poleId}
              onChange={(e) =>
                setPoleId(e.target.value ? Number(e.target.value) : "")
              }
              required
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
            >
              <option value="">— choisir —</option>
              {poles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.libelle}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-white/70">Échéance</span>
            <input
              type="date"
              value={echeance}
              onChange={(e) => setEcheance(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-white/70">N° de série</span>
            <input
              value={numeroSerie}
              onChange={(e) => setNumeroSerie(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-white/70">N° d’OF</span>
            <input
              value={numeroOf}
              onChange={(e) => setNumeroOf(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
            />
          </label>

          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-white/70">Désignation article</span>
            <input
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="ex. Boîtier acier 40 mm"
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
            />
          </label>

          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={prioritaire}
              onChange={(e) => setPrioritaire(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm text-white/70">Pièce prioritaire</span>
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              {busy ? "Création…" : "Créer la pièce"}
            </button>
          </div>
        </form>
      ) : null}

      {pieces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
          Aucune pièce. Clique sur « + Nouvelle pièce » pour en créer une.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-white/60">
              <tr>
                <th className="px-4 py-2 font-medium">Opération</th>
                <th className="px-4 py-2 font-medium">N° série / OF</th>
                <th className="px-4 py-2 font-medium">Secteur</th>
                <th className="px-4 py-2 font-medium">Propriétaire</th>
                <th className="px-4 py-2 font-medium">Échéance</th>
                <th className="px-4 py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {pieces.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-white/5 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.priorite > 0 ? (
                        <span title="Prioritaire" className="text-amber-400">
                          ●
                        </span>
                      ) : null}
                      <span className="font-medium">{p.titre_operation}</span>
                    </div>
                    {p.designation_article ? (
                      <div className="text-xs text-white/40">
                        {p.designation_article}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    <div>{p.numero_serie ?? "—"}</div>
                    <div className="text-xs text-white/40">
                      {p.numero_of ?? ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {p.atelier?.pole ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: p.atelier.pole.couleur ?? "#6b7280",
                          }}
                        />
                        {p.atelier.pole.libelle}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {p.proprietaire
                      ? `${p.proprietaire.prenom} ${p.proprietaire.nom}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {formatEcheance(p.echeance)}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.statut_courant}
                      onChange={(e) =>
                        changeStatut(p, e.target.value as PieceStatut)
                      }
                      className={`cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs outline-none ${STATUT_CLASSES[p.statut_courant]}`}
                    >
                      {STATUTS.map((s) => (
                        <option key={s} value={s} className="bg-neutral-900">
                          {STATUT_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
