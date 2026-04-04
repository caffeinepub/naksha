import { type FC, useEffect, useState } from "react";
import Starfield from "../components/Starfield";
import { useTheme } from "../context/ThemeContext";
import type { AppearanceSettings, TimerState } from "../types";

function formatClock(d: Date): string {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m}:${s} ${ampm}`;
}

function formatRemaining(ms: number): string {
  const safe = Number.isNaN(ms) || ms < 0 ? 0 : ms;
  const total = Math.max(0, Math.floor(safe / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface Props {
  username: string;
  timerState: TimerState | null;
  remaining: number;
  onGoToTimer: () => void;
  appearance?: AppearanceSettings;
}

const HomeScreen: FC<Props> = ({
  timerState,
  remaining,
  onGoToTimer,
  appearance,
}) => {
  const { palette } = useTheme();
  const [time, setTime] = useState(formatClock(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  const timerActive =
    timerState && (timerState.isRunning || timerState.isPaused);
  const safeRemaining =
    Number.isNaN(remaining) || remaining < 0 ? 0 : remaining;

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "max(env(safe-area-inset-bottom, 80px), 80px)",
      }}
    >
      <div
        style={{
          minHeight: "100%",
          position: "relative",
          overflowX: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: palette.bg,
        }}
      >
        {/* Starfield background */}
        <div style={{ position: "fixed", inset: 0, zIndex: 0 }}>
          <Starfield
            className="w-full h-full"
            starColor="rgba(200,220,255,0.9)"
            starsEnabled={appearance?.starsEnabled ?? true}
            starsOpacity={appearance?.starsOpacity ?? 0.8}
            shootingStarsEnabled={appearance?.shootingStarsEnabled ?? true}
            shootingStarsOpacity={appearance?.shootingStarsOpacity ?? 0.9}
            orionBeltEnabled={appearance?.orionBeltEnabled ?? true}
            orionBeltOpacity={appearance?.orionBeltOpacity ?? 0.7}
          />
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: 430,
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 16px 100px",
            boxSizing: "border-box",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          {/* Naksha wordmark — minimal, centered, above the clock */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 24,
              paddingTop: "env(safe-area-inset-top, 16px)",
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.25)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              NAKSHA
            </span>
          </div>

          {/* Clock */}
          <div
            style={{ textAlign: "center", marginBottom: timerActive ? 48 : 0 }}
          >
            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: -2,
                lineHeight: 1,
                textShadow: `0 0 32px rgba(255,255,255,0.15), 0 0 60px ${palette.accent}30`,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {time}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 6,
                marginTop: 16,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: palette.accent,
                    boxShadow: `0 0 6px ${palette.accentGlow}`,
                    animation: `wave-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Timer active widget */}
          {timerActive && (
            <button
              type="button"
              data-ocid="home.timer.button"
              onClick={onGoToTimer}
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: `1px solid ${palette.accent}40`,
                borderRadius: 24,
                cursor: "pointer",
                textAlign: "center",
                padding: "20px 32px",
                boxShadow: `0 0 24px ${palette.accentGlow}25, 0 8px 32px rgba(0,0,0,0.4)`,
                animation: "fade-in 0.4s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: timerState.isPaused
                      ? "#F59E0B"
                      : palette.accent,
                    boxShadow: timerState.isPaused
                      ? "0 0 6px #F59E0B"
                      : `0 0 6px ${palette.accentGlow}`,
                    animation: timerState.isPaused
                      ? "none"
                      : "pulse-dot 1s infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.6)",
                    fontWeight: 500,
                    letterSpacing: 0.5,
                  }}
                >
                  {timerState.isPaused ? "Paused" : "Studying"}:{" "}
                  {timerState.topic}
                </span>
              </div>
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: "#fff",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: -2,
                  lineHeight: 1,
                  textShadow: `0 0 20px ${palette.accent}60`,
                }}
              >
                {formatRemaining(safeRemaining)}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.35)",
                  marginTop: 8,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                Tap to continue
              </div>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
