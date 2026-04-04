/**
 * nativeBridge.ts — Native-to-Web Handshake
 *
 * Ensures the Capacitor bridge is fully initialised BEFORE React
 * renders any component. This prevents 'Could not write' and
 * 'Bridge not ready' errors on cold launch.
 *
 * Usage (main.tsx):
 *   import { waitForBridge } from './utils/nativeBridge';
 *   waitForBridge().then(() => ReactDOM.createRoot(...).render(...));
 *
 * How it works:
 *   - Web (no Capacitor): resolves immediately.
 *   - Native (Capacitor): listens for the 'pluginsready' event that
 *     Capacitor fires after the bridge handshake completes, OR times
 *     out after 3 seconds to avoid blocking if the event never fires.
 */

export function waitForBridge(): Promise<void> {
  return new Promise((resolve) => {
    const cap = (window as any).Capacitor;

    // ----------------------------------------------------------------
    // Web path — resolve immediately, no bridge to wait for
    // ----------------------------------------------------------------
    if (
      !cap ||
      typeof cap.isNativePlatform !== "function" ||
      !cap.isNativePlatform()
    ) {
      resolve();
      return;
    }

    // ----------------------------------------------------------------
    // Native path — wait for 'pluginsready' event
    //
    // Capacitor fires this on the document after:
    //   1. The WebView is loaded
    //   2. The native bridge JS is injected
    //   3. All plugin instances are registered
    //
    // If 'pluginsready' was already fired before this module ran
    // (can happen if module is loaded lazily), cap.Plugins will exist
    // and we can resolve right away.
    // ----------------------------------------------------------------
    const isBridgeAlive = (): boolean => {
      try {
        return !!cap.Plugins && typeof cap.Plugins === "object";
      } catch {
        return false;
      }
    };

    if (isBridgeAlive()) {
      resolve();
      return;
    }

    let resolved = false;

    const handleReady = () => {
      if (!resolved) {
        resolved = true;
        document.removeEventListener("pluginsready", handleReady);
        resolve();
      }
    };

    document.addEventListener("pluginsready", handleReady);

    // Safety timeout — never block the UI indefinitely
    // 3 seconds is generous; bridge typically completes in < 300ms
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        document.removeEventListener("pluginsready", handleReady);
        console.warn("[NativeBridge] pluginsready timeout — proceeding anyway");
        resolve();
      }
    }, 3000);
  });
}
