/**
 * Capacitor Notifications utilities — wraps @capacitor/local-notifications
 * with graceful web fallback. All imports are DYNAMIC so the web build
 * never fails when the package is absent from node_modules.
 */

import { isCapacitorNative } from "./capacitorStorage";

const TIMER_NOTIF_ID = 9999;
const CHANNEL_ID = "naksha-timer";

/** Module-level guard so we only request once per session */
let permRequested = false;

/** Dynamic import that bypasses TypeScript module resolution checks */
async function dynamicImport(pkg: string): Promise<any> {
  return new Function("p", "return import(p)")(pkg);
}

/**
 * Request notification permissions lazily — called on first meaningful
 * interaction (e.g. when user starts a timer). Only fires once per session.
 * Returns true if granted.
 */
export async function ensureNotificationPermissionOnce(): Promise<boolean> {
  if (permRequested) {
    // Already asked this session — check current state
    if (isCapacitorNative()) return true; // assume granted on native if already asked
    if ("Notification" in window) return Notification.permission === "granted";
    return false;
  }
  permRequested = true;
  return requestNotificationPermissions();
}

/**
 * Request notification permissions via Capacitor.
 * Returns true if granted; falls back to the browser Notification API on web.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (isCapacitorNative()) {
    try {
      const { LocalNotifications } = await dynamicImport(
        "@capacitor/local-notifications",
      );
      const result = await LocalNotifications.requestPermissions();
      return result.display === "granted";
    } catch (e) {
      console.warn("[CapNotif] requestPermissions error:", e);
      return false;
    }
  }

  // Web fallback
  if ("Notification" in window) {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  }
  return false;
}

/**
 * Create the Android notification channel for timer alerts.
 * Must be called before scheduling any notifications.
 */
export async function createNotificationChannel(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const { LocalNotifications } = await dynamicImport(
      "@capacitor/local-notifications",
    );
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: "Timer Alerts",
      description: "Naksha study timer completion alerts",
      importance: 5, // IMPORTANCE_HIGH (max)
      vibration: true,
      sound: "beep",
    });
  } catch (e) {
    console.warn("[CapNotif] createChannel error:", e);
  }
}

/**
 * Schedule a precise local notification to fire when the timer hits zero.
 * On web the service worker handles notifications instead — this is a no-op.
 */
export async function scheduleTimerCompleteNotification(
  topicLabel: string,
  delayMs: number,
): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const { LocalNotifications } = await dynamicImport(
      "@capacitor/local-notifications",
    );
    // Cancel any previous timer notification first
    await cancelTimerNotification();
    const fireAt = new Date(Date.now() + delayMs);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: TIMER_NOTIF_ID,
          title: "Naksha \u23f1 Session Complete! \uD83C\uDF89",
          body: `Great work on "${topicLabel}"! Your study session is done.`,
          schedule: { at: fireAt, allowWhileIdle: true },
          sound: "beep.wav",
          vibrations: true,
          channelId: CHANNEL_ID,
          extra: { type: "timer_complete" },
        },
      ],
    });
  } catch (e) {
    console.warn("[CapNotif] scheduleTimerCompleteNotification error:", e);
  }
}

/**
 * Cancel the pending timer completion notification (id 9999).
 */
export async function cancelTimerNotification(): Promise<void> {
  if (!isCapacitorNative()) return;
  try {
    const { LocalNotifications } = await dynamicImport(
      "@capacitor/local-notifications",
    );
    await LocalNotifications.cancel({
      notifications: [{ id: TIMER_NOTIF_ID }],
    });
  } catch {
    // Ignore — notification may not have been scheduled
  }
}
