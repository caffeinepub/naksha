import type { FC, ReactNode } from "react";

interface Props {
  progress: number;
  size?: number;
  isRunning?: boolean;
  isPaused?: boolean;
  color?: string;
  children?: ReactNode;
}

const TimerRing: FC<Props> = ({
  progress,
  size = 280,
  isRunning = false,
  color = "var(--accent)",
  children,
}) => {
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 8;
  const glowStrokeWidth = 18;
  const r = (size - strokeWidth * 2 - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const safeProgress = Number.isNaN(progress)
    ? 0
    : Math.max(0, Math.min(1, progress));
  const offset = circumference * (1 - safeProgress);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width={size}
        height={size}
        role="img"
        aria-label="Timer progress ring"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <title>Timer progress ring</title>
        {/* Outer glow ring (low opacity, wider) */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={glowStrokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{
            opacity: 0.12,
            transition: "stroke-dashoffset 0.5s ease",
          }}
        />
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className={isRunning ? "animate-neon-pulse" : ""}
          style={{
            transition: "stroke-dashoffset 0.5s ease",
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
      </svg>

      <div
        style={{
          width: size - strokeWidth * 2 - 24,
          height: size - strokeWidth * 2 - 24,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.25)",
          backdropFilter: "blur(8px)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default TimerRing;
