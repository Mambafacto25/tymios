"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUserActifAction, deleteUserAction } from "@/app/actions/profile";

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

  async function supprimer() {
    if (
      !window.confirm(
        `Supprimer DÉFINITIVEMENT le compte de ${nom} ?\n\nIrréversible : la fiche, l'accès, les pointages et les événements de ce compte seront effacés, et ses pièces détachées. Assure-toi d'avoir réattribué/géré ses pièces en amont.`,
      )
    )
      return;
    setBusy(true);
    setErr(null);
    const { error } = await deleteUserAction(userId);
    setBusy(false);
    if (error) return setErr(error);
    router.refresh();
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        onClick={toggle}
        disabled={busy}
        className={`rounded-md border px-2.5 py-1 text-xs transition disabled:opacity-50 ${
          actif
            ? "border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
            : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
        }`}
      >
        {busy ? "…" : actif ? "Désactiver" : "Réactiver"}
      </button>
      <button
        onClick={supprimer}
        disabled={busy}
        className="rounded-md border border-red-500/50 px-2.5 py-1 text-xs text-red-300 transition hover:bg-red-500/15 disabled:opacity-50"
      >
        Supprimer
      </button>
      {err ? <span className="text-xs text-red-300">{err}</span> : null}
    </span>
  );
}
