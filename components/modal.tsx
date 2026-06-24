"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
};

/** Fenêtre modale (pop-up) : fond assombri, fermeture par ✕, clic extérieur ou Échap. */
export function Modal({ open, onClose, title, children }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-2xl rounded-2xl border border-white/15 bg-[#012a55] shadow-2xl shadow-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-md px-2 py-1 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[78vh] overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
}
