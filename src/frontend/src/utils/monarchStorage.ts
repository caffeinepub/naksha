/**
 * Monarch Storage — File System Access API based persistence.
 * Falls back to localStorage gracefully on unsupported browsers.
 */

import { saveSnapshotIDB } from "./indexedDB";
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

const FILE_HANDLE_KEY = "nk_monarchFileHandleSupported";

export type BackupStatus = "idle" | "saving" | "saved" | "error" | "no-file";

// In-memory handle — persists for the session only (File System Access API requirement)
let fileHandle: FileSystemFileHandle | null = null;

export function isFileSystemSupported(): boolean {
  return typeof window !== "undefined" && "showSaveFilePicker" in window;
}

export function hasLinkedFile(): boolean {
  return fileHandle !== null;
}

/** Ask user to pick or create a file. Returns true on success. */
export async function linkFile(): Promise<boolean> {
  if (!isFileSystemSupported()) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const picker = (window as any).showSaveFilePicker as (
      opts: object,
    ) => Promise<FileSystemFileHandle>;
    const handle = await picker({
      suggestedName: "naksha_data.json",
      types: [
        {
          description: "Naksha Data File",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    fileHandle = handle;
    localStorage.setItem(FILE_HANDLE_KEY, "1");
    return true;
  } catch (e: unknown) {
    if ((e as { name?: string }).name !== "AbortError")
      console.warn("Monarch linkFile error:", e);
    return false;
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

/** Write snapshot to the linked file */
export async function syncToFile(
  onStatus?: (s: BackupStatus) => void,
): Promise<void> {
  if (!fileHandle) {
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
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(snap, null, 2));
    await writable.close();
    onStatus?.("saved");
    // Dual-write to IDB (fire-and-forget)
    saveSnapshotIDB(snap).catch(() => {});
  } catch (e) {
    console.warn("Monarch sync error:", e);
    onStatus?.("error");
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
