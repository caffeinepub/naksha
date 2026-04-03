/**
 * Monarch Storage — Folder-based File System Access API persistence.
 * Falls back to localStorage gracefully on unsupported browsers.
 */

import { isDirectoryPickerAvailable } from "./fileDownload";
import { getDirHandle, saveDirHandle, saveSnapshotIDB } from "./indexedDB";
import { PREF_KEYS, Preferences } from "./preferences";
import {
  getAppearance,
  getChapters,
  getProjects,
  getSessions,
  getSubjects,
  getTheme,
  getTodos,
  getTopics,
  getUsername,
  saveAppearance,
  saveChapters,
  saveProjects,
  saveSubjects,
  saveTheme,
  saveTodos,
  saveTopics,
  setUsername,
} from "./storage";

export type BackupStatus = "idle" | "saving" | "saved" | "error" | "no-file";

// In-memory directory handle — persists for the session
let dirHandle: FileSystemDirectoryHandle | null = null;
let folderName = "";

export function isFolderSystemSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function hasFolderLinked(): boolean {
  return dirHandle !== null;
}

export function getFolderName(): string {
  return folderName;
}

/** Ask user to pick a folder. Returns true on success. */
export async function selectFolder(): Promise<boolean> {
  if (!isDirectoryPickerAvailable()) {
    return false;
  }
  if (!isFolderSystemSupported()) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const picker = (window as any).showDirectoryPicker as (
      opts?: object,
    ) => Promise<FileSystemDirectoryHandle>;
    const handle = await picker({ mode: "readwrite" });
    dirHandle = handle;
    folderName = handle.name;
    await saveDirHandle(handle);
    return true;
  } catch (e: unknown) {
    if ((e as { name?: string }).name !== "AbortError")
      console.warn("Monarch selectFolder error:", e);
    return false;
  }
}

/**
 * Attempt to re-link a previously stored folder handle from IndexedDB.
 * Returns 'linked' | 'unreachable' | 'none'
 */
export async function tryRelinkFolder(): Promise<
  "linked" | "unreachable" | "none"
> {
  try {
    const stored = await getDirHandle();
    if (!stored) return "none";

    // queryPermission is available on FileSystemHandle in Chrome 86+
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handle = stored as any;
    let permission: PermissionState = "prompt";

    try {
      permission = await handle.queryPermission({ mode: "readwrite" });
    } catch {
      // queryPermission not available in this environment
    }

    if (permission === "granted") {
      dirHandle = stored;
      folderName = stored.name;
      Preferences.set({ key: PREF_KEYS.folderName, value: stored.name }).catch(
        () => {},
      );
      return "linked";
    }

    if (permission === "prompt") {
      try {
        const result = await handle.requestPermission({ mode: "readwrite" });
        if (result === "granted") {
          dirHandle = stored;
          folderName = stored.name;
          Preferences.set({
            key: PREF_KEYS.folderName,
            value: stored.name,
          }).catch(() => {});
          return "linked";
        }
      } catch {
        // requestPermission failed silently
      }
    }

    return "unreachable";
  } catch {
    return "none";
  }
}

/** Build a full snapshot of all app data */
export function buildSnapshot(): object {
  const allTasks: Record<string, unknown[]> = {};
  const topics = getTopics();
  for (const t of topics) {
    const raw = localStorage.getItem(`nk_tasks_${t.id}`);
    if (raw) {
      try {
        allTasks[t.id] = JSON.parse(raw);
      } catch {
        /* ignore */
      }
    }
  }
  return {
    version: 2,
    exportedAt: Date.now(),
    username: getUsername(),
    theme: getTheme(),
    appearance: getAppearance(),
    subjects: getSubjects(),
    chapters: getChapters(),
    topics,
    tasks: allTasks,
    todos: getTodos(),
    sessions: getSessions(),
    projects: getProjects(),
  };
}

/** Validate a snapshot before saving — corruption shield */
function isValidSnapshot(snap: Record<string, unknown>): boolean {
  return (
    !!snap.version &&
    Array.isArray(snap.sessions) &&
    Array.isArray(snap.subjects)
  );
}

