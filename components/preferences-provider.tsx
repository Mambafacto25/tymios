"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Prefs = {
  textColor: string; // hex, "" = blanc par défaut
  intensite: number; // 0.5 – 1 (opacité du texte)
  luminosite: number; // 0.6 – 1.4 (clarté du texte)
  font: string; // sans | serif | mono | rounded
  secteurDefaut: string; // "" = tous
};

const DEFAULT: Prefs = {
  textColor: "",
  intensite: 1,
  luminosite: 1,
  font: "sans",
  secteurDefaut: "",
};
const STORAGE_KEY = "relais-prefs";

const Ctx = createContext<{
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
}>({ prefs: DEFAULT, setPrefs: () => {} });

export function usePreferences() {
  return useContext(Ctx);
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const int = parseInt(n || "eaf2fb", 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

export function computeTextColor(
  base: string,
  luminosite: number,
  intensite: number,
): string {
  const [r, g, b] = hexToRgb(base || "#eaf2fb");
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v * luminosite)));
  return `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${intensite})`;
}

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prefs, setState] = useState<Prefs>(DEFAULT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--fg",
      computeTextColor(prefs.textColor, prefs.luminosite, prefs.intensite),
    );
    root.dataset.font = prefs.font || "sans";
  }, [prefs]);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setState((prev) => {
      const next = { ...prev, ...p };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ prefs, setPrefs }}>{children}</Ctx.Provider>;
}
