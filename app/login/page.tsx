import { signIn } from "@/app/auth/actions";
import { BrandMark } from "@/components/brand";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      {/* Décor : guilloché + halos flottants */}
      <div className="guilloche pointer-events-none absolute inset-0 opacity-60" />
      <div
        className="float-a pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "rgba(99,102,241,0.18)" }}
      />
      <div
        className="float-b pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full blur-3xl"
        style={{ background: "rgba(207,181,59,0.14)" }}
      />

      <div className="dialog-pop relative w-full max-w-sm">
        {/* Marque */}
        <div className="mb-7 flex flex-col items-center text-center">
          <BrandMark size={88} />
          <h1
            className="font-display mt-4 text-4xl font-semibold tracking-tight"
            style={{ color: "#CDB06A" }}
          >
            Tymios
          </h1>
          <p className="mt-1.5 text-sm text-white/45">
            Suivi de pièces, relais &amp; pointage d’atelier
          </p>
        </div>

        <form
          action={signIn}
          className="guilloche-soft relative space-y-4 overflow-hidden rounded-3xl border border-[#CFB53B]/30 bg-white/[0.04] p-7 shadow-2xl shadow-black/50 backdrop-blur-xl"
          style={{
            boxShadow:
              "0 30px 80px -24px rgba(0,0,0,.7), 0 0 0 1px rgba(207,181,59,.12), 0 0 36px -14px rgba(207,181,59,.4)",
          }}
        >
          <div className="relative space-y-1">
            <h2 className="font-display text-lg font-semibold">Connexion</h2>
            <p className="text-sm text-white/50">Accède à ton atelier.</p>
          </div>

          {error ? (
            <p className="relative rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          ) : null}

          <label className="relative block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-white/45">
              Email
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="prenom@atelier.fr"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 outline-none transition focus:border-[#CFB53B]/70"
            />
          </label>

          <label className="relative block space-y-1.5">
            <span className="text-xs uppercase tracking-wide text-white/45">
              Mot de passe
            </span>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 outline-none transition focus:border-[#CFB53B]/70"
            />
          </label>

          <button
            type="submit"
            className="relative w-full rounded-xl px-3 py-3 font-semibold text-[#2a2200] shadow-lg transition hover:brightness-105 active:brightness-95"
            style={{
              background:
                "linear-gradient(180deg,#F0D879 0%,#E6C84D 45%,#CFB53B 100%)",
            }}
          >
            Se connecter
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/30">
          Atelier horloger · le registre est sacré
        </p>
      </div>
    </main>
  );
}
