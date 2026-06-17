import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-8">
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Relais</h1>
          <p className="text-sm text-white/60">
            Socle v1 — étape 1 (base + auth + déploiement)
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

      <section className="space-y-2">
        <p className="text-white/80">
          Connecté en tant que{" "}
          <span className="font-medium">{user?.email}</span>.
        </p>
        <p className="text-sm text-white/60">
          Le socle tourne : authentification réelle branchée sur Supabase et
          routes protégées par le middleware. Les écrans de pièces, relais et
          pointage (étapes 2 à 6 du plan) viendront se brancher ici.
        </p>
      </section>
    </main>
  );
}
