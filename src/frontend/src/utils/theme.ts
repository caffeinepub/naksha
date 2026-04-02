// This file is kept for legacy compatibility.
// The primary theming is now done via palettes.ts and ThemeContext.tsx
// All theme logic has been migrated to the 12-palette system.

import type { PaletteId, ThemeColors } from "../types";
import { PALETTES, paletteToThemeColors } from "./palettes";

export function getThemeColors(id: PaletteId): ThemeColors {
  return paletteToThemeColors(PALETTES[id] ?? PALETTES["spotify-green"]);
}
