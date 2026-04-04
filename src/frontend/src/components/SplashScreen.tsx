import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
  hideSignal?: boolean;
}

export default function SplashScreen({
  onDone,
  hideSignal,
}: SplashScreenProps) {
  const [hiding, setHiding] = useState(false);

  // Fallback max timeout — 3000ms in case hideSignal never arrives
  useEffect(() => {
    const fallback = setTimeout(() => {
      setHiding(true);
      setTimeout(onDone, 500);
    }, 3000);
    return () => clearTimeout(fallback);
  }, [onDone]);

  // React to hideSignal from parent
  useEffect(() => {
    if (!hideSignal) return;
    setHiding(true);
    const t = setTimeout(onDone, 500);
    return () => clearTimeout(t);
  }, [hideSignal, onDone]);

  return (
    <div
      className={`splash-screen${hiding ? " hiding" : ""}`}
      data-ocid="splash.panel"
    >
      <div className="splash-icon-wrap">
        {/* Lightweight inline SVG compass icon — loads in <1ms, no network request */}
        <svg
          width="96"
          height="96"
          viewBox="0 0 96 96"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-labelledby="naksha-compass-title"
        >
          <title id="naksha-compass-title">Naksha compass</title>
          <circle
            cx="48"
            cy="48"
            r="44"
            stroke="rgba(29,185,84,0.3)"
            strokeWidth="1.5"
          />
          <circle
            cx="48"
            cy="48"
            r="34"
            stroke="rgba(29,185,84,0.15)"
            strokeWidth="1"
          />
          <circle cx="48" cy="48" r="6" fill="#1db954" filter="url(#glow)" />
          <line
            x1="48"
            y1="10"
            x2="48"
            y2="86"
            stroke="rgba(29,185,84,0.2)"
            strokeWidth="1"
          />
          <line
            x1="10"
            y1="48"
            x2="86"
            y2="48"
            stroke="rgba(29,185,84,0.2)"
            strokeWidth="1"
          />
          <polygon points="48,12 52,28 48,24 44,28" fill="#1db954" />
          <polygon
            points="48,84 44,68 48,72 52,68"
            fill="rgba(29,185,84,0.4)"
          />
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </svg>
        {/* Glow ring behind icon */}
        <div className="splash-glow-ring" />
      </div>

      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: "#f0f0f0",
            letterSpacing: "0.04em",
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.2,
          }}
        >
          Naksha
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.45)",
            marginTop: 6,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Your Time. Your Orbit.
        </div>
      </div>

      {/* Spinner */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "2.5px solid rgba(29,185,84,0.2)",
          borderTop: "2.5px solid #1db954",
          animation: "spin 0.8s linear infinite",
          marginTop: 8,
        }}
      />
    </div>
  );
}
