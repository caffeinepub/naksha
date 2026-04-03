/**
 * fileDownload — Android-compatible file save helper.
 *
 * On Android (and any browser lacking showDirectoryPicker), we cannot
 * write directly to the filesystem. Instead we generate a Blob and
 * trigger a system download. Android routes this to the Downloads /
 * Documents folder without requiring extra permissions.
 */

/**
 * Download a JSON object as a .json file via the browser download dialog.
 * Works on Android WebView, Chrome, Safari, and all modern browsers.
 */
export function downloadJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Returns true when the File System Access API directory picker is
 * available (desktop Chrome / Edge). Returns false on Android / iOS /
 * Firefox, where we must fall back to Blob downloads.
 */
export function isDirectoryPickerAvailable(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}
