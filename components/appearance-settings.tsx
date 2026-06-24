"use client";

import { usePreferences } from "@/components/preferences-provider";

const COLORS = [
  { label: "Blanc", value: "" },
  { label: "Or doux", value: "#F0D879" },
  { label: "Bleu clair", value: "#9FD0FF" },
  { label: "Gris clair", value: "#CBD5E1" },
];

const FONTS = [
  { label: "Standard", value: "sans" },
  { label: "Serif", value: "serif" },
  { label: "Monospace", value: "mono" },
  { label: "Arrondie", value: "rounded" },
];

export function AppearanceSettings({
  secteurs,
}: {
  secteurs: { libelle: string }[];
}) {
  const { prefs, setPrefs } = usePreferences();

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-sm text-white/70">Couleur du texte</div>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => {
            const active = prefs.textColor === c.value;
            return (
              <button
                key={c.label}
                onClick={() => setPrefs({ textColor: c.value })}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-[#CFB53B] bg-[#CFB53B]/15"
                    : "border-white/15 hover-gold"
                }`}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full border border-white/20"
                  style={{ backgroundColor: c.value || "#eaf2fb" }}
                />
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm text-white/70">Police</div>
        <div className="flex flex-wrap gap-2">
          {FONTS.map((f) => {
            const active = prefs.font === f.value;
            const sample =
              f.value === "serif"
                ? "Georgia, serif"
                : f.value === "mono"
                  ? "ui-monospace, monospace"
                  : f.value === "rounded"
                    ? '"Trebuchet MS", sans-serif'
                    : "ui-sans-serif, system-ui, sans-serif";
            return (
              <button
                key={f.value}
                onClick={() => setPrefs({ font: f.value })}
                style={{ fontFamily: sample }}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-[#CFB53B] bg-[#CFB53B]/15"
                    : "border-white/15 hover-gold"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm text-white/70">
          Secteur affiché par défaut
        </div>
        <select
          value={prefs.secteurDefaut}
          onChange={(e) => setPrefs({ secteurDefaut: e.target.value })}
          className="w-full max-w-xs rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none sm:w-72"
        >
          <option value="">Tous les secteurs</option>
          {secteurs.map((s) => (
            <option key={s.libelle} value={s.libelle}>
              {s.libelle}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-white/45">
          Le tableau de bord s’ouvrira filtré sur ce secteur.
        </p>
      </div>
    </div>
  );
}
