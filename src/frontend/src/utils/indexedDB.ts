import type { Session, TimerState } from "../types";

const DB_NAME = "NakshaDB";
const DB_VERSION = 3;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("timerState")) {
        db.createObjectStore("timerState", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("sessions")) {
        db.createObjectStore("sessions", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("snapshot")) {
        db.createObjectStore("snapshot", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("dirHandles")) {
        db.createObjectStore("dirHandles", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveTimerStateIDB(state: TimerState): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("timerState", "readwrite");
      const store = tx.objectStore("timerState");
      store.put({ ...state, id: "current" });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function getTimerStateIDB(): Promise<TimerState | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("timerState", "readonly");
      const store = tx.objectStore("timerState");
      const req = store.get("current");
      req.onsuccess = () => {
        const result = req.result;
        if (!result) {
          resolve(null);
          return;
        }
        const { id: _id, ...state } = result;
        resolve(state as TimerState);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function clearTimerStateIDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("timerState", "readwrite");
      tx.objectStore("timerState").delete("current");
      tx.oncomplete = () => resolve();
    });
  } catch {}
}

export async function saveSessionIDB(session: Session): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sessions", "readwrite");
      tx.objectStore("sessions").put(session);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function getAllSessionsIDB(): Promise<Session[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("sessions", "readonly");
      const req = tx.objectStore("sessions").getAll();
      req.onsuccess = () => resolve(req.result as Session[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function saveSnapshotIDB(snapshot: object): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("snapshot", "readwrite");
      tx.objectStore("snapshot").put({ id: "main", ...snapshot });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

export async function getSnapshotIDB(): Promise<Record<
  string,
  unknown
> | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("snapshot", "readonly");
      const req = tx.objectStore("snapshot").get("main");
      req.onsuccess = () => {
        const result = req.result;
        if (!result) {
          resolve(null);
          return;
        }
        const { id: _id, ...rest } = result as Record<string, unknown>;
        resolve(rest);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Save a FileSystemDirectoryHandle to IndexedDB (Chrome 86+) */
export async function saveDirHandle(
  handle: FileSystemDirectoryHandle,
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("dirHandles", "readwrite");
      tx.objectStore("dirHandles").put({ id: "main", handle });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("saveDirHandle error:", e);
  }
}

/** Retrieve a stored FileSystemDirectoryHandle from IndexedDB */
export async function getDirHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("dirHandles", "readonly");
      const req = tx.objectStore("dirHandles").get("main");
      req.onsuccess = () => {
        const result = req.result;
        if (!result || !result.handle) {
          resolve(null);
          return;
        }
        resolve(result.handle as FileSystemDirectoryHandle);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Save just the folder name string to IDB (faster boot than reading handle) */
export async function saveFolderNameIDB(name: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("dirHandles", "readwrite");
      tx.objectStore("dirHandles").put({ id: "folderName", name });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

/** Retrieve saved folder name from IDB */
export async function getFolderNameIDB(): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("dirHandles", "readonly");
      const req = tx.objectStore("dirHandles").get("folderName");
      req.onsuccess = () => resolve(req.result?.name ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
