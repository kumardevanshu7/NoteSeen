import { create } from "zustand";

export type Appearance = "light" | "dark" | "system";

const STORAGE_KEY = "noteseen.appearance";

function readStored(): Appearance {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    // ignore
  }
  return "light";
}

function resolveDark(appearance: Appearance): boolean {
  if (appearance === "dark") return true;
  if (appearance === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply(appearance: Appearance): boolean {
  const dark = resolveDark(appearance);
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(STORAGE_KEY, appearance);
  } catch {
    // ignore
  }
  return dark;
}

interface AppearanceState {
  appearance: Appearance;
  isDark: boolean;
  setAppearance: (appearance: Appearance) => void;
  toggle: () => void;
}

/**
 * Shared so every surface (top bar, palette) reads the same value; the class on
 * <html> is the single visual switch.
 */
export const useAppearance = create<AppearanceState>((set, get) => {
  const initial = readStored();

  if (typeof window !== "undefined") {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (get().appearance !== "system") return;
      set({ isDark: apply("system") });
    });
  }

  return {
    appearance: initial,
    isDark: resolveDark(initial),
    setAppearance(appearance) {
      set({ appearance, isDark: apply(appearance) });
    },
    toggle() {
      const next: Appearance = get().isDark ? "light" : "dark";
      set({ appearance: next, isDark: apply(next) });
    },
  };
});
