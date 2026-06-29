"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

/* ------------------------------------------------------------------ *
 *  Système de notifications « cadran nuit » — toasts + dialogues.
 *  Un seul provider, une seule API : useNotify() → { toast, confirm, prompt }.
 *  - Les toasts portent un mini-chronographe qui décompte leur durée de vie.
 *  - confirm()/prompt() renvoient des Promesses (remplacent window.confirm/prompt).
 * ------------------------------------------------------------------ */

type ToastVariant = "success" | "error" | "info" | "gold";

type ToastItem = {
  id: number;
  variant: ToastVariant;
  title: string;
  message?: string;
  duration: number;
};

type ConfirmOpts = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  emblem?: string;
};

type PromptOpts = {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: "text" | "number" | "password";
  inputMode?: "text" | "numeric";
  validate?: (value: string) => string | null;
  emblem?: string;
};

type DialogState =
  | { kind: "confirm"; opts: ConfirmOpts; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOpts; resolve: (v: string | null) => void }
  | null;

type NotifyApi = {
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    gold: (title: string, message?: string) => void;
  };
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
  prompt: (opts: PromptOpts) => Promise<string | null>;
};

const DURATIONS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4200,
  gold: 5000,
  error: 6000,
};

const VARIANTS: Record<
  ToastVariant,
  { ring: string; glow: string; icon: string; chip: string }
> = {
  success: { ring: "#34d399", glow: "rgba(52,211,153,.30)", icon: "✓", chip: "rgba(52,211,153,.14)" },
  error: { ring: "#f87171", glow: "rgba(248,113,113,.30)", icon: "!", chip: "rgba(248,113,113,.14)" },
  info: { ring: "#7aa2ff", glow: "rgba(122,162,255,.30)", icon: "i", chip: "rgba(122,162,255,.14)" },
  gold: { ring: "#F0D879", glow: "rgba(240,216,121,.42)", icon: "✦", chip: "rgba(207,181,59,.18)" },
};

const NotifyContext = createContext<NotifyApi | null>(null);

export function useNotify(): NotifyApi {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error("useNotify doit être utilisé dans <NotifyProvider>.");
  return ctx;
}

let counter = 0;

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<DialogState>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, title: string, message?: string) => {
    counter += 1;
    const id = counter;
    setToasts((list) => [
      ...list.slice(-3), // garde la pile raisonnable
      { id, variant, title, message, duration: DURATIONS[variant] },
    ]);
  }, []);

  const api: NotifyApi = {
    toast: {
      success: (t, m) => push("success", t, m),
      error: (t, m) => push("error", t, m),
      info: (t, m) => push("info", t, m),
      gold: (t, m) => push("gold", t, m),
    },
    confirm: (opts) =>
      new Promise<boolean>((resolve) =>
        setDialog({ kind: "confirm", opts, resolve }),
      ),
    prompt: (opts) =>
      new Promise<string | null>((resolve) =>
        setDialog({ kind: "prompt", opts, resolve }),
      ),
  };

  return (
    <NotifyContext.Provider value={api}>
      {children}

      {/* Pile de toasts (bas-droite) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-end gap-3 p-4 sm:p-6">
        {toasts.map((t) => (
          <ToastCard key={t.id} t={t} onDismiss={dismiss} />
        ))}
      </div>

      {/* Dialogue (confirm / prompt) */}
      {dialog ? (
        <DialogHost dialog={dialog} onClose={() => setDialog(null)} />
      ) : null}
    </NotifyContext.Provider>
  );
}

/* ----------------------------- TOAST ------------------------------ */