/** Write snapshot to naksha_master_data.json in the linked folder */
export async function syncToFolder(
  onStatus?: (s: BackupStatus) => void,
): Promise<void> {
  if (!dirHandle) {
    onStatus?.("no-file");
    return;
  }
  onStatus?.("saving");
  try {
    const snap = buildSnapshot() as Record<string, unknown>;
    // Corruption shield: validate before writing
    if (!isValidSnapshot(snap)) {
      console.warn("Monarch: snapshot validation failed — skipping write");
      onStatus?.("error");
      return;
    }
    const fileHandle = await dirHandle.getFileHandle(
      "naksha_master_data.json",
      {
        create: true,
      },
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writable = await (fileHandle as any).createWritable();
    await writable.write(JSON.stringify(snap, null, 2));
    await writable.close();
    onStatus?.("saved");
    // Persist folder name to Preferences (fire-and-forget) so it survives Android WebView restarts
    Preferences.set({ key: PREF_KEYS.folderName, value: folderName }).catch(
      () => {},
    );
    // Dual-write to IDB (fire-and-forget)
    saveSnapshotIDB(snap).catch(() => {});
  } catch (e) {
    console.warn("Monarch syncToFolder error:", e);
    onStatus?.("error");
  }
}

/** Backward-compat alias: syncToFile → syncToFolder */
export const syncToFile = syncToFolder;

/** Backward-compat: hasLinkedFile → hasFolderLinked */
export const hasLinkedFile = hasFolderLinked;

/** Backward-compat: isFileSystemSupported → isFolderSystemSupported */
export const isFileSystemSupported = isFolderSystemSupported;

/** Backward-compat: linkFile — now uses folder picker */
export async function linkFile(): Promise<boolean> {
  return selectFolder();
}

/**
 * Test the current folder connection by writing and deleting a small file.
 */
export async function testConnection(): Promise<{
  success: boolean;
  folderName: string;
  error?: string;
}> {
  if (!dirHandle) {
    return { success: false, folderName: "", error: "No folder linked" };
  }
  const name = dirHandle.name;
  try {
    const testHandle = await dirHandle.getFileHandle("_naksha_test_.tmp", {
      create: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writable = await (testHandle as any).createWritable();
    await writable.write("naksha-test");
    await writable.close();
    await dirHandle.removeEntry("_naksha_test_.tmp");
    return { success: true, folderName: name };
  } catch (e) {
    return { success: false, folderName: name, error: String(e) };
  }
}

/**
 * Saves snapshot to localStorage keys AND IndexedDB without needing a file handle.
 * Used for Safe Refresh and debounced auto-save.
 */
export async function syncToLocalAndIDB(): Promise<void> {
  try {
    const snap = buildSnapshot() as Record<string, unknown>;
    // Corruption shield
    if (!isValidSnapshot(snap)) {
      console.warn("Monarch: syncToLocalAndIDB — invalid snapshot, skipping");
      return;
    }
    // Persist all localStorage keys
    if (snap.username && typeof snap.username === "string")
      setUsername(snap.username);
    if (snap.theme && typeof snap.theme === "string")
      saveTheme(snap.theme as ReturnType<typeof getTheme>);
    if (snap.appearance && typeof snap.appearance === "object")
      saveAppearance(snap.appearance as ReturnType<typeof getAppearance>);
    if (Array.isArray(snap.subjects)) saveSubjects(snap.subjects);
    if (Array.isArray(snap.chapters)) saveChapters(snap.chapters);
    if (Array.isArray(snap.topics)) saveTopics(snap.topics);
    if (Array.isArray(snap.todos)) saveTodos(snap.todos);
    if (Array.isArray(snap.sessions))
      localStorage.setItem("nk_sessions", JSON.stringify(snap.sessions));
    if (Array.isArray(snap.projects)) saveProjects(snap.projects);
    if (snap.tasks && typeof snap.tasks === "object") {
      for (const [topicId, tasks] of Object.entries(
        snap.tasks as Record<string, unknown>,
      )) {
        localStorage.setItem(`nk_tasks_${topicId}`, JSON.stringify(tasks));
      }
    }
    // Dual-write to IndexedDB
    await saveSnapshotIDB(snap);
  } catch (e) {
    console.warn("Monarch syncToLocalAndIDB error:", e);
  }
}

/** Export data as a JSON download (no file handle required) */
export function exportData(): void {
  const snapshot = buildSnapshot();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `naksha_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Restore all data from a snapshot object */
function restoreSnapshot(data: Record<string, unknown>): void {
  if (data.username && typeof data.username === "string")
    setUsername(data.username);
  if (data.theme && typeof data.theme === "string")
    saveTheme(data.theme as ReturnType<typeof getTheme>);
  if (data.appearance && typeof data.appearance === "object")
    saveAppearance(data.appearance as ReturnType<typeof getAppearance>);
  if (Array.isArray(data.subjects)) saveSubjects(data.subjects);
  if (Array.isArray(data.chapters)) saveChapters(data.chapters);
  if (Array.isArray(data.topics)) saveTopics(data.topics);
  if (Array.isArray(data.todos)) saveTodos(data.todos);
  if (Array.isArray(data.sessions)) {
    localStorage.setItem("nk_sessions", JSON.stringify(data.sessions));
  }
  if (Array.isArray(data.projects)) saveProjects(data.projects);
  if (data.tasks && typeof data.tasks === "object") {
    for (const [topicId, tasks] of Object.entries(
      data.tasks as Record<string, unknown>,
    )) {
      localStorage.setItem(`nk_tasks_${topicId}`, JSON.stringify(tasks));
    }
  }
}

/** Import data from a JSON file chosen by the user */
export async function importData(): Promise<{
  success: boolean;
  error?: string;
}> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve({ success: false, error: "No file selected" });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          restoreSnapshot(data as Record<string, unknown>);
          resolve({ success: true });
        } catch (err) {
          resolve({ success: false, error: String(err) });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
