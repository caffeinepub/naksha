/**
 * Preferences — async storage shim.
 *
 * On Capacitor native: delegates to @capacitor/preferences (dynamic import).
 * On web / browser: falls back to localStorage with an `nk_pref_` prefix.
 *
 * API surface mirrors @capacitor/preferences exactly so the rest of the
 * codebase never needs to change when running in either environment.
 *
 * The `@capacitor/preferences` import is done via Function constructor to
 * prevent Rollup/Vite from attempting to resolve it at build time — the
 * package is only present at runtime inside the Capacitor Android shell.
 */

import { isCapacitorNative } from "./capacitorStorage";

const PREFIX = "nk_pref_";

function prefKey(key: string): string {
  return `${PREFIX}${key}`;
}

/** Dynamic import that bypasses Rollup module resolution at build time */
async function dynamicImport(pkg: string): Promise<any> {
  return new Function("p", "return import(p)")(pkg);
}

/** localStorage-backed shim with the same API as @capacitor/preferences */
const localStorageShim = {
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

/** Resolves to the real @capacitor/preferences on native, shim on web. */
async function getPlatformPreferences() {
  if (isCapacitorNative()) {
    try {
      const { Preferences: CapPrefs } = await dynamicImport(
        "@capacitor/preferences",
      );
      return CapPrefs;
    } catch {
      // Package not available — fall through to shim
    }
  }
  return localStorageShim;
}

export const Preferences = {
  async set({ key, value }: { key: string; value: string }): Promise<void> {
    const prefs = await getPlatformPreferences();
    return prefs.set({ key, value });
  },

  async get({ key }: { key: string }): Promise<{ value: string | null }> {
    const prefs = await getPlatformPreferences();
    return prefs.get({ key });
  },

  async remove({ key }: { key: string }): Promise<void> {
    const prefs = await getPlatformPreferences();
    return prefs.remove({ key });
  },

  async clear(): Promise<void> {
    const prefs = await getPlatformPreferences();
    return prefs.clear();
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

/**
 * Sync all critical app state from localStorage into Preferences.
 * This ensures state survives Android WebView restarts and works 100% offline.
 * Called after every syncToLocalAndIDB write.
 */
export async function syncAllStateToPreferences(): Promise<void> {
  const keys = [
    "nk_subjects",
    "nk_chapters",
    "nk_topics",
    "nk_todos",
    "nk_sessions",
    "nk_timerState",
    "nk_theme",
    "nk_username",
    "nk_appearance",
    "nk_projects",
  ];

  await Promise.all(
    keys.map(async (lsKey) => {
      try {
        const raw = localStorage.getItem(lsKey);
        if (raw !== null) {
          await Preferences.set({ key: lsKey, value: raw });
        }
      } catch {
        // Fail silently per key — don't block other keys
      }
    }),
  );
}
