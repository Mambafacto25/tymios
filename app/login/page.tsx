import { signIn } from "@/app/auth/actions";
import { Brand } from "@/components/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Brand subtitle="Suivi de pièces & relais d’atelier" />
        </div>

        <form
          action={signIn}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <div className="space-y-1">
            <h1 className="text-lg font-semibold">Connexion</h1>
            <p className="text-sm text-white/50">Accède à ton atelier.</p>
          </div>

          {error ? (
            <p className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-sm text-white/70">Email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 transition"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm text-white/70">Mot de passe</span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 transition"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-500 px-3 py-2.5 font-medium text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400"
          >
            Se connecter
          </button>
        </form>
      </div>
    </main>
  );
}
