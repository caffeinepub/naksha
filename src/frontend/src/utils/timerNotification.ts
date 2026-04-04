/**
 * timerNotification.ts
 * Handles all live timer notification logic.
 * Updates the notification every second while timer runs.
 * Uses Web Notification API (via SW) on web, @capacitor/local-notifications on native.
 */

import { isCapacitorNative } from "./capacitorStorage";

/** Notification tag/IDs */
const LIVE_TAG = "naksha-timer-live";
const DONE_TAG = "naksha-timer-done";
const LIVE_ID = 8888;
const DONE_ID = 8889;

/** Dynamic import to avoid web build failure */
async function dynamicImport(pkg: string): Promise<any> {
  return new Function("p", "return import(p)")(pkg);
}

/** Format milliseconds as MM:SS */
function formatTime(ms: number): string {
  if (!ms || Number.isNaN(ms) || ms <= 0) return "00:00";
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Check and request notification permission.
 * Returns 'granted' | 'denied' | 'default'
 */
export async function checkAndRequestNotificationPermission(): Promise<
  "granted" | "denied" | "default"
> {
  if (isCapacitorNative()) {
    try {
      const { LocalNotifications } = await dynamicImport(
        "@capacitor/local-notifications",
      );
      const statusResult = await LocalNotifications.checkPermissions();
      if (statusResult.display === "granted") return "granted";
      if (statusResult.display === "denied") return "denied";
      // Request
      const reqResult = await LocalNotifications.requestPermissions();
      if (reqResult.display === "granted") return "granted";
      if (reqResult.display === "denied") return "denied";
      return "default";
    } catch {
      return "default";
    }
  }

  // Web
  if (!("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  // Ask
  const result = await Notification.requestPermission();
  return result as "granted" | "denied" | "default";
}

/**
 * Post or update the live timer notification.
 * On native: uses @capacitor/local-notifications with ongoing:true
 * On web: uses SW showNotification with requireInteraction:true
 */
export async function showLiveNotification(
  remainingMs: number,
  _topic: string,
): Promise<void> {
  const timeStr = formatTime(remainingMs);
  const body = `⏱ ${timeStr} remaining`;

  if (isCapacitorNative()) {
    try {
      const { postOngoingNativeNotification } = await import(
        "./capacitorNotifications"
      );
      await postOngoingNativeNotification(remainingMs, _topic);
    } catch {
      // ignore
    }
    return;
  }

  // Web: use service worker showNotification for requireInteraction support
  if (!("serviceWorker" in navigator)) return;
  if (Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Naksha Timer Running", {
      body,
      tag: LIVE_TAG,
      silent: true,
      requireInteraction: true,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      renotify: false,
      // @ts-ignore — non-standard but supported in Chrome on Android
      sticky: true,
      data: { type: "timer-live" },
      actions: [
        { action: "pause", title: "⏸ Pause" },
        { action: "stop", title: "⏹ Stop" },
      ],
    } as NotificationOptions);
  } catch {
    // ignore — SW may not be ready
  }
}

/**
 * Cancel the live ongoing notification.
 */
export async function cancelLiveNotification(): Promise<void> {
  if (isCapacitorNative()) {
    try {
      const { cancelNativeOngoingNotification } = await import(
        "./capacitorNotifications"
      );
      await cancelNativeOngoingNotification();
    } catch {
      // ignore
    }
    return;
  }

  // Web: close via SW
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const ns = await reg.getNotifications({ tag: LIVE_TAG });
    for (const n of ns) n.close();
  } catch {
    // ignore
  }
}

/**
 * Cancel live, then post completion notification.
 */
export async function showCompletionNotification(): Promise<void> {
  await cancelLiveNotification().catch(() => {});

  if (isCapacitorNative()) {
    try {
      const { postNativeCompletionNotification } = await import(
        "./capacitorNotifications"
      );
      await postNativeCompletionNotification();
    } catch {
      // ignore
    }
    return;
  }

  // Web
  if (!("serviceWorker" in navigator)) return;
  if (Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Naksha Timer Done! 🎉", {
      body: "Your timer has finished. Tap to open.",
      tag: DONE_TAG,
      renotify: true,
      silent: false,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 400],
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { type: "timer-complete" },
    } as NotificationOptions);
  } catch {
    // ignore
  }
}

/**
 * Cancel both live and completion notifications.
 */
export async function cancelAllTimerNotifications(): Promise<void> {
  if (isCapacitorNative()) {
    try {
      const { LocalNotifications } = await dynamicImport(
        "@capacitor/local-notifications",
      );
      await LocalNotifications.cancel({
        notifications: [{ id: LIVE_ID }, { id: DONE_ID }],
      });
    } catch {
      // ignore
    }
    return;
  }

  // Web
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const liveNs = await reg.getNotifications({ tag: LIVE_TAG });
    for (const n of liveNs) n.close();
    const doneNs = await reg.getNotifications({ tag: DONE_TAG });
    for (const n of doneNs) n.close();
  } catch {
    // ignore
  }
}
