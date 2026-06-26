import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/print-button";
import { Logo } from "@/components/brand";
import { describeEvent, EVENT_TYPE_LABEL, formatDureeSec } from "@/lib/events";
import { STATUT_LABEL, type PieceStatut } from "@/lib/types";

type EventRow = {
  id: number;
  type: string;
  created_at: string;
  payload: Record<string, unknown> | null;
  auteur: { prenom: string; nom: string } | null;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function FichePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pieceId = Number(id);
  const supabase = await createClient();

  const [pieceRes, eventsRes, usersRes] = await Promise.all([
    supabase
      .from("pieces")
      .select(
        `id, numero_serie, numero_of, designation_article, titre_operation,
         statut_courant, echeance,
         atelier:ateliers ( pole:poles ( libelle ) ),
         proprietaire:users!proprietaire_courant_id ( prenom, nom )`,
      )
      .eq("id", pieceId)
      .single(),
    supabase
      .from("events")
      .select(
        `id, type, created_at, payload, auteur:users!auteur_id ( prenom, nom )`,
      )
      .eq("piece_id", pieceId)
      .order("created_at", { ascending: true }),
    supabase.from("users").select("id, prenom, nom"),
    supabase.from("time_entries").select("duree_sec").eq("piece_id", pieceId),
  ]);

  const piece = pieceRes.data as
    | {
        id: number;
        numero_serie: string | null;
        numero_of: string | null;
        designation_article: string | null;
        titre_operation: string;
        statut_courant: PieceStatut;
        echeance: string | null;
        atelier: { pole: { libelle: string } | null } | null;
        proprietaire: { prenom: string; nom: string } | null;
      }
    | null;

  if (!piece) notFound();

  const events = (eventsRes.data as unknown as EventRow[] | null) ?? [];
  const users = (usersRes.data as { id: string; prenom: string; nom: string }[] | null) ?? [];
  const usersMap = new Map(users.map((u) => [u.id, `${u.prenom} ${u.nom}`]));
  const resolveUser = (uid: string) => usersMap.get(uid) ?? "—";

  // Total de temps reconstruit depuis les pointages.
  const totalSec = events
    .filter((e) =>
      ["pointage", "pointage_manuel", "correction_temps"].includes(e.type),
    )
    .reduce((s, e) => {
      const p = e.payload ?? {};
      if (e.type === "correction_temps") {
        return s + (Number(p.vers ?? 0) - Number(p.de ?? 0));
      }
      return s + Number(p.duree_sec ?? 0);
    }, 0);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="no-print mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Retour
        </Link>
        <PrintButton />
      </div>

      {/* Document imprimable (fond blanc pour un rendu PDF propre) */}
      <article className="overflow-hidden rounded-xl bg-white text-neutral-900 shadow-lg print:rounded-none print:shadow-none">
        {/* En-tête doré : logo + nom de l'app */}
        <header
          className="flex items-center justify-between px-8 py-5"
          style={{
            background: "linear-gradient(135deg, #E6CC7A 0%, #CDB06A 100%)",
          }}
        >
          <div className="flex items-center gap-3">
            <Logo color="#3a2f12" className="h-11 w-11" />
            <div>
              <div
                className="font-display text-2xl font-bold leading-none"
                style={{ color: "#2a2208" }}
              >
                Tymios
              </div>
              <div className="text-sm" style={{ color: "#4a3d14" }}>
                Fiche de traçabilité
              </div>
            </div>
          </div>
          <div className="text-right" style={{ color: "#3a2f12" }}>
            <div className="text-xs uppercase tracking-wide opacity-70">
              N° de série
            </div>
            <div className="text-lg font-semibold">
              {piece.numero_serie ?? "—"}
            </div>
          </div>
        </header>

        <div className="p-8">

        <section className="mb-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <Info label="Opération" value={piece.titre_operation} />
          <Info label="N° d’OF" value={piece.numero_of ?? "—"} />
          <Info label="Article" value={piece.designation_article ?? "—"} />
          <Info label="Secteur" value={piece.atelier?.pole?.libelle ?? "—"} />
          <Info label="Statut actuel" value={STATUT_LABEL[piece.statut_courant]} />
          <Info
            label="Propriétaire actuel"
            value={
              piece.proprietaire
                ? `${piece.proprietaire.prenom} ${piece.proprietaire.nom}`
                : "—"
            }
          />
          <Info label="Temps total pointé" value={formatDureeSec(totalSec)} />
          <Info
            label="Échéance"
            value={
              piece.echeance
                ? new Date(piece.echeance).toLocaleDateString("fr-FR")
                : "—"
            }
          />
        </section>

        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Journal des événements
        </h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-neutral-500">
              <th className="py-2 pr-3 font-medium">Date / heure</th>
              <th className="py-2 pr-3 font-medium">Événement</th>
              <th className="py-2 pr-3 font-medium">Détail</th>
              <th className="py-2 font-medium">Auteur</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 align-top">
                <td className="py-2 pr-3 whitespace-nowrap text-neutral-600">
                  {formatDateTime(e.created_at)}
                </td>
                <td className="py-2 pr-3 font-medium">
                  {EVENT_TYPE_LABEL[e.type] ?? e.type}
                </td>
                <td className="py-2 pr-3 text-neutral-700">
                  {describeEvent(e.type, e.payload, resolveUser)}
                </td>
                <td className="py-2 text-neutral-700">
                  {e.auteur ? `${e.auteur.prenom} ${e.auteur.nom}` : "—"}
                </td>
              </tr>
            ))}
            {events.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-neutral-400">
                  Aucun événement.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

          <footer className="mt-6 border-t border-neutral-200 pt-3 text-xs text-neutral-400">
            Registre en insertion seule — historique non modifiable. Édité le{" "}
            {new Date().toLocaleString("fr-FR")}.
          </footer>
        </div>
      </article>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
