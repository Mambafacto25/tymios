import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { PIECE_SELECT } from "@/lib/queries";
import { PiecesBoard } from "@/components/pieces-board";
import type { Atelier, Of, Personne, PieceRow, Pole } from "@/lib/types";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [piecesRes, polesRes, ateliersRes, usersRes, ofsRes] =
    await Promise.all([
      supabase
        .from("pieces")
        .select(PIECE_SELECT)
        .order("echeance", { ascending: true, nullsFirst: false }),
      supabase.from("poles").select("id, libelle, couleur").order("libelle"),
      supabase.from("ateliers").select("id, pole_id"),
      supabase.from("users").select("id, prenom, nom").eq("actif", true),
      supabase
        .from("ofs")
        .select("id, numero_of, designation_article, numero_serie, echeance")
        .order("numero_of"),
    ]);

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

      <PiecesBoard
        initialPieces={(piecesRes.data as unknown as PieceRow[]) ?? []}
        poles={(polesRes.data as Pole[]) ?? []}
        ateliers={(ateliersRes.data as Atelier[]) ?? []}
        users={(usersRes.data as Personne[]) ?? []}
        ofs={(ofsRes.data as Of[]) ?? []}
        userId={user!.id}
      />
    </main>
  );
}
