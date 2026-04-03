import { Bell, BellOff, FolderOpen, RefreshCw, WifiOff } from "lucide-react";
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
import PermissionManagerScreen from "./screens/PermissionManagerScreen";
import SettingsScreen from "./screens/SettingsScreen";
import TimerScreen from "./screens/TimerScreen";
import TodoScreen from "./screens/TodoScreen";
import TopicsScreen from "./screens/TopicsScreen";
import type { TabId, Topic } from "./types";
import { PREF_KEYS, Preferences } from "./utils/preferences";
import { getUsername } from "./utils/storage";

/**
 * Safe-area-aware top offset for fixed overlay elements.
 * On phones with a camera notch this evaluates to the notch height;
 * on flat-screen phones it falls back to the provided base value.
 */
function safeTop(base: number): string {
  return `max(${base}px, calc(env(safe-area-inset-top) + ${base}px))`;
}

/** Bell icon in top-left showing notification permission status */
function BellStatusIcon() {
  const [perm, setPerm] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) setPerm(Notification.permission);
  }, []);

  // Poll every 3 seconds to detect permission changes
  useEffect(() => {
    const interval = setInterval(() => {
      if ("Notification" in window) setPerm(Notification.permission);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const isDenied = perm === "denied";
  const isGranted = perm === "granted";

  const iconColor = isDenied
    ? "#EF4444"
    : isGranted
      ? "#22C55E"
      : "rgba(255,255,255,0.35)";

  const pillBg = isDenied
    ? "rgba(239,68,68,0.08)"
    : isGranted
      ? "rgba(34,197,94,0.08)"
      : "rgba(255,255,255,0.05)";

  const pillBorder = isDenied
    ? "1px solid rgba(239,68,68,0.25)"
    : isGranted
      ? "1px solid rgba(34,197,94,0.2)"
      : "1px solid rgba(255,255,255,0.10)";

  const glow = isGranted
    ? "0 0 10px rgba(34,197,94,0.5)"
    : isDenied
      ? "0 0 8px rgba(239,68,68,0.35)"
      : "none";

  return (
    <div
      style={{
        position: "fixed",
        top: safeTop(10),
        left: 16,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 5,
        background: pillBg,
        border: pillBorder,
        borderRadius: 20,
        padding: "5px 9px",
        pointerEvents: "none",
        transition: "all 0.4s",
      }}
      title={`Notifications: ${perm}`}
    >
      {isDenied ? (
        <BellOff
          size={13}
          color={iconColor}
          style={{
            filter: glow !== "none" ? `drop-shadow(${glow})` : undefined,
            flexShrink: 0,
          }}
        />
      ) : (
        <Bell
          size={13}
          color={iconColor}
          style={{
            filter: glow !== "none" ? `drop-shadow(${glow})` : undefined,
            flexShrink: 0,
            animation: isGranted
              ? "bellPulse 2.5s ease-in-out infinite"
              : "none",
          }}
        />
      )}
    </div>
  );
}

/** Storage status badge in top-right */
function StorageStatusBadge() {
  const {
    status,
    folderLinked,
    folderName,
    linkFolderAndSync,
    triggerFullSync,
  } = useBackup();
  const [pulse, setPulse] = useState(false);
  const [showSpin, setShowSpin] = useState(false);
  const prevStatusRef = useRef<string>(status);

  useEffect(() => {
    if (status === "saving") {
      setShowSpin(true);
    } else if (prevStatusRef.current === "saving" && status === "saved") {
      setPulse(true);
      // Keep spin visible for 1 second after save
      const spinTimer = setTimeout(() => setShowSpin(false), 1000);
      const pulseTimer = setTimeout(() => setPulse(false), 800);
      return () => {
        clearTimeout(spinTimer);
        clearTimeout(pulseTimer);
      };
    } else {
      setShowSpin(false);
    }
    prevStatusRef.current = status;
  }, [status]);

  const handleClick = () => {
    if (!folderLinked) {
      linkFolderAndSync();
    } else {
      triggerFullSync();
    }
  };

  // Disconnected state
  if (!folderLinked) {
    return (
      <button
        type="button"
        onClick={handleClick}
        title="Select a folder to enable auto-save"
        data-ocid="backup.toggle"
        style={{
          position: "fixed",
          top: safeTop(10),
          right: 16,
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 20,
          padding: "5px 10px",
          cursor: "pointer",
          outline: "none",
          WebkitTapHighlightColor: "transparent",
          transition: "all 0.3s",
        }}
      >
        <WifiOff size={12} color="#EF4444" style={{ flexShrink: 0 }} />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#EF4444",
            whiteSpace: "nowrap",
            letterSpacing: "0.03em",
          }}
        >
          No Folder Linked
        </span>
      </button>
    );
  }

  // Connected / syncing
  const displayName =
    folderName.length > 12 ? `${folderName.slice(0, 12)}\u2026` : folderName;

  return (
    <div
      style={{
        position: "fixed",
        top: safeTop(10),
        right: 16,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      {/* Saved pulse label */}
      {pulse && (
        <div
          style={{
            fontSize: 10,
            color: "#22C55E",
            fontWeight: 700,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: 20,
            padding: "2px 7px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          Saved \u2713
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        title={`Linked: ${folderName} \u2014 Click to sync`}
        data-ocid="backup.toggle"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 20,
          padding: "5px 10px",
          cursor: "pointer",
          outline: "none",
          WebkitTapHighlightColor: "transparent",
          boxShadow: pulse ? "0 0 12px rgba(34,197,94,0.4)" : "none",
          transition: "all 0.3s",
        }}
      >
        {showSpin ? (
          <RefreshCw
            size={12}
            color="#22C55E"
            style={{
              animation: "spin 0.6s linear infinite",
              flexShrink: 0,
            }}
          />
        ) : (
          <FolderOpen
            size={12}
            color="#22C55E"
            style={{
              filter: "drop-shadow(0 0 5px rgba(34,197,94,0.6))",
              flexShrink: 0,
              transition: "filter 0.3s",
            }}
          />
        )}
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#22C55E",
            whiteSpace: "nowrap",
            letterSpacing: "0.02em",
          }}
        >
          Linked: {displayName}
        </span>
      </button>
    </div>
  );
}

/** Alert banner shown when linked folder becomes unreachable */
function FolderUnreachableAlert() {
  const { folderUnreachable, linkFolderAndSync } = useBackup();
  const [dismissed, setDismissed] = useState(false);

  if (!folderUnreachable || dismissed) return null;

  return (
    <div
      data-ocid="storage.error_state"
      style={{
        position: "fixed",
        bottom: 90,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: 398,
        zIndex: 300,
        background:
          "linear-gradient(135deg, rgba(245,158,11,0.95) 0%, rgba(251,191,36,0.9) 100%)",
        borderRadius: 14,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 8px 32px rgba(245,158,11,0.4)",
      }}
    >
      <WifiOff size={16} color="#1C1917" style={{ flexShrink: 0 }} />
      <p
        style={{
          fontSize: 12,
          color: "#1C1917",
          flex: 1,
          margin: 0,
          lineHeight: 1.4,
          fontWeight: 600,
        }}
      >
        Warning: Master Folder moved. Using Internal Backup.
      </p>
      <button
        type="button"
        data-ocid="storage.relink.button"
        onClick={() => {
          linkFolderAndSync();
          setDismissed(true);
        }}
        style={{
          background: "#1C1917",
          color: "#FEF3C7",
          border: "none",
          borderRadius: 8,
          padding: "5px 10px",
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        Re-link
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        data-ocid="storage.dismiss.close_button"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#1C1917",
          fontSize: 16,
          lineHeight: 1,
          flexShrink: 0,
          padding: "0 4px",
        }}
      >
        \u00d7
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
  const [showPermManager, setShowPermManager] = useState(false);

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
    // Show Permission Manager on first launch (after onboarding)
    Preferences.get({ key: PREF_KEYS.permissionsAsked }).then(({ value }) => {
      if (!value && getUsername()) {
        setShowPermManager(true);
      }
    });
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
        {showPermManager && !showOnboarding && (
          <PermissionManagerScreen
            onDismiss={() => setShowPermManager(false)}
          />
        )}
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
        <NotificationBanner timerRunning={timer.isRunning || timer.isPaused} />
        <BellStatusIcon />
        <StorageStatusBadge />
        <FolderUnreachableAlert />
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
