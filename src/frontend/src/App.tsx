import { Bell, BellOff, RefreshCw, WifiOff } from "lucide-react";
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
import { ensureNotificationPermissionOnce } from "./utils/capacitorNotifications";
import { ensureNakshaDataDir } from "./utils/capacitorStorage";
import { PREF_KEYS, Preferences } from "./utils/preferences";
import { getUsername } from "./utils/storage";

/**
 * Slim header bar at the very top of the app.
 * Shows app name on the left; sync icon on the right ONLY while saving.
 */
function HeaderBar() {
  const { status } = useBackup();
  const { palette } = useTheme();
  const isSaving = status === "saving";

  return (
    <div
      style={{
        height: 44,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 16,
        paddingRight: 16,
        paddingTop: "env(safe-area-inset-top)",
        background: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: palette.textMuted ?? "rgba(255,255,255,0.45)",
          letterSpacing: "0.02em",
        }}
      >
        Naksha &#x1F9ED;
      </span>

      {/* Sync icon — only appears when saving */}
      <div
        style={{
          opacity: isSaving ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
        }}
        aria-hidden={!isSaving}
      >
        <RefreshCw
          size={18}
          color="var(--accent)"
          style={{ animation: isSaving ? "spin 0.6s linear infinite" : "none" }}
        />
      </div>
    </div>
  );
}

/**
 * Status bar above BottomNav — compact, non-fixed.
 * Shows notification status on the left and folder/storage status on the right.
 */
function AppStatusBar() {
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const { folderLinked, folderName } = useBackup();

  useEffect(() => {
    if ("Notification" in window) setPerm(Notification.permission);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if ("Notification" in window) setPerm(Notification.permission);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleBellTap = async () => {
    await ensureNotificationPermissionOnce();
    if ("Notification" in window) setPerm(Notification.permission);
  };

  const isDenied = perm === "denied";
  const isGranted = perm === "granted";
  const bellColor = isDenied
    ? "#EF4444"
    : isGranted
      ? "#22C55E"
      : "rgba(255,255,255,0.35)";

  const displayFolder = folderName
    ? folderName.slice(0, 14) + (folderName.length > 14 ? "\u2026" : "")
    : "NakshaData";

  return (
    <div
      data-ocid="app.status_bar"
      style={{
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingLeft: 16,
        paddingRight: 16,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}
    >
      {/* Left: notification status */}
      <button
        type="button"
        onClick={handleBellTap}
        data-ocid="app.notifications.toggle"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "4px 0",
          minHeight: 28,
        }}
        aria-label={`Notifications: ${perm}`}
      >
        {isDenied ? (
          <BellOff size={14} color={bellColor} style={{ flexShrink: 0 }} />
        ) : (
          <Bell
            size={14}
            color={bellColor}
            style={{
              flexShrink: 0,
              filter: isGranted
                ? "drop-shadow(0 0 4px rgba(34,197,94,0.7))"
                : "none",
              animation: isGranted
                ? "bellPulse 2.5s ease-in-out infinite"
                : "none",
            }}
          />
        )}
        <span
          style={{
            fontSize: 10,
            color: bellColor,
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          Notifications
        </span>
      </button>

      {/* Right: folder / storage status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: folderLinked ? "#22C55E" : "#EF4444",
            flexShrink: 0,
            boxShadow: folderLinked
              ? "0 0 6px rgba(34,197,94,0.7)"
              : "0 0 5px rgba(239,68,68,0.5)",
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.45)",
            fontWeight: 500,
            maxWidth: 100,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayFolder}
        </span>
      </div>
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
        zIndex: 150,
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
        &times;
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
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if ("storage" in navigator && "persist" in navigator.storage) {
      navigator.storage.persist().catch(() => {});
    }
    // Ensure NakshaData directory exists on native
    ensureNakshaDataDir().catch(() => {});
    // Show Permission Manager on first launch (after onboarding)
    Preferences.get({ key: PREF_KEYS.permissionsAsked }).then(({ value }) => {
      if (!value && getUsername()) {
        setShowPermManager(true);
      }
    });
  }, []);

  const handleComplete = useCallback((_actualMs: number) => {
    // Safety net — actual save happens in TimerScreen via EnergyRatingModal
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
        display: "flex",
        flexDirection: "column",
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
          <div style={{ fontSize: 32 }}>&#x1F9ED;</div>
          <div style={{ color: palette.text, fontSize: 15, fontWeight: 600 }}>
            Restoring your session&hellip;
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

      {/* Main layout column — z-index 1 above background */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: "100vh",
        }}
      >
        {showPermManager && !showOnboarding && (
          <PermissionManagerScreen
            onDismiss={() => setShowPermManager(false)}
          />
        )}
        {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}

        {/* Slim header bar with app name + sync icon */}
        <HeaderBar />

        <NotificationBanner timerRunning={timer.isRunning || timer.isPaused} />
        <FolderUnreachableAlert />
        <TimerStatusBar
          timerState={timer.timerState}
          remaining={timer.remaining}
          onGoToTimer={() => setActiveTab("timer")}
        />

        {timerBarVisible && <div style={{ height: 46 }} />}

        {/* Main content area */}
        <div style={{ flex: 1, overflow: "hidden" }}>
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
        </div>

        {/* Status bar above bottom nav */}
        <AppStatusBar />

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
