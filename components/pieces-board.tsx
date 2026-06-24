"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { PIECE_SELECT } from "@/lib/queries";
import {
  createPieceAction,
  changeStatutAction,
  envoiRelaisAction,
  annulerEnvoiAction,
  prendreRelaisAction,
  refuserRelaisAction,
  setMyPinAction,
  pointerTempsAction,
  corrigerTempsAction,
} from "@/app/actions/pieces";
import { OfImport } from "@/components/of-import";
import { Modal } from "@/components/modal";
import { IconPlay, IconStop, IconPlus, IconPencil } from "@/components/icons";
import {
  STATUT_CLASSES,
  STATUT_LABEL,
  STATUTS,
  type Atelier,
  type Of,
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
  ofs: Of[];
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

function totalSec(piece: PieceRow): number {
  return (piece.temps ?? []).reduce((s, t) => s + (t.duree_sec ?? 0), 0);
}

function formatDuree(sec: number): string {
  if (sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return `${h} h ${m.toString().padStart(2, "0")}`;
  if (m > 0) return `${m} min`;
  return `${sec} s`;
}

function formatChrono(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PiecesBoard({
  initialPieces,
  poles,
  ateliers,
  users,
  ofs,
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

  // Chrono : pieceId -> timestamp (ms) de démarrage. `now` fait avancer l'affichage.
  const [chrono, setChrono] = useState<Record<number, number>>({});
  const [now, setNow] = useState<number>(Date.now());

  // Recherche / filtres / vue (actives vs archive)
  const [query, setQuery] = useState("");
  const [filtreSecteur, setFiltreSecteur] = useState("");
  const [vue, setVue] = useState<"actives" | "archive">("actives");

  // Champs du formulaire de création
  const [titre, setTitre] = useState("");
  const [poleId, setPoleId] = useState<number | "">("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [numeroOf, setNumeroOf] = useState("");
  const [designation, setDesignation] = useState("");
  const [echeance, setEcheance] = useState("");
  const [prioritaire, setPrioritaire] = useState(false);
  const [ofId, setOfId] = useState<number | "">("");

  function appliquerOf(id: number | "") {
    setOfId(id);
    if (id === "") return;
    const of = ofs.find((o) => o.id === id);
    if (!of) return;
    setNumeroOf(of.numero_of);
    if (of.designation_article) setDesignation(of.designation_article);
    if (of.numero_serie) setNumeroSerie(of.numero_serie);
    if (of.echeance) setEcheance(of.echeance);
  }

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from("pieces")
      .select(PIECE_SELECT)
      .order("echeance", { ascending: true, nullsFirst: false });
    if (data) setPieces(data as unknown as PieceRow[]);
  }, [supabase]);

  // Temps réel : changements sur pieces ET time_entries rafraîchissent la liste.
  useEffect(() => {
    const channel = supabase
      .channel("pieces-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pieces" },
        () => refetch(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_entries" },
        () => refetch(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch]);

  // Fait avancer l'affichage des chronos en cours (1 s) quand il y en a.
  useEffect(() => {
    if (Object.keys(chrono).length === 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [chrono]);

  function demarrerChrono(pieceId: number) {
    setChrono((c) => ({ ...c, [pieceId]: Date.now() }));
    setNow(Date.now());
  }

  async function arreterChrono(piece: PieceRow) {
    const start = chrono[piece.id];
    if (!start) return;
    const dureeSec = Math.max(1, Math.round((Date.now() - start) / 1000));
    setChrono((c) => {
      const next = { ...c };
      delete next[piece.id];
      return next;
    });
    setError(null);
    const { error } = await pointerTempsAction(
      piece.id,
      dureeSec,
      false,
      new Date(start).toISOString(),
      new Date().toISOString(),
    );
    if (error) return setError(error);
    refetch();
  }

  async function pointerManuel(piece: PieceRow) {
    const saisie = window.prompt(
      `Temps à ajouter sur « ${piece.titre_operation} » (en minutes) :`,
    );
    if (!saisie) return;
    const minutes = Number(saisie.replace(",", "."));
    if (!Number.isFinite(minutes) || minutes <= 0) {
      return setError("Durée invalide.");
    }
    setError(null);
    const { error } = await pointerTempsAction(
      piece.id,
      Math.round(minutes * 60),
      true,
    );
    if (error) return setError(error);
    refetch();
  }

  async function corrigerTemps(piece: PieceRow) {
    const ancien = totalSec(piece);
    const saisie = window.prompt(
      `Corriger le temps total de « ${piece.titre_operation} » (en minutes) :`,
      String(Math.round(ancien / 60)),
    );
    if (saisie === null) return;
    const minutes = Number(saisie.replace(",", "."));
    if (!Number.isFinite(minutes) || minutes < 0) {
      return setError("Total invalide.");
    }
    const raison = window.prompt("Motif de la correction :") ?? "";
    setError(null);
    const { error } = await corrigerTempsAction(
      piece.id,
      ancien,
      Math.round(minutes * 60),
      raison,
    );
    if (error) return setError(error);
    refetch();
  }

  async function changeStatut(piece: PieceRow, vers: PieceStatut) {
    if (vers === piece.statut_courant) return;
    setError(null);
    const { error } = await changeStatutAction(piece.id, piece.statut_courant, vers);
    if (error) return setError(error);
    refetch();
  }

  async function envoiRelais(piece: PieceRow, versId: string) {
    setError(null);
    const { error } = await envoiRelaisAction(piece.id, versId);
    if (error) return setError(error);
    refetch();
  }

  async function annulerEnvoi(piece: PieceRow) {
    setError(null);
    const { error } = await annulerEnvoiAction(piece.id);
    if (error) return setError(error);
    refetch();
  }

  async function prendre(piece: PieceRow) {
    setError(null);
    const pin = window.prompt(
      `Entre ton PIN pour prendre « ${piece.titre_operation} » :`,
    );
    if (!pin) return;
    const { error } = await prendreRelaisAction(piece.id, pin);
    if (error) return setError(error);
    refetch();
  }

  async function refuser(piece: PieceRow) {
    setError(null);
    const { error } = await refuserRelaisAction(piece.id);
    if (error) return setError(error);
    refetch();
  }

  async function definirPin() {
    setError(null);
    const pin = window.prompt("Choisis ton code PIN (4 chiffres) :");
    if (!pin) return;
    const { error } = await setMyPinAction(pin);
    if (error) return setError(error);
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
    const { error } = await createPieceAction({
      titre_operation: titre.trim(),
      numero_serie: numeroSerie.trim() || null,
      numero_of: numeroOf.trim() || null,
      designation_article: designation.trim() || null,
      atelier_id: atelier.id,
      priorite: prioritaire ? 1 : 0,
      echeance: echeance || null,
    });
    if (error) {
      setBusy(false);
      return setError(error);
    }

    setTitre("");
    setPoleId("");
    setNumeroSerie("");
    setNumeroOf("");
    setDesignation("");
    setEcheance("");
    setPrioritaire(false);
    setOfId("");
    setShowForm(false);
    setBusy(false);
    refetch();
  }

  const inbox = pieces.filter((p) => p.relais_vers_id === userId);
  const autresUtilisateurs = users.filter((u) => u.id !== userId);

  const q = query.trim().toLowerCase();
  const filtered = pieces.filter((p) => {
    const estTerminee = p.statut_courant === "terminee";
    if (vue === "actives" && estTerminee) return false;
    if (vue === "archive" && !estTerminee) return false;
    if (filtreSecteur && p.atelier?.pole?.libelle !== filtreSecteur) return false;
    if (
      q &&
      ![p.numero_serie, p.numero_of, p.designation_article, p.titre_operation]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    )
      return false;
    return true;
  });

  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Pièces</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Temps réel
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50">
            {filtered.length} pièce{filtered.length > 1 ? "s" : ""}
          </span>
          <button
            onClick={definirPin}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm transition hover:bg-white/5"
          >
            Mon PIN
          </button>
          <OfImport />
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
          >
            + Nouvelle pièce
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

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title="Nouvelle pièce"
      >
        <form
          onSubmit={createPiece}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {error ? (
            <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300 sm:col-span-2">
              {error}
            </p>
          ) : null}

          {ofs.length > 0 ? (
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm text-white/70">
                Pré-remplir depuis un OF
              </span>
              <select
                value={ofId}
                onChange={(e) =>
                  appliquerOf(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
              >
                <option value="">— aucun (saisie libre) —</option>
                {ofs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.numero_of}
                    {o.designation_article ? ` · ${o.designation_article}` : ""}
                    {o.numero_serie ? ` · ${o.numero_serie}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

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
      </Modal>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher (n° série, OF, réf., opération)…"
          className="min-w-64 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none"
        />
        <select
          value={filtreSecteur}
          onChange={(e) => setFiltreSecteur(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm outline-none"
        >
          <option value="">Tous les secteurs</option>
          {poles.map((p) => (
            <option key={p.id} value={p.libelle}>
              {p.libelle}
            </option>
          ))}
        </select>
        <div className="inline-flex overflow-hidden rounded-lg border border-white/10 text-sm">
          <button
            onClick={() => setVue("actives")}
            className={`px-3 py-1.5 ${vue === "actives" ? "bg-indigo-500 text-white" : "text-white/70 hover:bg-white/5"}`}
          >
            Actives
          </button>
          <button
            onClick={() => setVue("archive")}
            className={`px-3 py-1.5 ${vue === "archive" ? "bg-indigo-500 text-white" : "text-white/70 hover:bg-white/5"}`}
          >
            Archive
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
          {pieces.length === 0
            ? "Aucune pièce. Clique sur « + Nouvelle pièce » pour en créer une."
            : "Aucune pièce ne correspond à la recherche / au filtre."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">Opération</th>
                <th className="px-4 py-3 font-medium">Secteur</th>
                <th className="px-4 py-3 font-medium">Propriétaire</th>
                <th className="px-4 py-3 font-medium">Échéance</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Temps</th>
                <th className="px-4 py-3 font-medium">Relais</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-white/5 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {p.priorite > 0 ? (
                        <span title="Prioritaire" className="text-amber-400">
                          ●
                        </span>
                      ) : null}
                      <Link
                        href={`/pieces/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.titre_operation}
                      </Link>
                    </div>
                    <div className="text-xs text-white/40">
                      {[p.numero_serie, p.numero_of, p.designation_article]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-white/70">
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
                  <td className="px-4 py-4 text-white/70">
                    {nom(p.proprietaire)}
                  </td>
                  <td className="px-4 py-4 text-white/70">
                    {formatEcheance(p.echeance)}
                  </td>
                  <td className="px-4 py-4">
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
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-white/80">
                        {chrono[p.id]
                          ? formatChrono(
                              Math.round((now - chrono[p.id]) / 1000),
                            )
                          : formatDuree(totalSec(p))}
                      </span>
                      {p.proprietaire_courant_id === userId ? (
                        <span className="flex items-center gap-2">
                          {chrono[p.id] ? (
                            <button
                              onClick={() => arreterChrono(p)}
                              title="Arrêter le chrono"
                              className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition hover:opacity-90"
                            >
                              <IconStop className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => demarrerChrono(p.id)}
                              title="Démarrer le chrono"
                              style={{ backgroundColor: "#66FF00" }}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-black shadow-sm transition hover:opacity-90"
                            >
                              <IconPlay className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => pointerManuel(p)}
                            title="Saisie manuelle"
                            style={{ backgroundColor: "#89CFF0" }}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-black shadow-sm transition hover:opacity-90"
                          >
                            <IconPlus className="h-4 w-4" />
                          </button>
                          {totalSec(p) > 0 ? (
                            <button
                              onClick={() => corrigerTemps(p)}
                              title="Corriger le temps"
                              style={{ backgroundColor: "#CCCCFF" }}
                              className="flex h-7 w-7 items-center justify-center rounded-full text-black shadow-sm transition hover:opacity-90"
                            >
                              <IconPencil className="h-3.5 w-3.5" />
                            </button>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-4">
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
                          style={{
                            background:
                              "linear-gradient(180deg, #F0D879 0%, #E6C84D 45%, #CFB53B 100%)",
                          }}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-[#2a2200] shadow-md shadow-[#cfb53b]/20 ring-1 ring-[#a8902a]/40 transition hover:brightness-105 active:brightness-95"
                        >
                          Relais
                          <span aria-hidden>→</span>
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
