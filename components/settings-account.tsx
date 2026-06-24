"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfileAction } from "@/app/actions/profile";
import { setMyPinAction } from "@/app/actions/pieces";

export function ProfileForm({
  prenom: prenomInit,
  nom: nomInit,
}: {
  prenom: string;
  nom: string;
}) {
  const router = useRouter();
  const [prenom, setPrenom] = useState(prenomInit);
  const [nom, setNom] = useState(nomInit);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    const { error } = await updateProfileAction(prenom, nom);
    setBusy(false);
    if (error) return setMsg(`Erreur : ${error}`);
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
