/**
 * Preferences — async localStorage-backed shim.
 *
 * This mirrors the @capacitor/preferences API surface exactly:
 *   set({ key, value }), get({ key }), remove({ key }), clear()
 *
 * Because it wraps localStorage, all data survives app restarts on
 * both browser and Android WebView. When moving to a real Capacitor
 * build, swap this module for @capacitor/preferences with no other
 * changes needed.
 */

const PREFIX = "nk_pref_";

function prefKey(key: string): string {
  return `${PREFIX}${key}`;
}

export const Preferences = {
  async set({ key, value }: { key: string; value: string }): Promise<void> {
    try {
      localStorage.setItem(prefKey(key), value);
    } catch {
      // Storage full or unavailable — fail silently
    }
  },

  async get({ key }: { key: string }): Promise<{ value: string | null }> {
    try {
      return { value: localStorage.getItem(prefKey(key)) };
    } catch {
      return { value: null };
    }
  },

  async remove({ key }: { key: string }): Promise<void> {
    try {
      localStorage.removeItem(prefKey(key));
    } catch {
      // Fail silently
    }
  },

  async clear(): Promise<void> {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(PREFIX)) toRemove.push(k);
      }
      for (const k of toRemove) localStorage.removeItem(k);
    } catch {
      // Fail silently
    }
  },
};

// Convenience typed helpers for the critical settings that must
// survive Android WebView restarts.
export const PREF_KEYS = {
  folderName: "folderName",
  username: "username",
  theme: "theme",
  permissionsAsked: "permissionsAsked",
  onboardingDone: "onboardingDone",
} as const;
