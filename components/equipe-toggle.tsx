"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setUserActifAction, deleteUserAction } from "@/app/actions/profile";
import { useNotify } from "@/components/notify";

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
  const { confirm, toast } = useNotify();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const verbe = actif ? "Désactiver" : "Réactiver";
    const ok = await confirm({
      title: `${verbe} ce compte ?`,
      message: `${verbe.toLowerCase()} le compte de ${nom}.`,
      confirmLabel: verbe,
      emblem: actif ? "❚❚" : "▶",
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await setUserActifAction(userId, !actif);
    setBusy(false);
    if (error) return toast.error("Action impossible", error);
    toast.success(actif ? "Compte désactivé" : "Compte réactivé", nom);
    router.refresh();
  }

  async function supprimer() {
    const ok = await confirm({
      title: "Supprimer définitivement ?",
      message: `Le compte de ${nom} sera effacé : fiche, accès, pointages et événements. Ses pièces seront détachées. Cette action est irréversible — assure-toi d'avoir réattribué ses pièces.`,
      confirmLabel: "Supprimer",
      cancelLabel: "Conserver",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    const { error } = await deleteUserAction(userId);
    setBusy(false);
    if (error) return toast.error("Suppression impossible", error);
    toast.success("Compte supprimé", `${nom} a été retiré de l'atelier.`);
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
    </span>
  );
}
