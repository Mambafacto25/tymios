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
      className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="dialog-pop guilloche relative my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-[#CFB53B]/35 bg-[#141d33] shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow:
            "0 30px 80px -20px rgba(0,0,0,.8), 0 0 0 1px rgba(207,181,59,.14), 0 0 40px -12px rgba(207,181,59,.4)",
        }}
      >
        <div className="relative flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="font-display text-lg font-semibold tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-md px-2 py-1 text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="relative max-h-[78vh] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
