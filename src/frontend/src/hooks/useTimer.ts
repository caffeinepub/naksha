import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, TimerState } from "../types";
import {
  playCompletionFanfare,
  playMilestoneBeep,
  playPauseSound,
  playResumeSound,
  playStartChime,
} from "../utils/audio";
import {
  cancelTimerNotification,
  ensureNotificationPermissionOnce,
  scheduleTimerCompleteNotification,
} from "../utils/capacitorNotifications";
import { clearTimerStateIDB, saveTimerStateIDB } from "../utils/indexedDB";
import {
  clearTimerState,
  getTimerState,
  saveSession,
  saveTimerState,
} from "../utils/storage";
import {
  cancelAllTimerNotifications,
  checkAndRequestNotificationPermission,
  showCompletionNotification,
  showLiveNotification,
} from "../utils/timerNotification";

function postToSW(msg: object) {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
  }
}

const TICK_MS = 250;

export function useTimer(onComplete: (actualMs: number) => void) {
  const [state, setState] = useState<TimerState | null>(null);
  const [remaining, setRemaining] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMilestoneRef = useRef(0);
  const completedRef = useRef(false);
  const stateRef = useRef<TimerState | null>(null);
  // Interval that sends TIMER_TICK to the service worker every second.
  // The SW handles the notification update — no showLiveNotification() here.
  // Calling showLiveNotification() from BOTH main thread AND SW causes
  // double-show which is what made the notification flash every second.
  const swTickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Restore on mount
  useEffect(() => {
    const saved = getTimerState();
    if (saved && (saved.isRunning || saved.isPaused)) {
      setState(saved);
      stateRef.current = saved;
    }
  }, []);

  const saveState = useCallback((s: TimerState) => {
    saveTimerState(s);
    saveTimerStateIDB(s);
  }, []);

  const clearState = useCallback(() => {
    clearTimerState();
    clearTimerStateIDB();
  }, []);

  // Stop the SW tick interval
  const stopSwTick = useCallback(() => {
    if (swTickIntervalRef.current) {
      clearInterval(swTickIntervalRef.current);
      swTickIntervalRef.current = null;
    }
  }, []);

  // Start the SW tick interval — sends remainingMs to SW every second.
  // SW does the in-place notification update (no close+reshow = no flash).
  const startSwTick = useCallback(
    (ref: React.MutableRefObject<TimerState | null>) => {
      stopSwTick();
      swTickIntervalRef.current = setInterval(() => {
        const s = ref.current;
        if (!s || s.isPaused) return;
        const rem = Math.max(
          0,
          s.totalDuration - (s.elapsed + (Date.now() - s.startTime)),
        );
        postToSW({
          type: "TIMER_TICK",
          payload: { remainingMs: rem, topic: s.topic },
        });
      }, 1000);
    },
    [stopSwTick],
  );

  // Tick loop
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    if (!state || (!state.isRunning && !state.isPaused)) {
      setRemaining(state?.totalDuration ?? 0);
      return;
    }

    if (state.isPaused) {
      const rem = state.totalDuration - state.elapsed;
      setRemaining(Math.max(0, rem));
      return;
    }

    // Running
    tickRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedNow = state.elapsed + (now - state.startTime);
      const rem = Math.max(0, state.totalDuration - elapsedNow);
      setRemaining(rem);

      // 10-minute milestone
      const elapsedMin = Math.floor(elapsedNow / 60000);
      if (
        elapsedMin > 0 &&
        elapsedMin !== lastMilestoneRef.current &&
        elapsedMin % 10 === 0
      ) {
        lastMilestoneRef.current = elapsedMin;
        playMilestoneBeep();
      }

      // Completed
      if (rem <= 0 && !completedRef.current) {
        completedRef.current = true;
        clearInterval(tickRef.current!);
        tickRef.current = null;
        playCompletionFanfare();
        clearState();
        stopSwTick();
        showCompletionNotification().catch(() => {});
        postToSW({ type: "TIMER_COMPLETE_LIVE" });
        const newState = null;
        setState(newState);
        stateRef.current = newState;
        onComplete(elapsedNow);
      }
    }, TICK_MS);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [state, clearState, onComplete, stopSwTick]);

  // Auto-save on page hide / close
  useEffect(() => {
    const autoSave = () => {
      const s = stateRef.current;
      if (!s || (!s.isRunning && !s.isPaused)) return;
      const elapsedNow = s.isPaused
        ? s.elapsed
        : s.elapsed + (Date.now() - s.startTime);
      if (elapsedNow < 10000) return;
      const session: Session = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        topic: s.topic,
        duration: s.totalDuration,
        actualTime: elapsedNow,
        completionPct: Math.round((elapsedNow / s.totalDuration) * 100),
        energyRating: -1,
        note: "auto-saved",
        timestamp: Date.now(),
      };
      saveSession(session);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") autoSave();
    };
    const handleBeforeUnload = () => autoSave();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const startTimer = useCallback(
    (topic: string, durationMs: number) => {
      completedRef.current = false;
      lastMilestoneRef.current = 0;
      const newState: TimerState = {
        isRunning: true,
        isPaused: false,
        startTime: Date.now(),
        totalDuration: durationMs,
        elapsed: 0,
        topic,
      };
      setState(newState);
      stateRef.current = newState;
      saveState(newState);
      playStartChime();
      postToSW({
        type: "TIMER_START",
        payload: {
          topic,
          startTime: newState.startTime,
          totalDuration: durationMs,
          duration: durationMs,
          elapsed: 0,
        },
      });
      // Schedule a precise Capacitor notification for when the timer ends (native only)
      ensureNotificationPermissionOnce().catch(() => {});
      cancelTimerNotification();
      scheduleTimerCompleteNotification(topic, durationMs);

      // Request permission then start the SW tick interval.
      // The SW will handle all notification updates — no showLiveNotification from here.
      checkAndRequestNotificationPermission()
        .then((perm) => {
          if (perm === "granted") {
            // Let TIMER_START in SW show the first notification.
            // Start the per-second tick that sends remainingMs to SW.
            startSwTick(stateRef);
          }
        })
        .catch(() => {});
    },
    [saveState, startSwTick],
  );

  const pauseTimer = useCallback(() => {
    if (!state || !state.isRunning || state.isPaused) return;
    const elapsedNow = state.elapsed + (Date.now() - state.startTime);
    const updated: TimerState = {
      ...state,
      isPaused: true,
      elapsed: elapsedNow,
    };
    setState(updated);
    stateRef.current = updated;
    saveState(updated);
    playPauseSound();
    stopSwTick();
    // Tell SW to update notification to paused state
    postToSW({ type: "TIMER_PAUSE", payload: { elapsed: elapsedNow } });
  }, [state, saveState, stopSwTick]);

  const resumeTimer = useCallback(() => {
    if (!state || !state.isPaused) return;
    const newStartTime = Date.now();
    const updated: TimerState = {
      ...state,
      isPaused: false,
      startTime: newStartTime,
    };
    setState(updated);
    stateRef.current = updated;
    saveState(updated);
    playResumeSound();
    postToSW({ type: "TIMER_RESUME", payload: { startTime: newStartTime } });
    startSwTick(stateRef);
  }, [state, saveState, startSwTick]);

  const stopTimer = useCallback(() => {
    if (!state) return;
    const elapsedNow = state.isPaused
      ? state.elapsed
      : state.elapsed + (Date.now() - state.startTime);
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    playCompletionFanfare();
    clearState();
    stopSwTick();
    cancelAllTimerNotifications().catch(() => {});
    postToSW({ type: "TIMER_CANCEL" });
    const newState = null;
    setState(newState);
    stateRef.current = newState;
    cancelTimerNotification();
    onComplete(elapsedNow);
  }, [state, clearState, onComplete, stopSwTick]);

  return {
    remaining,
    isRunning: state?.isRunning ?? false,
    isPaused: state?.isPaused ?? false,
    topic: state?.topic ?? "",
    totalDuration: state?.totalDuration ?? 0,
    timerState: state,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  };
}
