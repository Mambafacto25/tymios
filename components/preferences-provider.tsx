"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Prefs = {
  textColor: string; // "" = défaut
  font: string; // sans | serif | mono | rounded
  secteurDefaut: string; // "" = tous
};

const DEFAULT: Prefs = { textColor: "", font: "sans", secteurDefaut: "" };
const STORAGE_KEY = "relais-prefs";

const Ctx = createContext<{
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
}>({ prefs: DEFAULT, setPrefs: () => {} });

export function usePreferences() {
  return useContext(Ctx);
}

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [prefs, setState] = useState<Prefs>(DEFAULT);

  // Charge les préférences sauvegardées au montage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {
      // ignore
    }
  }, []);

  // Applique police + couleur de texte à <html>.
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.textColor) root.style.setProperty("--fg", prefs.textColor);
    else root.style.removeProperty("--fg");
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
