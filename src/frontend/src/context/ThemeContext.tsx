import type React from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Palette, PaletteId, ThemeColors } from "../types";
import { PALETTES, getPalette, paletteToThemeColors } from "../utils/palettes";

function getSavedPalette(): PaletteId {
  try {
    const saved = localStorage.getItem("nk_theme");
    if (saved && saved in PALETTES) return saved as PaletteId;
  } catch {}
  return "spotify-green";
}

function savePaletteToStorage(id: PaletteId): void {
  try {
    localStorage.setItem("nk_theme", id);
  } catch {}
}

function applyPaletteToCSSVars(p: Palette): void {
  const root = document.documentElement;
  root.style.setProperty("--accent", p.accent);
  root.style.setProperty("--accent-glow", p.accentGlow);
  root.style.setProperty("--bg", p.bg);
  root.style.setProperty("--surface", p.surface);
  root.style.setProperty("--text", p.text);
  root.style.setProperty("--text-muted", p.textMuted);
  root.style.setProperty("--border", p.border);
  // Update body background to match palette
  document.body.style.background = p.bg;
}

interface ThemeCtx {
  paletteId: PaletteId;
  palette: Palette;
  theme: ThemeColors; // legacy compatibility
  themeId: PaletteId; // legacy compat
  setPalette: (id: PaletteId) => void;
  setTheme: (id: PaletteId) => void; // legacy compat
}

const ThemeContext = createContext<ThemeCtx>({
  paletteId: "spotify-green",
  palette: getPalette("spotify-green"),
  theme: paletteToThemeColors(getPalette("spotify-green")),
  themeId: "spotify-green",
  setPalette: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [paletteId, setPaletteId] = useState<PaletteId>(getSavedPalette);
  const palette = getPalette(paletteId);

  useEffect(() => {
    applyPaletteToCSSVars(palette);
  }, [palette]);

  // Apply on initial mount
  useEffect(() => {
    applyPaletteToCSSVars(getPalette(getSavedPalette()));
  }, []);

  const setPalette = useCallback((id: PaletteId) => {
    savePaletteToStorage(id);
    setPaletteId(id);
    applyPaletteToCSSVars(getPalette(id));
  }, []);

  const theme = paletteToThemeColors(palette);

  return (
    <ThemeContext.Provider
      value={{
        paletteId,
        palette,
        theme,
        themeId: paletteId,
        setPalette,
        setTheme: setPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function usePalette() {
  const { palette, paletteId, setPalette } = useContext(ThemeContext);
  return { palette, paletteId, setPalette };
}
