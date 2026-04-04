/**
 * God Mode Permissions
 *
 * On app launch (native Android only):
 * 1. Filesystem.checkPermissions() — if already granted, done.
 * 2. Filesystem.requestPermissions() — if that fails or is denied,
 *    open NativeSettings to the app's detail page so the user can
 *    manually toggle 'Files & Media'.
 *
 * All file operations MUST use Directory.Documents.
 * Never use Directory.Data or Directory.ExternalStorage on Android 14.
 */

import { isCapacitorNative } from "./capacitorStorage";

/** Dynamic import wrapper — bypasses Vite/Rollup module resolution */
async function dynamicImport(pkg: string): Promise<any> {
  return new Function("p", "return import(p)")(pkg);
}

/**
 * Run the full God Mode permission check + request flow.
 * Safe to call on web — returns immediately (no-op).
 */
export async function ensureFilesystemPermissions(): Promise<void> {
  if (!isCapacitorNative()) return;

  try {
    const { Filesystem } = await dynamicImport("@capacitor/filesystem");

    // Step 1: check current status
    let status: { publicStorage: string };
    try {
      status = await Filesystem.checkPermissions();
    } catch {
      // checkPermissions not available on this build — skip
      return;
    }

    if (status.publicStorage === "granted") {
      // Already good — nothing to do
      return;
    }

    // Step 2: request permissions
    let requestResult: { publicStorage: string };
    try {
      requestResult = await Filesystem.requestPermissions();
    } catch {
      // requestPermissions itself threw — fall through to NativeSettings
      requestResult = { publicStorage: "denied" };
    }

    if (requestResult.publicStorage === "granted") {
      return;
    }

    // Step 3 (The Trick): open app details in device settings
    // NativeSettings is a separate Capacitor community plugin.
    // We load it dynamically so the web build never breaks if it's absent.
    try {
      const { NativeSettings, AndroidSettings } = await dynamicImport(
        "@capacitor-community/native-settings",
      );
      await NativeSettings.openAndroid({
        option: AndroidSettings.ApplicationDetails,
      });
    } catch {
      // Plugin not installed — attempt fallback deep-link
      try {
        // This works on many Android launchers
        (window as any).open(
          `package:${(window as any).Capacitor?.getConfig?.()?.appId ?? ""}`,
          "_system",
        );
      } catch {
        // Nothing left to try — fail silently
      }
    }
  } catch (e) {
    console.warn("[GodModePermissions] Unexpected error:", e);
  }
}

/**
 * Convenience guard: resolves to true if filesystem permissions are granted
 * (or if running on web where the check is irrelevant).
 */
export async function isFilesystemPermissionGranted(): Promise<boolean> {
  if (!isCapacitorNative()) return true;
  try {
    const { Filesystem } = await dynamicImport("@capacitor/filesystem");
    const status = await Filesystem.checkPermissions();
    return status.publicStorage === "granted";
  } catch {
    return false;
  }
}
