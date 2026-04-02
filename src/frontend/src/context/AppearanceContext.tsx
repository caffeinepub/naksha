import type React from "react";
import { createContext, useCallback, useContext, useState } from "react";
import type { AppearanceSettings } from "../types";
import { getAppearance, saveAppearance } from "../utils/storage";

interface AppearanceCtx {
  appearance: AppearanceSettings;
  setAppearance: (s: AppearanceSettings) => void;
}

const AppearanceContext = createContext<AppearanceCtx>({
  appearance: getAppearance(),
  setAppearance: () => {},
});

export function AppearanceProvider({
  children,
}: { children: React.ReactNode }) {
  const [appearance, setApp] = useState<AppearanceSettings>(getAppearance());

  const setAppearance = useCallback((s: AppearanceSettings) => {
    saveAppearance(s);
    setApp(s);
  }, []);

  return (
    <AppearanceContext.Provider value={{ appearance, setAppearance }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
