import { HardDrive, Link2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "./components/BottomNav";
import NotificationBanner from "./components/NotificationBanner";
import Onboarding from "./components/Onboarding";
import TimerStatusBar from "./components/TimerStatusBar";
import { AppearanceProvider, useAppearance } from "./context/AppearanceContext";
import { BackupProvider, useBackup } from "./context/BackupContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { useTimer } from "./hooks/useTimer";
import DashboardScreen from "./screens/DashboardScreen";
import HomeScreen from "./screens/HomeScreen";
import SettingsScreen from "./screens/SettingsScreen";
import TimerScreen from "./screens/TimerScreen";
import TodoScreen from "./screens/TodoScreen";
import TopicsScreen from "./screens/TopicsScreen";
import type { TabId, Topic } from "./types";
import { getUsername } from "./utils/storage";

function BackupIcon() {
  const { status, fileLinked, linkFileAndSync, triggerFullSync } = useBackup();
  const [pulse, setPulse] = useState(false);
  const prevStatusRef = useRef<string>(status);

  useEffect(() => {
    if (status === "saved" && prevStatusRef.current !== "saved") {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 800);
      return () => clearTimeout(t);
    }
    prevStatusRef.current = status;
  }, [status]);

  const isSaving = status === "saving";
  const isError = status === "error";

  const iconColor = !fileLinked
    ? "rgba(255,255,255,0.4)"
    : isError
      ? "#EF4444"
      : isSaving
        ? "#F59E0B"
        : "#22C55E";

  const glow = !fileLinked
    ? "none"
    : isError
      ? "0 0 8px rgba(239,68,68,0.6)"
      : isSaving
        ? "0 0 8px rgba(245,158,11,0.6)"
        : pulse
          ? "0 0 12px rgba(34,197,94,0.8)"
          : "0 0 6px rgba(34,197,94,0.4)";

  const pillBg = !fileLinked
    ? "rgba(255,255,255,0.06)"
    : isError
      ? "rgba(239,68,68,0.08)"
      : isSaving
        ? "rgba(245,158,11,0.08)"
        : "rgba(34,197,94,0.08)";

  const pillBorder = !fileLinked
    ? "1px solid rgba(255,255,255,0.12)"
    : isError
      ? "1px solid rgba(239,68,68,0.3)"
      : isSaving
        ? "1px solid rgba(245,158,11,0.3)"
        : "1px solid rgba(34,197,94,0.25)";

  const handleClick = () => {
    if (!fileLinked) {
      linkFileAndSync();
    } else {
      triggerFullSync();
    }
  };

  const labelText = !fileLinked
    ? "Connect File"
    : isSaving
      ? "Saving\u2026"
      : isError
        ? "Error"
        : "Connected";

  const labelColor = !fileLinked
    ? "rgba(255,255,255,0.5)"
    : isError
      ? "#EF4444"
      : isSaving
        ? "#F59E0B"
        : "#22C55E";

  return (
    <div
      style={{
        position: "fixed",
        top: 14,
        right: 16,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 6,
        maxWidth: 430,
      }}
    >
      {/* Saved ✓ pulse label */}
      {fileLinked && (
        <div
          style={{
            fontSize: 10,
            color: "#22C55E",
            fontWeight: 700,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 20,
            padding: "2px 7px",
            opacity: pulse ? 1 : 0,
            transform: pulse ? "scale(1)" : "scale(0.9)",
            transition: "opacity 0.3s, transform 0.3s",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          Saved \u2713
        </div>
      )}

      {/* Main pill button */}
      <button
        type="button"
        onClick={handleClick}
        title={
          fileLinked
            ? "Click to save progress to file"
            : "Connect a local file to enable auto-save"
        }
        data-ocid="backup.toggle"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: pillBg,
          border: pillBorder,
          borderRadius: 20,
          padding: "5px 10px",
          cursor: "pointer",
          maxHeight: 30,
          outline: "none",
          transition: "background 0.3s, border 0.3s",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        {fileLinked ? (
          <HardDrive
            size={14}
            color={iconColor}
            style={{
              filter: glow !== "none" ? `drop-shadow(${glow})` : undefined,
              transform: pulse ? "scale(1.3)" : "scale(1)",
              transition: "color 0.4s, filter 0.4s, transform 0.3s",
              flexShrink: 0,
            }}
          />
        ) : (
          <Link2
            size={14}
            color={iconColor}
            style={{
              flexShrink: 0,
              transition: "color 0.3s",
            }}
          />
        )}
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: labelColor,
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
            transition: "color 0.3s",
          }}
        >
          {labelText}
        </span>
      </button>
    </div>
  );
}

