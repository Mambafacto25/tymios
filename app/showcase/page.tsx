import Link from "next/link";
import MagicBento from "@/components/magic-bento/MagicBento";

export default function ShowcasePage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Showcase</h1>
            <p className="text-sm text-white/55">
              Composant MagicBento (React Bits) — démonstration.
            </p>
          </div>
          <Link
            href="/parametres"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm transition hover:bg-white/5"
          >
            ← Retour
          </Link>
        </div>

        <div className="flex justify-center">
          <MagicBento
            textAutoHide={true}
            enableStars={true}
            enableSpotlight={true}
            enableBorderGlow={true}
            enableTilt
            enableMagnetism={true}
            clickEffect={true}
            spotlightRadius={190}
            particleCount={12}
            glowColor="132, 0, 255"
          />
        </div>
      </div>
    </div>
  );
}
