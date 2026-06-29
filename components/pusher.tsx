"use client";

import type { CSSProperties, ReactNode } from "react";

/* Bouton « poussoir de chronographe » — tactile, dégradé, liseré, halo.
   Remplace les pastilles plates par des poussoirs d'instrument de précision. */

function hexToRgb(h: string): [number, number, number] {
  const x = h.replace("#", "");
  return [
    parseInt(x.slice(0, 2), 16),
    parseInt(x.slice(2, 4), 16),
    parseInt(x.slice(4, 6), 16),
  ];
}
function mix(hex: string, target: string, amt: number): string {
  const a = hexToRgb(hex);
  const b = hexToRgb(target);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * amt));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function Pusher({
  tone,
  title,
  onClick,
  children,
  live = false,
  ink = "#0e1422",
  size = 30,
}: {
  tone: string;
  title: string;
  onClick: () => void;
  children: ReactNode;
  live?: boolean;
  ink?: string;
  size?: number;
}) {
  const light = mix(tone, "#ffffff", 0.4);
  const dark = mix(tone, "#000000", 0.32);
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`pusher relative flex shrink-0 items-center justify-center rounded-full ${
        live ? "pusher-live" : ""
      }`}
      style={
        {
          height: size,
          width: size,
          background: `radial-gradient(125% 125% at 32% 22%, ${light} 0%, ${tone} 42%, ${dark} 100%)`,
          boxShadow: `inset 0 1px 1.5px rgba(255,255,255,.55), inset 0 -2px 4px rgba(0,0,0,.38), 0 3px 9px -2px ${tone}99, 0 0 0 1px ${tone}55`,
          ["--tone" as string]: tone,
          color: ink,
        } as CSSProperties
      }
    >
      <span className="relative z-10 flex items-center justify-center">
        {children}
      </span>
    </button>
  );
}
