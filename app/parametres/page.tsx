import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Brand } from "@/components/brand";
import { IconGear } from "@/components/icons";
import { ProfileForm, PinForm } from "@/components/settings-account";

type Profil = {
  prenom: string;
  nom: string;
  email: string;
  role: string | null;
  pin_hash: string | null;
  pole: { libelle: string } | null;
};

type Membre = {
  id: string;
  prenom: string;
  nom: string;
  role: string | null;
  actif: boolean;
  pole: { libelle: string; couleur: string | null } | null;
};

type Secteur = {
  id: number;
  libelle: string;
  couleur: string | null;
  icone: string | null;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-white/50">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-white/40">
        {label}
      </div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

export default async function ParametresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [profilRes, equipeRes, secteursRes, piecesCountRes, ofsCountRes] =
    await Promise.all([
      supabase
        .from("users")
        .select("prenom, nom, email, role, pin_hash, pole:poles ( libelle )")
        .eq("id", user!.id)
        .single(),
      supabase
        .from("users")
        .select("id, prenom, nom, role, actif, pole:poles ( libelle, couleur )")
        .order("nom"),
      supabase.from("poles").select("id, libelle, couleur, icone").order("libelle"),
      supabase.from("pieces").select("*", { count: "exact", head: true }),
      supabase.from("ofs").select("*", { count: "exact", head: true }),
    ]);

  const profil = profilRes.data as unknown as Profil | null;
  const equipe = (equipeRes.data as unknown as Membre[] | null) ?? [];
  const secteurs = (secteursRes.data as Secteur[] | null) ?? [];
  const piecesCount = piecesCountRes.count ?? 0;
  const ofsCount = ofsCountRes.count ?? 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#003153]/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <span
              style={{ backgroundColor: "#CFB53B" }}
              className="flex h-9 w-9 items-center justify-center rounded-full text-black shadow-sm"
            >
              <IconGear className="h-5 w-5" />
            </span>
            <Brand subtitle="Paramètres" />
          </div>
          <Link
            href="/"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm transition hover:bg-white/5"
          >
            ← Retour
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 p-6 pt-8 sm:p-8 sm:pt-10">
        <Section
          title="Mon profil"
          description="Tes informations personnelles."
        >
          <div className="mb-5 grid gap-4 sm:grid-cols-3">
            <Field label="Email" value={profil?.email ?? user?.email ?? "—"} />
            <Field label="Rôle" value={profil?.role ?? "—"} />
            <Field label="Secteur" value={profil?.pole?.libelle ?? "—"} />
          </div>
          <ProfileForm
            prenom={profil?.prenom ?? ""}
            nom={profil?.nom ?? ""}
          />
        </Section>

        <Section
          title="Sécurité — code PIN"
          description="Le PIN confirme ton identité pour accepter un relais."
        >
          <PinForm pinDefini={Boolean(profil?.pin_hash)} />
        </Section>

        <Section
          title="Équipe"
          description={`${equipe.length} personne(s) dans l’atelier.`}
        >
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 bg-white/[0.03] text-left text-[11px] uppercase tracking-wider text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Rôle</th>
                  <th className="px-4 py-3 font-medium">Secteur</th>
                  <th className="px-4 py-3 font-medium">Actif</th>
                </tr>
              </thead>
              <tbody>
                {equipe.map((m) => (
                  <tr key={m.id} className="border-t border-white/5">
                    <td className="px-4 py-3 font-medium">
                      {m.prenom} {m.nom}
                    </td>
                    <td className="px-4 py-3 text-white/70">{m.role ?? "—"}</td>
                    <td className="px-4 py-3 text-white/70">
                      {m.pole ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: m.pole.couleur ?? "#6b7280",
                            }}
                          />
                          {m.pole.libelle}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {m.actif ? (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">
                          Actif
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">
                          Inactif
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section
          title="Secteurs"
          description="Référentiel des secteurs de l’atelier."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {secteurs.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-4 py-3"
              >
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: s.couleur ?? "#6b7280" }}
                />
                <span className="font-medium">{s.libelle}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Données" description="Vue d’ensemble de ton atelier.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/15 p-4">
              <div className="text-2xl font-semibold">{piecesCount}</div>
              <div className="text-sm text-white/50">Pièces</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/15 p-4">
              <div className="text-2xl font-semibold">{ofsCount}</div>
              <div className="text-sm text-white/50">OF importés</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/15 p-4">
              <div className="text-2xl font-semibold">{equipe.length}</div>
              <div className="text-sm text-white/50">Personnes</div>
            </div>
          </div>
        </Section>

        <Section title="À propos">
          <div className="space-y-1 text-sm text-white/60">
            <p>
              <span className="text-white/80">Relais</span> — suivi de pièces,
              relais entre établis et pointage du temps pour atelier horloger.
            </p>
            <p>Version v1 · registre d’événements immuable.</p>
          </div>
          <Link
            href="/showcase"
            className="mt-4 inline-block rounded-lg border border-white/15 px-3 py-1.5 text-sm transition hover:bg-white/5"
          >
            Voir le showcase (MagicBento) →
          </Link>
        </Section>
      </main>
    </div>
  );
}
