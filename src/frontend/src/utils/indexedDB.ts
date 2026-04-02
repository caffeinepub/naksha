import type { Session, TimerState } from "../types";

const DB_NAME = "NakshaDB";
const DB_VERSION = 2;

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
