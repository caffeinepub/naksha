/**
 * Capacitor Storage utilities — wraps @capacitor/filesystem with
 * graceful web fallback. All Capacitor imports are DYNAMIC so the web
 * build never fails when the package is absent from node_modules.
 *
 * IMPORTANT: All file operations use Directory.Documents ONLY.
 * Directory.Data and Directory.ExternalStorage are blocked on Android 14.
 */

/** Returns true only when the app is running inside a Capacitor native shell */
export function isCapacitorNative(): boolean {
  return (
    typeof (window as any).Capacitor !== "undefined" &&
    (window as any).Capacitor.isNativePlatform?.() === true
  );
}

/** Dynamic import that bypasses TypeScript module resolution checks */
async function dynamicImport(pkg: string): Promise<any> {
  // Use Function constructor to prevent tsc from trying to resolve the module
  // at compile time. The import only resolves at runtime inside Capacitor.
  return new Function("p", "return import(p)")(pkg);
}

/**
 * Ensure the NakshaData directory exists under Documents.
 * On native: calls Filesystem.mkdir({ path: 'NakshaData', directory: Directory.Documents }).
 * On web: no-op.
 *
 * NOTE: Always uses Directory.Documents — never Data or ExternalStorage.
 */
export async function ensureNakshaDataDir(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const { Filesystem, Directory } = await dynamicImport(
      "@capacitor/filesystem",
    );
    await Filesystem.mkdir({
      path: "NakshaData",
      directory: Directory.Documents, // MUST be Documents on Android 14
      recursive: true,
    });
  } catch (e: any) {
    // Ignore DIRECTORY_EXISTS errors — that's fine
    if (e?.message?.includes("Directory exists")) return;
    console.warn("[CapStorage] ensureNakshaDataDir error:", e);
  }
}

/**
 * Write a string to the Android Documents/NakshaData directory.
 * Falls back to a Blob download on web.
 *
 * Uses Directory.Documents exclusively — blocked directories
 * (Data, ExternalStorage) are never used.
 */
export async function saveToDocuments(
  filename: string,
  data: string,
): Promise<boolean> {
  if (isCapacitorNative()) {
    try {
      const { Filesystem, Directory, Encoding } = await dynamicImport(
        "@capacitor/filesystem",
      );
      await Filesystem.writeFile({
        path: `NakshaData/${filename}`,
        data,
        directory: Directory.Documents, // MUST be Documents on Android 14
        encoding: Encoding.UTF8,
        recursive: true,
      });
      return true;
    } catch (e) {
      console.warn("[CapStorage] saveToDocuments error:", e);
      return false;
    }
  }

  // Web fallback — trigger a Blob download
  try {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch (e) {
    console.warn("[CapStorage] web fallback error:", e);
    return false;
  }
}

/**
 * Read a file from the Android Documents/NakshaData directory.
 * Returns null on web or if the file doesn't exist.
 *
 * Uses Directory.Documents exclusively.
 */
export async function readFromDocuments(
  filename: string,
): Promise<string | null> {
  if (!isCapacitorNative()) return null;
  try {
    const { Filesystem, Directory, Encoding } = await dynamicImport(
      "@capacitor/filesystem",
    );
    const result = await Filesystem.readFile({
      path: `NakshaData/${filename}`,
      directory: Directory.Documents, // MUST be Documents on Android 14
      encoding: Encoding.UTF8,
    });
    return typeof result.data === "string" ? result.data : null;
  } catch {
    // File not found or other error — return null gracefully
    return null;
  }
}

/**
 * Overwrite-writes a file to Documents (alias of saveToDocuments).
 */
export async function appendOrCreateFile(
  filename: string,
  data: string,
): Promise<boolean> {
  return saveToDocuments(filename, data);
}

/**
 * Check if a file exists in Documents/NakshaData.
 */
export async function fileExistsInDocuments(
  filename: string,
): Promise<boolean> {
  if (!isCapacitorNative()) return false;
  try {
    const { Filesystem, Directory } = await dynamicImport(
      "@capacitor/filesystem",
    );
    await Filesystem.stat({
      path: `NakshaData/${filename}`,
      directory: Directory.Documents, // MUST be Documents on Android 14
    });
    return true;
  } catch {
    return false;
  }
}
