import { useCallback, useRef } from "react";

export function useWakeLock() {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator)) return;
    try {
      lockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      // Not supported or denied
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (lockRef.current) {
      try {
        await lockRef.current.release();
      } catch {}
      lockRef.current = null;
    }
  }, []);

  return { acquireWakeLock, releaseWakeLock };
}
