/** Sous-cadran chronographe « nuit » : index, arc lumineux, moyeu central,
 *  et une aiguille qui balaie quand le chrono tourne (live). */
export function Dial({
  progress,
  color,
  label,
  live = false,
}: {
  progress: number;
  color: string;
  label: string;
  live?: boolean;
}) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const off = c * (1 - p);
  // Position de la pointe lumineuse de l'arc.
  const ang = (p * 360 - 90) * (Math.PI / 180);
  const tipX = 20 + r * Math.cos(ang);
  const tipY = 20 + r * Math.sin(ang);
  const showTip = p > 0.001 && p < 0.999;

  // 12 index horaires.
  const ticks = Array.from({ length: 12 }, (_, i) => i);
  const uid = `dial-${color.replace("#", "")}`;

  return (
    <span className="relative inline-flex h-11 w-11 items-center justify-center">
      <svg viewBox="0 0 40 40" className="h-11 w-11">
        <defs>
          <radialGradient id={`${uid}-face`} cx="38%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#1b263f" />
            <stop offset="100%" stopColor="#0b1120" />
          </radialGradient>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.1" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Cadran */}
        <circle cx="20" cy="20" r="19" fill={`url(#${uid}-face)`} stroke="rgba(255,255,255,.08)" strokeWidth="1" />

        {/* Index horaires */}
        <g stroke="rgba(255,255,255,.22)" strokeLinecap="round">
          {ticks.map((i) => {
            const a = (i * 30 - 90) * (Math.PI / 180);
            const inner = i % 3 === 0 ? 14.2 : 15.4;
            return (
              <line
                key={i}
                x1={20 + inner * Math.cos(a)}
                y1={20 + inner * Math.sin(a)}
                x2={20 + 16.8 * Math.cos(a)}
                y2={20 + 16.8 * Math.sin(a)}
                strokeWidth={i % 3 === 0 ? 1.1 : 0.7}
              />
            );
          })}
        </g>

        {/* Piste + arc d'avancement */}
        <g transform="rotate(-90 20 20)">
          <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,.10)" strokeWidth="2.6" />
          <circle
            cx="20"
            cy="20"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={off}
            filter={`url(#${uid}-glow)`}
            style={{ transition: "stroke-dashoffset .45s cubic-bezier(.16,1,.3,1)" }}
          />
        </g>

        {/* Pointe lumineuse */}
        {showTip ? (
          <circle cx={tipX} cy={tipY} r="1.7" fill={color} filter={`url(#${uid}-glow)`} />
        ) : null}

        {/* Aiguille de balayage (chrono en cours) */}
        {live ? (
          <g>
            <line x1="20" y1="20" x2="20" y2="6.5" stroke={color} strokeWidth="0.9" strokeLinecap="round" opacity="0.9">
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 20 20"
                to="360 20 20"
                dur="3s"
                repeatCount="indefinite"
              />
            </line>
          </g>
        ) : null}

        {/* Moyeu central */}
        <circle cx="20" cy="20" r="2.4" fill="#0b1120" stroke={color} strokeWidth="0.9" />
        <circle cx="20" cy="20" r="0.9" fill={color} />
      </svg>

      <span className="absolute rounded-full bg-[#0b1120]/80 px-1 text-[9px] font-semibold leading-none tabular-nums text-white/90 shadow-sm ring-1 ring-white/10">
        {label}
      </span>
    </span>
  );
}
