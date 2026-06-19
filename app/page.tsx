import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import {
  STATUT_CLASSES,
  STATUT_LABEL,
  type PieceRow,
  type PieceStatut,
} from "@/lib/types";

function formatEcheance(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("pieces")
    .select(
      `id, numero_serie, numero_of, designation_article, titre_operation,
       priorite, echeance, statut_courant,
       atelier:ateliers ( nom, pole:poles ( libelle, couleur ) ),
       proprietaire:users!proprietaire_courant_id ( prenom, nom )`,
    )
    .order("echeance", { ascending: true, nullsFirst: false });

  const pieces = (data as PieceRow[] | null) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Relais</h1>
          <p className="text-sm text-white/60">
            Connecté en tant que{" "}
            <span className="font-medium">{user?.email}</span>
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md border border-white/15 px-3 py-1.5 text-sm transition hover:bg-white/5"
          >
            Déconnexion
          </button>
        </form>
      </header>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Pièces</h2>
          <span className="text-sm text-white/50">
            {pieces.length} pièce{pieces.length > 1 ? "s" : ""}
          </span>
        </div>

        {error ? (
          <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
            Erreur de lecture : {error.message}
          </p>
        ) : pieces.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-white/50">
            Aucune pièce pour l’instant. Charge le jeu de données de test
            (supabase/seed_demo.sql) pour voir l’écran se remplir.
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
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${
                          STATUT_CLASSES[p.statut_courant as PieceStatut]
                        }`}
                      >
                        {STATUT_LABEL[p.statut_courant as PieceStatut]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
