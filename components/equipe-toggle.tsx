"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUserActifAction } from "@/app/actions/profile";

export function EquipeToggle({
  userId,
  actif,
  nom,
}: {
  userId: string;
  actif: boolean;
  nom: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function toggle() {
    const verbe = actif ? "désactiver" : "réactiver";
    if (!window.confirm(`Confirmer : ${verbe} le compte de ${nom} ?`)) return;
    setBusy(true);
    setErr(null);
    const { error } = await setUserActifAction(userId, !actif);
    setBusy(false);
    if (error) return setErr(error);
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={busy}
        className={`rounded-md border px-2.5 py-1 text-xs transition disabled:opacity-50 ${
          actif
            ? "border-red-500/40 text-red-300 hover:bg-red-500/10"
            : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
        }`}
      >
        {busy ? "…" : actif ? "Désactiver" : "Réactiver"}
      </button>
      {err ? <span className="text-xs text-red-300">{err}</span> : null}
    </span>
  );
}
