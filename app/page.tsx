import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { PIECE_SELECT } from "@/lib/queries";
import { PiecesBoard } from "@/components/pieces-board";
import { Brand } from "@/components/brand";
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
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0c12]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Brand subtitle="Atelier horloger" />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-white/55 sm:inline">
              {user?.email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border border-white/15 px-3 py-1.5 text-sm transition hover:bg-white/5"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-6">
        <PiecesBoard
          initialPieces={(piecesRes.data as unknown as PieceRow[]) ?? []}
          poles={(polesRes.data as Pole[]) ?? []}
          ateliers={(ateliersRes.data as Atelier[]) ?? []}
          users={(usersRes.data as Personne[]) ?? []}
          ofs={(ofsRes.data as Of[]) ?? []}
          userId={user!.id}
        />
      </main>
    </div>
  );
}
