"use client";

import { useState } from "react";
import { setTauxHoraireAction } from "@/app/actions/pieces";

type Secteur = {
  id: number;
  libelle: string;
  couleur: string | null;
  taux_horaire?: number;
};

function Ligne({ s, isChef }: { s: Secteur; isChef: boolean }) {
  const [taux, setTaux] = useState(String(s.taux_horaire ?? 0));
  const [saved, setSaved] = useState<number>(s.taux_horaire ?? 0);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = Number(taux) !== saved;

  async function save() {
    const n = Number(taux);
    if (!Number.isFinite(n) || n < 0) {
      setMsg("Invalide");
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await setTauxHoraireAction(s.id, n);
    setBusy(false);
    if (error) {
      setMsg(error);
    } else {
      setSaved(n);
      setMsg("Enregistré ✓");
      setTimeout(() => setMsg(null), 1800);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-4 py-3">
      <span
        className="inline-block h-3 w-3 shrink-0 rounded-full"
        style={{ backgroundColor: s.couleur ?? "#6b7280" }}
      />
      <span className="min-w-0 flex-1 truncate font-medium">{s.libelle}</span>
      {isChef ? (
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="number"
              min={0}
              step={1}
              value={taux}
              onChange={(e) => setTaux(e.target.value)}
              className="w-24 rounded-lg border border-white/15 bg-black/30 py-1.5 pl-3 pr-9 text-right text-sm tabular-nums outline-none focus:border-[#CFB53B]/60"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40">
              €/h
            </span>
          </div>
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="rounded-lg border border-[#CFB53B]/50 px-3 py-1.5 text-xs font-medium text-[#F0D879] transition hover:bg-[#CFB53B]/10 disabled:opacity-40"
          >
            {busy ? "…" : "OK"}
          </button>
          {msg ? (
            <span className="text-xs text-white/55">{msg}</span>
          ) : null}
        </div>
      ) : (
        <span className="text-sm text-white/55 tabular-nums">
          {s.taux_horaire ? `${s.taux_horaire} €/h` : "— €/h"}
        </span>
      )}
    </div>
  );
}

export function SecteursTaux({
  secteurs,
  isChef,
}: {
  secteurs: Secteur[];
  isChef: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {secteurs.map((s) => (
        <Ligne key={s.id} s={s} isChef={isChef} />
      ))}
    </div>
  );
}
