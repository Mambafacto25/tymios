export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 text-sm font-bold text-white shadow-sm shadow-indigo-500/30">
        R
      </span>
      <div className="leading-tight">
        <div className="text-base font-semibold tracking-tight">Relais</div>
        {subtitle ? (
          <div className="text-xs text-white/45">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
