import { useEffect, useState } from "react";

/**
 * TopBar — Persistent top bar with:
 *   Left:  glowing "Naksha" wordmark
 *   Right: online/offline status indicator
 *
 * Position: fixed, full width, flush to top (respects safe-area-inset-top).
 * Height: 44px + safe area, so all screens need paddingTop of the same.
 */
export const TOP_BAR_HEIGHT = 44;

export default function TopBar() {
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 500,
        // Height: 44px visible content + safe area inset (notch)
        paddingTop: "env(safe-area-inset-top, 0px)",
        height: `calc(${TOP_BAR_HEIGHT}px + env(safe-area-inset-top, 0px))`,
        background: "rgba(10, 10, 15, 0.85)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingLeft: 18,
        paddingRight: 18,
        paddingBottom: 10,
        // No border or shadow — blends with the app background
        border: "none",
        boxShadow: "none",
        pointerEvents: "none", // non-interactive — informational only
      }}
      aria-hidden="true"
    >
      {/* Left: Glowing Naksha wordmark */}
      <span
        style={{
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: 2.5,
          textTransform: "uppercase",
          color: "var(--accent, #1db954)",
          // Layered neon glow
          textShadow:
            "0 0 8px var(--accent-glow, #1db954), 0 0 20px var(--accent-glow, #1db954), 0 0 40px var(--accent-glow, #1db954)",
          fontFamily: "'DM Sans', sans-serif",
          userSelect: "none",
          WebkitUserSelect: "none",
          animation: "naksha-glow-pulse 3s ease-in-out infinite",
        }}
      >
        Naksha
      </span>

      {/* Right: Online / Offline badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {/* Status dot */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: online ? "#22c55e" : "#ef4444",
            boxShadow: online
              ? "0 0 8px #22c55e, 0 0 16px #22c55e60"
              : "0 0 8px #ef4444, 0 0 16px #ef444460",
            animation: online ? "online-pulse 2s ease-in-out infinite" : "none",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: online ? "rgba(34, 197, 94, 0.9)" : "rgba(239, 68, 68, 0.9)",
          }}
        >
          {online ? "Online" : "Offline"}
        </span>
      </div>
    </div>
  );
}