function ToastCard({
  t,
  onDismiss,
}: {
  t: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const [leaving, setLeaving] = useState(false);
  const v = VARIANTS[t.variant];
  const r = 17;
  const circ = 2 * Math.PI * r;

  const close = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => onDismiss(t.id), 240);
  }, [leaving, onDismiss, t.id]);

  return (
    <div
      className={`toast-card pointer-events-auto group relative flex w-80 max-w-[88vw] items-start gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 ${
        leaving ? "toast-out" : "toast-in"
      }`}
      style={
        {
          borderColor: `${v.ring}55`,
          background: "rgba(18,26,46,.92)",
          boxShadow: `0 14px 40px -12px rgba(0,0,0,.7), 0 0 0 1px ${v.ring}22, 0 0 26px -6px ${v.glow}`,
          backdropFilter: "blur(14px)",
        } as CSSProperties
      }
    >
      {/* liseré lumineux qui balaie à l'entrée */}
      <span className="toast-shimmer pointer-events-none absolute inset-0" />

      {/* Emblème : mini-chronographe qui décompte */}
      <span
        className={`relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          t.variant === "gold" ? "sceau-pop" : ""
        }`}
        style={{ background: v.chip }}
      >
        <svg viewBox="0 0 40 40" className="absolute h-11 w-11 -rotate-90">
          <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="2.5" />
          <circle
            className="toast-ring"
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke={v.ring}
            strokeWidth="2.5"
            strokeLinecap="round"
            onAnimationEnd={close}
            style={
              {
                strokeDasharray: circ,
                ["--circ" as string]: circ,
                animationDuration: `${t.duration}ms`,
              } as CSSProperties
            }
          />
        </svg>
        <span
          className="font-display text-lg font-semibold leading-none"
          style={{ color: v.ring }}
        >
          {v.icon}
        </span>
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="font-display text-sm font-semibold tracking-tight text-white">
          {t.title}
        </div>
        {t.message ? (
          <div className="mt-0.5 text-[13px] leading-snug text-white/60">
            {t.message}
          </div>
        ) : null}
      </div>

      <button
        onClick={close}
        aria-label="Fermer"
        className="mt-0.5 shrink-0 rounded-md px-1.5 text-white/30 opacity-0 transition hover:text-white/80 group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

/* ---------------------------- DIALOG ------------------------------ */

function DialogHost({
  dialog,
  onClose,
}: {
  dialog: NonNullable<DialogState>;
  onClose: () => void;
}) {
  const isPrompt = dialog.kind === "prompt";
  const opts = dialog.opts;
  const danger = dialog.kind === "confirm" && dialog.opts.danger;
  const [value, setValue] = useState(
    isPrompt ? (dialog.opts as PromptOpts).defaultValue ?? "" : "",
  );
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const accent = danger ? "#f87171" : "#CFB53B";
  const emblem =
    opts.emblem ?? (danger ? "⚠" : isPrompt ? "✎" : "✦");

  const cancel = useCallback(() => {
    if (dialog.kind === "confirm") dialog.resolve(false);
    else dialog.resolve(null);
    onClose();
  }, [dialog, onClose]);

  const accept = useCallback(() => {
    if (dialog.kind === "prompt") {
      const p = dialog.opts;
      const e = p.validate ? p.validate(value) : null;
      if (e) {
        setErr(e);
        return;
      }
      dialog.resolve(value);
    } else {
      dialog.resolve(true);
    }
    onClose();
  }, [dialog, value, onClose]);

  // Verrou du défilement + focus initial : une seule fois.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    const id = setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(id);
    };
  }, []);

  // Raccourcis clavier (Entrée / Échap) — relié aux dernières valeurs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        accept();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cancel, accept]);

  return (
    <div
      className="dialog-backdrop fixed inset-0 z-[70] flex items-center justify-center p-4"
      onMouseDown={cancel}
    >
      <div
        className="dialog-pop guilloche relative w-full max-w-md overflow-hidden rounded-3xl p-7 text-center"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: "#141d33",
          border: `1px solid ${accent}66`,
          boxShadow: `0 30px 80px -20px rgba(0,0,0,.8), 0 0 0 1px ${accent}22, 0 0 40px -10px ${accent}55`,
        }}
      >
        {/* Sceau / emblème */}
        <div
          className="sceau-pop relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
          style={{
            background: danger
              ? "radial-gradient(circle at 35% 30%, #fca5a5, #b91c1c)"
              : "radial-gradient(circle at 35% 30%, #F6E7A8, #CFB53B 55%, #9c7e22)",
            boxShadow: `0 6px 18px -4px ${accent}88, inset 0 1px 1px rgba(255,255,255,.4)`,
          }}
        >
          <span
            className="font-display text-2xl font-bold leading-none"
            style={{ color: danger ? "#3a0c0c" : "#2a2200" }}
          >
            {emblem}
          </span>
          <span
            className="pointer-events-none absolute -inset-1 rounded-full"
            style={{ boxShadow: `0 0 0 1px ${accent}44` }}
          />
        </div>

        <h3 className="font-display text-xl font-semibold tracking-tight text-white">
          {opts.title}
        </h3>
        {opts.message ? (
          <p className="mx-auto mt-2 max-w-sm whitespace-pre-line text-sm leading-relaxed text-white/65">
            {opts.message}
          </p>
        ) : null}

        {isPrompt ? (
          <div className="mt-5 text-left">
            {(dialog.opts as PromptOpts).label ? (
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-white/45">
                {(dialog.opts as PromptOpts).label}
              </label>
            ) : null}
            <input
              ref={inputRef}
              type={(dialog.opts as PromptOpts).type ?? "text"}
              inputMode={(dialog.opts as PromptOpts).inputMode}
              value={value}
              placeholder={(dialog.opts as PromptOpts).placeholder}
              onChange={(e) => {
                setValue(e.target.value);
                if (err) setErr(null);
              }}
              className="w-full rounded-xl border border-white/12 bg-black/30 px-4 py-2.5 text-center text-base outline-none transition focus:border-[#CFB53B]/70"
            />
            {err ? (
              <p className="mt-1.5 text-center text-xs text-red-300">{err}</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={cancel}
            className="hover-gold rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80"
          >
            {opts.cancelLabel ?? "Annuler"}
          </button>
          <button
            onClick={accept}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold shadow-lg transition hover:brightness-105 active:brightness-95"
            style={{
              background: danger
                ? "linear-gradient(180deg,#f87171,#dc2626)"
                : "linear-gradient(180deg,#F0D879 0%,#E6C84D 45%,#CFB53B 100%)",
              color: danger ? "#fff" : "#2a2200",
            }}
          >
            {opts.confirmLabel ?? (danger ? "Supprimer" : "Confirmer")}
          </button>
        </div>
      </div>
    </div>
  );
}
