import { signIn } from "@/app/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form
        action={signIn}
        className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-white/5 p-8"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Relais</h1>
          <p className="text-sm text-white/60">Connexion à l’atelier</p>
        </div>

        {error ? (
          <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <label className="block space-y-1">
          <span className="text-sm text-white/70">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm text-white/70">Mot de passe</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 outline-none focus:border-white/30"
          />
        </label>

        <button
          type="submit"
          className="w-full rounded-md bg-indigo-500 px-3 py-2 font-medium text-white transition hover:bg-indigo-400"
        >
          Se connecter
        </button>
      </form>
    </main>
  );
}
