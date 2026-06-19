"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PIECE_SELECT } from "@/lib/queries";
import {
  STATUT_CLASSES,
  STATUT_LABEL,
  STATUTS,
  type Atelier,
  type Personne,
  type PieceRow,
  type PieceStatut,
  type Pole,
} from "@/lib/types";

type Props = {
  initialPieces: PieceRow[];
  poles: Pole[];
  ateliers: Atelier[];
  users: Personne[];
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

function nom(p: { prenom: string; nom: string } | null): string {
  return p ? `${p.prenom} ${p.nom}` : "—";
}

export function PiecesBoard({
  initialPieces,
  poles,
  ateliers,
  users,
  userId,
}: Props) {
  const supabase = createClient();
  const [pieces, setPieces] = useState<PieceRow[]>(initialPieces);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Relais en cours de saisie (quelle pièce, vers qui)
  const [relaisOpenFor, setRelaisOpenFor] = useState<number | null>(null);
  const [relaisTarget, setRelaisTarget] = useState<string>("");

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

  // Temps réel : tout changement sur pieces rafraîchit la liste (multi-écrans).
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

  async function logEvent(
    pieceId: number,
    type: string,
    payload: Record<string, unknown>,
  ) {
    const { error: e } = await supabase.from("events").insert({
      piece_id: pieceId,
      type,
      auteur_id: userId,
      payload,
    });
    return e?.message ?? null;
  }

  async function changeStatut(piece: PieceRow, vers: PieceStatut) {
    if (vers === piece.statut_courant) return;
    setError(null);
    const e = await logEvent(piece.id, "changement_statut", {
      de: piece.statut_courant,
      vers,
    });
    if (e) return setError(e);
    await supabase
      .from("pieces")
      .update({ statut_courant: vers })
      .eq("id", piece.id);
    refetch();
  }

  async function envoiRelais(piece: PieceRow, versId: string) {
    setError(null);
    const e = await logEvent(piece.id, "envoi_relais", { vers: versId });
    if (e) return setError(e);
    await supabase
      .from("pieces")
      .update({ relais_vers_id: versId })
      .eq("id", piece.id);
    refetch();
  }

  async function annulerEnvoi(piece: PieceRow) {
    setError(null);
    const e = await logEvent(piece.id, "annulation_envoi", {});
    if (e) return setError(e);
    await supabase
      .from("pieces")
      .update({ relais_vers_id: null })
      .eq("id", piece.id);
    refetch();
  }

  async function prendre(piece: PieceRow) {
    setError(null);
    const pin = window.prompt(
      `Entre ton PIN pour prendre « ${piece.titre_operation} » :`,
    );
    if (!pin) return;
    const { data: ok, error: rpcErr } = await supabase.rpc("verify_my_pin", {
      p_pin: pin,
    });
    if (rpcErr) return setError(rpcErr.message);
    if (!ok) return setError("PIN incorrect.");
    const e = await logEvent(piece.id, "acceptation", {
      de: piece.proprietaire_courant_id,
    });
    if (e) return setError(e);
    await supabase
      .from("pieces")
      .update({ proprietaire_courant_id: userId, relais_vers_id: null })
      .eq("id", piece.id);
    refetch();
  }

  async function refuser(piece: PieceRow) {
    setError(null);
    const e = await logEvent(piece.id, "refus", {});
    if (e) return setError(e);
    await supabase
      .from("pieces")
      .update({ relais_vers_id: null })
      .eq("id", piece.id);
    refetch();
  }

  async function definirPin() {
    setError(null);
    const pin = window.prompt("Choisis ton code PIN (4 chiffres) :");
    if (!pin) return;
    const { error: e } = await supabase.rpc("set_my_pin", { p_pin: pin });
    if (e) return setError(e.message);
    window.alert("PIN enregistré.");
  }

  async function createPiece(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!titre.trim() || poleId === "") {
      return setError("Le titre de l’opération et le secteur sont obligatoires.");
    }
    const atelier = ateliers.find((a) => a.pole_id === poleId);
    if (!atelier) return setError("Aucun atelier rattaché à ce secteur.");

    setBusy(true);
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
      setBusy(false);
      return setError(insErr?.message ?? "Création impossible.");
    }

    await logEvent(created.id, "creation", {
      titre_operation: titre.trim(),
      numero_serie: numeroSerie.trim() || null,
      numero_of: numeroOf.trim() || null,
    });

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

  const inbox = pieces.filter((p) => p.relais_vers_id === userId);
  const autresUtilisateurs = users.filter((u) => u.id !== userId);

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
            onClick={definirPin}
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm transition hover:bg-white/5"
          >
            Mon PIN
          </button>
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

      {/* Inbox — pièces qu'on m'a envoyées et que je dois prendre */}
      {inbox.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <h3 className="text-sm font-medium text-amber-300">
            📥 À prendre ({inbox.length})
          </h3>
          {inbox.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md bg-black/20 px-3 py-2"
            >
              <div className="text-sm">
                <span className="font-medium">{p.titre_operation}</span>
                <span className="text-white/50">
                  {" "}
                  — de {nom(p.proprietaire)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => prendre(p)}
                  className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-400"
                >
                  Prendre
                </button>
                <button
                  onClick={() => refuser(p)}
                  className="rounded-md border border-white/15 px-3 py-1 text-xs transition hover:bg-white/5"
                >
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
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
                <th className="px-4 py-2 font-medium">Secteur</th>
                <th className="px-4 py-2 font-medium">Propriétaire</th>
                <th className="px-4 py-2 font-medium">Échéance</th>
                <th className="px-4 py-2 font-medium">Statut</th>
                <th className="px-4 py-2 font-medium">Relais</th>
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
                    <div className="text-xs text-white/40">
                      {[p.numero_serie, p.numero_of, p.designation_article]
                        .filter(Boolean)
                        .join(" · ")}
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
                    {nom(p.proprietaire)}
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
                  <td className="px-4 py-3">
                    {p.relais_vers_id ? (
                      <div className="flex items-center gap-2 text-xs text-amber-300">
                        <span>→ {nom(p.destinataire)} (en transit)</span>
                        {p.proprietaire_courant_id === userId ? (
                          <button
                            onClick={() => annulerEnvoi(p)}
                            className="rounded border border-white/15 px-2 py-0.5 text-white/70 transition hover:bg-white/5"
                          >
                            Annuler
                          </button>
                        ) : null}
                      </div>
                    ) : p.proprietaire_courant_id === userId ? (
                      relaisOpenFor === p.id ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={relaisTarget}
                            onChange={(e) => setRelaisTarget(e.target.value)}
                            className="rounded-md border border-white/10 bg-black/20 px-2 py-1 text-xs outline-none"
                          >
                            <option value="">— à qui ? —</option>
                            {autresUtilisateurs.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.prenom} {u.nom}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              if (!relaisTarget) return;
                              envoiRelais(p, relaisTarget);
                              setRelaisOpenFor(null);
                              setRelaisTarget("");
                            }}
                            className="rounded bg-indigo-500 px-2 py-1 text-xs font-medium text-white transition hover:bg-indigo-400"
                          >
                            Envoyer
                          </button>
                          <button
                            onClick={() => setRelaisOpenFor(null)}
                            className="px-1 text-white/50"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setRelaisOpenFor(p.id);
                            setRelaisTarget("");
                          }}
                          className="rounded-md border border-white/15 px-2.5 py-1 text-xs transition hover:bg-white/5"
                        >
                          Relais →
                        </button>
                      )
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
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
