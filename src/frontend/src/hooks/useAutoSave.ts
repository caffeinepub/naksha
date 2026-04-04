import { useCallback, useRef } from "react";
import { useBackup } from "../context/BackupContext";
import { triggerCloudPush } from "../utils/cloudSyncBridge";

/**
 * Returns a `triggerAutoSave` function. Call it after any state mutation.
 * It debounces 2 seconds, then fires a full sync (localStorage + IDB + file if linked).
 * After the local save it also fires a cloud push (if logged in) — fire and forget.
 */
export function useAutoSave() {
  const { triggerFullSync } = useBackup();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerAutoSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        await triggerFullSync();
      } catch {}
      // Fire-and-forget cloud push
      try {
        triggerCloudPush();
      } catch {}
    }, 2000);
  }, [triggerFullSync]);

  return { triggerAutoSave };
}
