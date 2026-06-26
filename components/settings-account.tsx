"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/app/actions/profile";
import { setMyPinAction } from "@/app/actions/pieces";
import { usePreferences } from "@/components/preferences-provider";
import { ROLES, type Pole } from "@/lib/types";

export function ProfileForm({
  prenom: prenomInit,
  nom: nomInit,
  role: roleInit,
  poleId: poleIdInit,
  poles,
}: {
  prenom: string;
  nom: string;
  role: string | null;
  poleId: number | null;
  poles: Pole[];
}) {
  const router = useRouter();
  const { setPrefs } = usePreferences();
  const [prenom, setPrenom] = useState(prenomInit);
  const [nom, setNom] = useState(nomInit);
  const [role, setRole] = useState(roleInit ?? "");
  const [poleId, setPoleId] = useState<number | "">(poleIdInit ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const { error } = await updateProfileAction({
      prenom,
      nom,
      role: role || null,
      poleId: poleId === "" ? null : poleId,
    });
    setBusy(false);
    if (error) return setMsg(`Erreur : ${error}`);
    // Aligne le secteur affiché par défaut sur le secteur du profil.
    const lib = poles.find((p) => p.id === poleId)?.libelle ?? "";
    setPrefs({ secteurDefaut: lib });
    setMsg("Profil enregistré.");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-1.5">
        <span className="text-sm text-white/70">Prénom</span>
        <input
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none"
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-sm text-white/70">Nom</span>
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none"
        />
      </label>
      <label className="space-y-1.5">
        <span className="text-sm text-white/70">Rôle</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none"
        >
          <option value="">— choisir —</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="text-sm text-white/70">Secteur</span>
        <select
          value={poleId}
          onChange={(e) =>
            setPoleId(e.target.value ? Number(e.target.value) : "")
          }
          className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none"
        >
          <option value="">— choisir —</option>
          {poles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.libelle}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        {msg ? <span className="text-sm text-white/70">{msg}</span> : null}
      </div>
    </form>
  );
}

export function PinForm({ pinDefini }: { pinDefini: boolean }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!/^\d{4,8}$/.test(pin)) {
      return setMsg("Le PIN doit contenir 4 à 8 chiffres.");
    }
    setBusy(true);
    const { error } = await setMyPinAction(pin);
    setBusy(false);
    if (error) return setMsg(`Erreur : ${error}`);
    setMsg("PIN enregistré.");
    setPin("");
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <p className="text-sm text-white/60">
        {pinDefini
          ? "Un PIN est déjà défini. Tu peux le remplacer ci-dessous."
          : "Aucun PIN défini. Définis-en un pour accepter des relais."}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="password"
          inputMode="numeric"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Nouveau PIN (4 à 8 chiffres)"
          className="w-56 rounded-lg border border-white/10 bg-black/20 px-3 py-2 outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-50"
        >
          {busy ? "…" : pinDefini ? "Changer le PIN" : "Définir le PIN"}
        </button>
        {msg ? <span className="text-sm text-white/70">{msg}</span> : null}
      </div>
    </form>
  );
}
