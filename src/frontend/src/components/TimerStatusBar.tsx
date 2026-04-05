import { type FC, useEffect, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import type { TimerState } from "../types";
import { TOP_BAR_HEIGHT } from "./TopBar";

function formatRemaining(ms: number): string {
  const safe = Number.isNaN(ms) || ms < 0 ? 0 : ms;
  const total = Math.max(0, Math.floor(safe / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  timerState: TimerState | null;
  remaining: number;
  onGoToTimer: () => void;
}

const TimerStatusBar: FC<Props> = ({ timerState, remaining, onGoToTimer }) => {
  const { palette } = useTheme();
  const [displayRemaining, setDisplayRemaining] = useState(remaining);

  useEffect(() => {
    setDisplayRemaining(remaining);
    if (!timerState?.isRunning) return;
    const id = setInterval(() => {
      if (timerState?.isRunning && timerState.startTime) {
        const elapsedNow =
          timerState.elapsed + (Date.now() - timerState.startTime);
        const rem = Math.max(0, timerState.totalDuration - elapsedNow);
        setDisplayRemaining(rem);
      }
    }, 500);
    return () => clearInterval(id);
  }, [timerState, remaining]);

  if (!timerState || (!timerState.isRunning && !timerState.isPaused))
    return null;

  const safeRemaining =
    Number.isNaN(displayRemaining) || displayRemaining < 0
      ? 0
      : displayRemaining;

  return (
    <button
      type="button"
      data-ocid="timer_status.button"
      onClick={onGoToTimer}
      style={{
        position: "fixed",
        // Sit directly below the TopBar
        top: `calc(${TOP_BAR_HEIGHT}px + env(safe-area-inset-top, 0px))`,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        zIndex: 450, // below TopBar (500) but above content (1)
        background: "rgba(10,10,15,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "none",
        boxShadow: "none",
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 18,
        paddingRight: 18,
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
      }}
    >
      {/* Pulsing dot */}
      <div
        style={{
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: timerState.isPaused ? "#F59E0B" : palette.accent,
          boxShadow: timerState.isPaused
            ? "0 0 8px #F59E0B"
            : `0 0 10px ${palette.accentGlow}`,
          animation: timerState.isPaused
            ? "none"
            : "pulse-dot 1.2s ease-in-out infinite",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.75)",
          flex: 1,
          textAlign: "left",
          fontWeight: 500,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {timerState.isPaused ? "Paused" : "Studying"}: {timerState.topic}
      </span>
      <span
        style={{
          fontSize: 17,
          fontWeight: 800,
          color: "#fff",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: -1,
          textShadow: `0 0 14px ${palette.accent}90`,
          flexShrink: 0,
        }}
      >
        {formatRemaining(safeRemaining)}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          marginLeft: 2,
          flexShrink: 0,
        }}
      >
        tap
      </span>
    </button>
  );
};

export default TimerStatusBar;
