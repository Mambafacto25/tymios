export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-600 shadow-md shadow-indigo-900/40 ${className ?? "h-9 w-9"}`}
    >
      {/* Cadran horloger + aiguille de relais */}
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
      <span
        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#191970]"
        style={{ backgroundColor: "#CFB53B" }}
      />
    </span>
  );
}

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div className="leading-tight">
        <div className="font-display text-xl font-semibold tracking-tight">
          Tymios
        </div>
        {subtitle ? (
          <div className="text-xs text-white/45">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
