export function Logo({
  className,
  color = "#CDB06A",
}: {
  className?: string;
  color?: string;
}) {
  const gold = color;
  return (
    <span className={`inline-flex ${className ?? "h-10 w-10"}`}>
      {/* Engrenage + cadran horloger, doré (inspiré du logo Tymios) */}
      <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>
        {/* Dents d'engrenage : anneau épais en pointillés */}
        <circle
          cx="24"
          cy="24"
          r="19"
          fill="none"
          stroke={gold}
          strokeWidth="6"
          strokeDasharray="3.1 3.4"
        />
        {/* Cadran */}
        <circle
          cx="24"
          cy="24"
          r="14.5"
          fill="#0e1422"
          stroke={gold}
          strokeWidth="2"
        />
        {/* Quelques index */}
        <g stroke={gold} strokeWidth="1.4" strokeLinecap="round">
          <line x1="24" y1="11.5" x2="24" y2="14" />
          <line x1="24" y1="34" x2="24" y2="36.5" />
          <line x1="11.5" y1="24" x2="14" y2="24" />
          <line x1="34" y1="24" x2="36.5" y2="24" />
        </g>
        {/* Aiguilles */}
        <g stroke={gold} strokeWidth="2" strokeLinecap="round">
          <line x1="24" y1="24" x2="24" y2="16.5" />
          <line x1="24" y1="24" x2="29.5" y2="24" />
        </g>
        <circle cx="24" cy="24" r="1.7" fill={gold} />
      </svg>
    </span>
  );
}

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Logo />
      <div className="leading-tight">
        <div
          className="font-display text-xl font-semibold tracking-tight"
          style={{ color: "#CDB06A" }}
        >
          Tymios
        </div>
        {subtitle ? (
          <div className="text-xs text-white/45">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
