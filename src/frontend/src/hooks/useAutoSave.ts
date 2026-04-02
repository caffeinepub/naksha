import { useCallback, useRef } from "react";
import { useBackup } from "../context/BackupContext";

/**
 * Returns a `triggerAutoSave` function. Call it after any state mutation.
 * It debounces 2 seconds, then fires a full sync (localStorage + IDB + file if linked).
 */
export function useAutoSave() {
  const { triggerFullSync } = useBackup();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutoSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      triggerFullSync();
    }, 2000);
  }, [triggerFullSync]);

  return { triggerAutoSave };
}
