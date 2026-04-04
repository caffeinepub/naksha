import { useCallback, useEffect, useRef, useState } from "react";
import { UserRole } from "../backend";
import {
  registerCloudPush,
  unregisterCloudPush,
} from "../utils/cloudSyncBridge";
import {
  getAppearance,
  getChapters,
  getNotes,
  getSessions,
  getSubjects,
  getTheme,
  getTimerState,
  getTodos,
  getTopics,
  getUsername,
  saveAppearance,
  saveChapters,
  saveNotes,
  saveSubjects,
  saveTheme,
  saveTodos,
  saveTopics,
} from "../utils/storage";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

export type CloudSyncStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "error"
  | "offline";

const OFFLINE_QUEUE_KEY = "nk_offline_queue";

function gatherAllLocalData(): string {
  try {
    const payload = {
      sessions: getSessions(),
      todos: getTodos(),
      subjects: getSubjects(),
      chapters: getChapters(),
      topics: getTopics(),
      notes: getNotes(),
      timerState: getTimerState(),
      theme: getTheme(),
      appearance: getAppearance(),
      username: getUsername(),
    };
    return JSON.stringify(payload);
  } catch {
    return "{}";
  }
}

function applyCloudData(data: string): void {
  try {
    const parsed = JSON.parse(data);
    if (parsed.subjects) saveSubjects(parsed.subjects);
    if (parsed.chapters) saveChapters(parsed.chapters);
    if (parsed.topics) saveTopics(parsed.topics);
    if (parsed.todos) saveTodos(parsed.todos);
    if (parsed.notes) saveNotes(parsed.notes);
    if (parsed.theme) saveTheme(parsed.theme);
    if (parsed.appearance) saveAppearance(parsed.appearance);
    if (parsed.username) {
      try {
        localStorage.setItem("nk_username", parsed.username);
      } catch {}
    }
    if (parsed.sessions) {
      try {
        localStorage.setItem("nk_sessions", JSON.stringify(parsed.sessions));
      } catch {}
    }
  } catch {}
}

export function useCloudSync() {
  const { identity, login, clear, isLoginSuccess } = useInternetIdentity();
  const { actor, isFetching } = useActor();

  const isLoggedIn = !!identity && !identity.getPrincipal().isAnonymous();

  const [cloudSyncStatus, setCloudSyncStatus] =
    useState<CloudSyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const registrationDone = useRef(false);

  // Track online/offline
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => {
      setIsOnline(false);
      setCloudSyncStatus("offline");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const pushToCloud = useCallback(async () => {
    if (!isLoggedIn || !actor || isFetching) return;
    if (!isOnline) {
      try {
        localStorage.setItem(OFFLINE_QUEUE_KEY, "1");
      } catch {}
      setCloudSyncStatus("offline");
      return;
    }
    try {
      setCloudSyncStatus("syncing");
      const data = gatherAllLocalData();
      await actor.saveUserData(data);
      localStorage.removeItem(OFFLINE_QUEUE_KEY);
      setCloudSyncStatus("synced");
      setLastSyncedAt(new Date());
    } catch {
      setCloudSyncStatus("error");
      try {
        localStorage.setItem(OFFLINE_QUEUE_KEY, "1");
      } catch {}
    }
  }, [isLoggedIn, actor, isFetching, isOnline]);

  const pullFromCloud = useCallback(async () => {
    if (!isLoggedIn || !actor || isFetching) return;
    if (!isOnline) {
      setCloudSyncStatus("offline");
      return;
    }
    try {
      setCloudSyncStatus("syncing");
      const entry = await actor.getUserData();
      if (entry?.data) {
        applyCloudData(entry.data);
      }
      setCloudSyncStatus("synced");
      setLastSyncedAt(new Date());
    } catch {
      setCloudSyncStatus("error");
    }
  }, [isLoggedIn, actor, isFetching, isOnline]);

  // Register user role on first login, then pull cloud data
  useEffect(() => {
    if (!isLoggedIn || !actor || isFetching || registrationDone.current) return;
    registrationDone.current = true;

    const principal = identity!.getPrincipal();
    void (async () => {
      try {
        await actor.assignCallerUserRole(principal, UserRole.user);
      } catch {
        // might already be registered — ignore
      }
      await pullFromCloud();
    })();
  }, [isLoggedIn, actor, isFetching, identity, pullFromCloud]);

  // Reset registration flag on logout
  useEffect(() => {
    if (!isLoggedIn) {
      registrationDone.current = false;
    }
  }, [isLoggedIn]);

  // Flush offline queue when back online
  useEffect(() => {
    if (!isOnline || !isLoggedIn) return;
    const hasQueue = localStorage.getItem(OFFLINE_QUEUE_KEY) === "1";
    if (hasQueue) {
      void pushToCloud();
    }
  }, [isOnline, isLoggedIn, pushToCloud]);

  // Register push function in the bridge so useAutoSave can call it
  useEffect(() => {
    if (isLoggedIn) {
      registerCloudPush(() => {
        void pushToCloud();
      });
    } else {
      unregisterCloudPush();
    }
    return () => {
      unregisterCloudPush();
    };
  }, [isLoggedIn, pushToCloud]);

  // If offline and logged in, reflect status
  useEffect(() => {
    if (!isOnline && isLoggedIn) {
      setCloudSyncStatus("offline");
    }
  }, [isOnline, isLoggedIn]);

  return {
    isLoggedIn,
    login,
    logout: clear,
    cloudSyncStatus,
    lastSyncedAt,
    isOnline,
    pushToCloud,
    pullFromCloud,
    deleteCloudData: async () => {
      if (!actor) return;
      try {
        setCloudSyncStatus("syncing");
        await actor.deleteData();
        setCloudSyncStatus("idle");
        setLastSyncedAt(null);
      } catch {
        setCloudSyncStatus("error");
      }
    },
    isLoginSuccess,
    principal: identity?.getPrincipal().toString() ?? null,
  };
}
