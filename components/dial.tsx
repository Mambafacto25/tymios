/** Sous-cadran chronographe : arc d'avancement + libellé (temps) au centre. */
export function Dial({
  progress,
  color,
  label,
}: {
  progress: number;
  color: string;
  label: string;
}) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, progress)));
  return (
    <span className="relative inline-flex h-11 w-11 items-center justify-center">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="3"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          style={{ transition: "stroke-dashoffset .4s ease" }}
        />
      </svg>
      <span className="absolute text-[10px] font-medium tabular-nums text-white/85">
        {label}
      </span>
    </span>
  );
}