function AppInner() {
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [username, setUsernameState] = useState<string | null>(getUsername());
  const [showOnboarding, setShowOnboarding] = useState(!getUsername());
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [dataReady, setDataReady] = useState(false);

  const { palette } = useTheme();
  const { appearance } = useAppearance();

  // Data-First Initialization: check localStorage before showing UI
  useEffect(() => {
    const hasData =
      !!localStorage.getItem("nk_subjects") ||
      !!localStorage.getItem("nk_sessions") ||
      !!localStorage.getItem("nk_timerState");
    if (hasData) {
      const t = setTimeout(() => setDataReady(true), 300);
      return () => clearTimeout(t);
    }
    setDataReady(true);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if ("storage" in navigator && "persist" in navigator.storage) {
      navigator.storage.persist().catch(() => {});
    }
  }, []);

  const handleComplete = useCallback((_actualMs: number) => {
    // Safety net \u2014 actual save happens in TimerScreen via EnergyRatingModal
  }, []);

  const timer = useTimer(handleComplete);
  const timerRef = useRef(timer);
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "FORCE_STOP") {
        window.location.reload();
      } else if (event.data?.type === "PAUSE_FROM_SW") {
        timerRef.current.pauseTimer();
      } else if (event.data?.type === "RESUME_FROM_SW") {
        timerRef.current.resumeTimer();
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handler);
  }, []);

  const handleOnboardingComplete = (name: string) => {
    setUsernameState(name);
    setShowOnboarding(false);
  };

  const handleSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setActiveTab("timer");
  };

  const handleClearTopic = () => {
    setSelectedTopic(null);
  };

  const timerBarVisible = timer.isRunning || timer.isPaused;

  return (
    <div
      style={{
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: palette.bg,
      }}
    >
      {!dataReady && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: palette.bg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 32 }}>\ud83e\uddedF</div>
          <div style={{ color: palette.text, fontSize: 15, fontWeight: 600 }}>
            Restoring your session\u2026
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: `3px solid ${palette.accent}30`,
              borderTop: `3px solid ${palette.accent}`,
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      )}

      {appearance.backgroundImage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${appearance.backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: appearance.backgroundOpacity,
            pointerEvents: "none",
            maxWidth: 430,
            margin: "0 auto",
          }}
        />
      )}

      <div style={{ position: "relative", zIndex: 1 }}>
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
        <NotificationBanner timerRunning={timer.isRunning || timer.isPaused} />
        <BackupIcon />
        <TimerStatusBar
          timerState={timer.timerState}
          remaining={timer.remaining}
          onGoToTimer={() => setActiveTab("timer")}
        />

        {timerBarVisible && <div style={{ height: 46 }} />}

        {activeTab === "home" && (
          <HomeScreen
            username={username || ""}
            timerState={timer.timerState}
            remaining={timer.remaining}
            onGoToTimer={() => setActiveTab("timer")}
            appearance={appearance}
          />
        )}
        {activeTab === "topics" && (
          <TopicsScreen onSelectTopic={handleSelectTopic} />
        )}
        {activeTab === "timer" && (
          <TimerScreen
            selectedTopic={selectedTopic}
            onClearTopic={handleClearTopic}
            remaining={timer.remaining}
            isRunning={timer.isRunning}
            isPaused={timer.isPaused}
            totalDuration={timer.totalDuration}
            startTimer={timer.startTimer}
            pauseTimer={timer.pauseTimer}
            resumeTimer={timer.resumeTimer}
            stopTimer={timer.stopTimer}
            onTimerComplete={handleComplete}
          />
        )}
        {activeTab === "todo" && <TodoScreen />}
        {activeTab === "dashboard" && <DashboardScreen />}
        {activeTab === "settings" && <SettingsScreen />}

        <BottomNav active={activeTab} onChange={setActiveTab} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppearanceProvider>
        <BackupProvider>
          <AppInner />
        </BackupProvider>
      </AppearanceProvider>
    </ThemeProvider>
  );
}
