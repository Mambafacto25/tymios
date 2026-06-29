import { BrandMark } from "@/components/brand";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6">
      <BrandMark size={96} />
      <div className="font-display gold-shimmer text-2xl font-semibold tracking-tight">
        Tymios
      </div>
      <div className="h-0.5 w-40 overflow-hidden rounded-full bg-white/10">
        <div className="loading-bar h-full w-1/3 rounded-full" />
      </div>
      <p className="text-sm text-white/40">Chargement de l’atelier…</p>
    </div>
  );
}
