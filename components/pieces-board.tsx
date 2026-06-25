"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Dial } from "@/components/dial";
import { Pilotage } from "@/components/pilotage";
import { usePreferences } from "@/components/preferences-provider";
import {
  STATUT_CLASSES,
  STATUT_LABEL,
  STATUT_HEX,
  STATUT_PROGRESS,
  STATUTS,
  URGENCES,
  SEUIL_URGENCE,
  urgenceOf,
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
  userSecteur: string;
  isChef: boolean;
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

/** Libellé compact pour le centre du sous-cadran. */
function formatCompact(sec: number): string {
  if (sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h` : `${m}m`;
}

export function PiecesBoard({
  initialPieces,
  poles,
  ateliers,
  users,
  ofs,
  userId,
  userSecteur,
  isChef,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [pieces, setPieces] = useState<PieceRow[]>(initialPieces);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pop-up « Mon PIN »
  const [showPin, setShowPin] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinMsg, setPinMsg] = useState<string | null>(null);

  // Relais en cours de saisie (quelle pièce, vers qui) — via pop-up
  const [relaisPiece, setRelaisPiece] = useState<PieceRow | null>(null);
  const [relaisTarget, setRelaisTarget] = useState<string>("");

  // Chrono : pieceId -> timestamp (ms) de démarrage. `now` fait avancer l'affichage.
  const [chrono, setChrono] = useState<Record<number, number>>({});
  const [now, setNow] = useState<number>(Date.now());

  // Recherche / filtres / vue (actives vs archive)
  const [query, setQuery] = useState("");
  const [filtreSecteur, setFiltreSecteur] = useState("");
  const [vue, setVue] = useState<"actives" | "archive" | "pilotage">("actives");

  // Secteur affiché par défaut (préférence utilisateur).
  const { prefs } = usePreferences();
  useEffect(() => {
    setFiltreSecteur(prefs.secteurDefaut);
  }, [prefs.secteurDefaut]);

  // Champs du formulaire de création
  const [titre, setTitre] = useState("");
  const [poleId, setPoleId] = useState<number | "">("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [numeroOf, setNumeroOf] = useState("");
  const [designation, setDesignation] = useState("");
  const [echeance, setEcheance] = useState("");
  const [urgence, setUrgence] = useState(0);
  const [assigneA, setAssigneA] = useState(userId);
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

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setPinMsg(null);
    if (!/^\d{4,8}$/.test(pinValue)) {
      return setPinMsg("Le PIN doit contenir 4 à 8 chiffres.");
    }
    const { error } = await setMyPinAction(pinValue);
    if (error) return setPinMsg(error);
    setPinValue("");
    setShowPin(false);
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
      priorite: urgence,
      echeance: echeance || null,
      proprietaireId: assigneA || userId,
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
    setUrgence(0);
    setAssigneA(userId);
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

  // Urgences du jour (niveau « Urgence », non terminées) — uniquement en vue Actives.
  const urgences =
    vue === "actives"
      ? filtered.filter(
          (p) => p.priorite >= SEUIL_URGENCE && p.statut_courant !== "terminee",
        )
      : [];
  const urgenceIds = new Set(urgences.map((p) => p.id));
  const reste = filtered.filter((p) => !urgenceIds.has(p.id));

  // Bandeau d'accueil
  const bannerSecteur = prefs.secteurDefaut || userSecteur;
  const bannerColor =
    poles.find((p) => p.libelle === bannerSecteur)?.couleur ?? "#CDB06A";
  const prenom = users.find((u) => u.id === userId)?.prenom ?? "";
  const aFaire = pieces.filter(
    (p) =>
      p.proprietaire_courant_id === userId && p.statut_courant !== "terminee",
  ).length;
  const debutJour = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const enRetard = pieces.filter(
    (p) =>
      p.proprietaire_courant_id === userId &&
      p.statut_courant !== "terminee" &&
      p.echeance &&
      new Date(p.echeance).getTime() < debutJour,
  ).length;
  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const renderCard = (p: PieceRow) => {
    const urg = urgenceOf(p.priorite);
    return (
      <div
        key={p.id}
        onClick={() => router.push(`/pieces/${p.id}`)}
        className="task-card relative cursor-pointer rounded-2xl border bg-white/[0.035] p-5"
        style={{
          borderColor: `${urg.color}66`,
          boxShadow: `0 0 0 1px ${urg.color}22, 0 0 16px ${urg.color}33`,
        }}
      >
        <div className="flex h-full flex-col gap-3">
          {/* En-tête : titre + statut */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: urg.color }}
                  title={`Urgence : ${urg.label}`}
                />
                <span className="font-display truncate text-[15px] font-semibold">
                  {p.titre_operation}
                </span>
              </div>
              {[p.numero_serie, p.numero_of, p.designation_article].filter(
                Boolean,
              ).length > 0 ? (
                <div className="mt-0.5 truncate text-xs text-white/40">
                  {[p.numero_serie, p.numero_of, p.designation_article]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              ) : null}
            </div>
            <select
              value={p.statut_courant}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => changeStatut(p, e.target.value as PieceStatut)}
              className={`shrink-0 cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs outline-none ${STATUT_CLASSES[p.statut_courant]}`}
            >
              {STATUTS.map((s) => (
                <option key={s} value={s} className="bg-neutral-900">
                  {STATUT_LABEL[s]}
                </option>
              ))}
            </select>
          </div>

          {/* Secteur · propriétaire · échéance */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
            {p.atelier?.pole ? (
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: p.atelier.pole.couleur ?? "#6b7280",
                  }}
                />
                {p.atelier.pole.libelle}
              </span>
            ) : null}
            <span>{nom(p.proprietaire)}</span>
            <span className="text-white/45">{formatEcheance(p.echeance)}</span>
          </div>

          {/* Bas de carte : temps + relais (clics protégés) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="mt-auto flex items-center justify-between gap-2 border-t border-white/5 pt-3"
          >
            <div className="flex items-center gap-2.5">
              <Dial
                progress={STATUT_PROGRESS[p.statut_courant]}
                color={STATUT_HEX[p.statut_courant]}
                label={
                  chrono[p.id]
                    ? formatChrono(Math.round((now - chrono[p.id]) / 1000))
                    : formatCompact(totalSec(p))
                }
              />
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

            <div>
              {p.relais_vers_id ? (
                <div className="flex items-center gap-2 text-xs text-amber-300">
                  <span>→ {nom(p.destinataire)}</span>
                  {p.proprietaire_courant_id === userId ? (
                    <button
                      onClick={() => annulerEnvoi(p)}
                      className="hover-gold rounded border border-white/15 px-2 py-0.5 text-white/70"
                    >
                      Annuler
                    </button>
                  ) : null}
                </div>
              ) : p.proprietaire_courant_id === userId ? (
                <button
                  onClick={() => {
                    setRelaisPiece(p);
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
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-6">
      {/* Bandeau d'accueil */}
      <div className="banner-enter guilloche relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-slate-500/10 to-transparent p-5 sm:p-6">
        <div
          className="float-a pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(99,102,241,0.28)" }}
        />
        <div
          className="float-b pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full blur-3xl"
          style={{ backgroundColor: "rgba(207,181,59,0.18)" }}
        />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            {bannerSecteur ? (
              <div
                className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-base font-medium"
                style={{
                  borderColor: `${bannerColor}66`,
                  backgroundColor: `${bannerColor}1f`,
                  color: bannerColor,
                }}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: bannerColor }}
                />
                Pôle {bannerSecteur}
              </div>
            ) : null}
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Bonjour {prenom}
              {prenom ? " 👋" : "👋"}
            </h2>
            <p className="mt-2.5 text-sm text-white/70">
              {aFaire > 0
                ? `Tu as ${aFaire} tâche${aFaire > 1 ? "s" : ""} à faire aujourd’hui.`
                : "Aucune tâche en attente. Beau travail ! ✨"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2.5">
            <div className="text-base capitalize text-white/70">{dateStr}</div>
            <div className="flex items-center gap-3">
            <div className="flex min-w-[5.5rem] flex-col items-center rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-3 backdrop-blur transition hover:scale-105">
              <span
                className="text-3xl font-bold leading-none"
                style={{ color: "#F0D879" }}
              >
                {aFaire}
              </span>
              <span className="mt-1 text-[11px] uppercase tracking-wide text-white/55">
                à faire
              </span>
            </div>
            {urgences.length > 0 ? (
              <div className="flex min-w-[5.5rem] flex-col items-center rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 backdrop-blur transition hover:scale-105">
                <span className="text-3xl font-bold leading-none text-red-300">
                  {urgences.length}
                </span>
                <span className="mt-1 text-[11px] uppercase tracking-wide text-red-300/80">
                  urgentes
                </span>
              </div>
            ) : null}
            {enRetard > 0 ? (
              <div className="flex min-w-[5.5rem] flex-col items-center rounded-2xl border border-orange-500/40 bg-orange-500/10 px-5 py-3 backdrop-blur transition hover:scale-105">
                <span className="text-3xl font-bold leading-none text-orange-300">
                  {enRetard}
                </span>
                <span className="mt-1 text-[11px] uppercase tracking-wide text-orange-300/80">
                  en retard
                </span>
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Onglets Actives / Archive */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/15 p-1">
          <button
            onClick={() => setVue("actives")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              vue === "actives"
                ? "bg-indigo-500 text-white shadow"
                : "text-white/70 hover-gold"
            }`}
          >
            Actives
          </button>
          <button
            onClick={() => setVue("archive")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              vue === "archive"
                ? "bg-[#CFB53B] text-black shadow"
                : "text-white/70 hover-gold"
            }`}
          >
            Archive
          </button>
          {isChef ? (
            <button
              onClick={() => setVue("pilotage")}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                vue === "pilotage"
                  ? "bg-emerald-500 text-white shadow"
                  : "text-white/70 hover-gold"
              }`}
            >
              Pilotage
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/50">
            {filtered.length} pièce{filtered.length > 1 ? "s" : ""}
          </span>
          <button
            onClick={() => {
              setPinMsg(null);
              setShowPin(true);
            }}
            className="hover-gold rounded-lg border border-white/15 px-3 py-1.5 text-sm"
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
        open={!!relaisPiece}
        onClose={() => setRelaisPiece(null)}
        title="Passer le relais"
      >
        <div className="space-y-4">
          {relaisPiece ? (
            <p className="text-sm text-white/70">
              Pièce :{" "}
              <span className="font-medium text-white">
                {relaisPiece.titre_operation}
              </span>
            </p>
          ) : null}
          <label className="block space-y-1.5">
            <span className="text-sm text-white/70">Transmettre à</span>
            <select
              value={relaisTarget}
              onChange={(e) => setRelaisTarget(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none"
            >
              <option value="">— choisir une personne —</option>
              {autresUtilisateurs.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-3">
            <button
              disabled={!relaisTarget}
              onClick={() => {
                if (!relaisPiece || !relaisTarget) return;
                envoiRelais(relaisPiece, relaisTarget);
                setRelaisPiece(null);
                setRelaisTarget("");
              }}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
            >
              Envoyer le relais
            </button>
            <button
              onClick={() => setRelaisPiece(null)}
              className="hover-gold rounded-lg border border-white/15 px-4 py-2 text-sm"
            >
              Annuler
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showPin}
        onClose={() => setShowPin(false)}
        title="Mon code PIN"
      >
        <form onSubmit={submitPin} className="space-y-4">
          <p className="text-sm text-white/60">
            Ce code confirme ton identité pour accepter un relais (4 à 8
            chiffres).
          </p>
          {pinMsg ? (
            <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {pinMsg}
            </p>
          ) : null}
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pinValue}
            onChange={(e) => setPinValue(e.target.value)}
            placeholder="Nouveau PIN"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
          >
            Enregistrer le PIN
          </button>
        </form>
      </Modal>

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

          <label className="space-y-1">
            <span className="text-sm text-white/70">Niveau d’urgence</span>
            <select
              value={urgence}
              onChange={(e) => setUrgence(Number(e.target.value))}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
            >
              {URGENCES.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm text-white/70">Assigner à</span>
            <select
              value={assigneA}
              onChange={(e) => setAssigneA(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
            >
              <option value={userId}>Moi-même</option>
              {autresUtilisateurs.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.prenom} {u.nom}
                </option>
              ))}
            </select>
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

      {vue === "pilotage" ? (
        <Pilotage pieces={pieces} poles={poles} users={users} />
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une pièce, un n° de série, un OF…"
            className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm outline-none"
          />

      {/* Urgences du jour */}
      {urgences.length > 0 ? (
        <div className="space-y-4 rounded-2xl border border-red-500/40 bg-red-500/[0.06] p-5 shadow-[0_0_24px_rgba(248,113,113,0.18)]">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-red-300">
            🚨 Urgences du jour ({urgences.length})
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {urgences.map((p) => renderCard(p))}
          </div>
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="guilloche relative overflow-hidden rounded-2xl border border-dashed border-white/15 p-12 text-center text-sm text-white/50">
          <span className="relative z-10">
            {pieces.length === 0
              ? "Aucune pièce. Clique sur « + Nouvelle pièce » pour en créer une."
              : "Aucune pièce ne correspond à la recherche / au filtre."}
          </span>
        </div>
      ) : reste.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reste.map((p) => renderCard(p))}
        </div>
      ) : null}
        </>
      )}
    </section>
  );
}
