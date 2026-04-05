import { RefreshCw, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "./components/BottomNav";
import InstallPrompt from "./components/InstallPrompt";
import NotificationBanner from "./components/NotificationBanner";
import Onboarding from "./components/Onboarding";
import SplashScreen from "./components/SplashScreen";
import TimerStatusBar from "./components/TimerStatusBar";
import TopBar, { TOP_BAR_HEIGHT } from "./components/TopBar";
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
import { ensureNakshaDataDir } from "./utils/capacitorStorage";
import { ensureFilesystemPermissions } from "./utils/nativePermissions";
import { PREF_KEYS, Preferences } from "./utils/preferences";
import { getUsername } from "./utils/storage";

/** Height of the fixed bottom nav dock (must match BottomNav CSS) */
const BOTTOM_NAV_H = 70;

/**
 * Minimal floating sync indicator — only visible while saving.
 * Zero chrome when idle.
 */
function SyncIndicator() {
  const { status } = useBackup();
  const isSaving = status === "saving";

  if (!isSaving) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: `calc(${TOP_BAR_HEIGHT}px + env(safe-area-inset-top, 0px) + 8px)`,
        right: 12,
        zIndex: 600,
        display: "flex",
        alignItems: "center",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <RefreshCw
        size={16}
        color="var(--accent)"
        style={{
          animation: "spin 0.6s linear infinite",
          filter: "drop-shadow(0 0 6px var(--accent))",
        }}
      />
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
        bottom: `calc(${BOTTOM_NAV_H + 10}px + env(safe-area-inset-bottom, 0px))`,
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
          touchAction: "manipulation",
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
          touchAction: "manipulation",
        }}
      >
        &times;
      </button>
    </div>
  );
}

/** One-time tooltip prompting user to install for full-screen experience */
function FullScreenTip() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)",
    ).matches;
    const alreadySeen = localStorage.getItem("naksha-fullscreen-tip");
    if (!isStandalone && !alreadySeen) {
      const timer = setTimeout(() => setVisible(true), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("naksha-fullscreen-tip", "1");
  };

  if (!visible) return null;

  return (
    <div
      data-ocid="fullscreen.tip.toast"
      style={{
        position: "fixed",
        bottom: `calc(${BOTTOM_NAV_H + 10}px + env(safe-area-inset-bottom, 0px) + 8px)`,
        left: 16,
        right: 16,
        zIndex: 8500,
        background: "rgba(15,25,18,0.96)",
        border: "1px solid rgba(29,185,84,0.3)",
        borderRadius: 12,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      }}
    >
      <span style={{ fontSize: 16 }}>&#x1F4F2;</span>
      <span
        style={{
          flex: 1,
          fontSize: 12,
          color: "rgba(255,255,255,0.85)",
          lineHeight: 1.4,
        }}
      >
        Install this app for the full-screen experience.
      </span>
      <button
        type="button"
        onClick={handleDismiss}
        data-ocid="fullscreen.tip.close_button"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "rgba(255,255,255,0.5)",
          fontSize: 18,
          lineHeight: 1,
          padding: "0 2px",
          flexShrink: 0,
          touchAction: "manipulation",
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
  const [splashDone, setSplashDone] = useState(false);
  const [splashHide, setSplashHide] = useState(false);

  const { palette } = useTheme();
  const { appearance } = useAppearance();

  // Immediately signal splash to dismiss on mount — zero-latency boot
  useEffect(() => {
    setSplashHide(true);
  }, []);

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
    ensureFilesystemPermissions()
      .then(() => ensureNakshaDataDir())
      .catch(() => {});
    Preferences.get({ key: PREF_KEYS.permissionsAsked }).then(({ value }) => {
      if (!value && getUsername()) {
        setShowPermManager(true);
      }
    });
  }, []);

  const handleComplete = useCallback((_actualMs: number) => {}, []);

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

  const handleClearTopic = () => setSelectedTopic(null);
  const timerBarVisible = timer.isRunning || timer.isPaused;

  if (!splashDone) {
    return (
      <SplashScreen
        onDone={() => setSplashDone(true)}
        hideSignal={splashHide}
      />
    );
  }

  // Total top offset: TopBar height + safe area inset
  const topOffset = `calc(${TOP_BAR_HEIGHT}px + env(safe-area-inset-top, 0px))`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: palette.bg,
      }}
    >
      {/* Persistent top bar: Naksha glow + online/offline */}
      <TopBar />

      {/* Floating sync indicator */}
      <SyncIndicator />

      {/* Fixed bottom dock nav — z-index 100 */}
      <BottomNav active={activeTab} onChange={setActiveTab} />

      {/* Centered max-width content shell */}
      <div
        style={{
          maxWidth: 430,
          width: "100%",
          margin: "0 auto",
          height: "100%",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          // Push content below the top bar
          paddingTop: topOffset,
          paddingBottom: `calc(${BOTTOM_NAV_H}px + env(safe-area-inset-bottom, 0px))`,
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
            overflow: "hidden",
          }}
        >
          {showPermManager && !showOnboarding && (
            <PermissionManagerScreen
              onDismiss={() => setShowPermManager(false)}
            />
          )}
          {showOnboarding && (
            <Onboarding onComplete={handleOnboardingComplete} />
          )}

          <NotificationBanner
            timerRunning={timer.isRunning || timer.isPaused}
          />
          <FolderUnreachableAlert />
          <TimerStatusBar
            timerState={timer.timerState}
            remaining={timer.remaining}
            onGoToTimer={() => setActiveTab("timer")}
          />

          {timerBarVisible && <div style={{ height: 46 }} />}

          {/* Main content area */}
          <div
            style={{
              flex: 1,
              overflow: "hidden",
              minHeight: 0,
              position: "relative",
            }}
          >
            <div
              key={activeTab}
              className="page-enter"
              style={{ height: "100%" }}
            >
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
          </div>
        </div>
      </div>

      {/* Install-to-home-screen prompt banner */}
      <InstallPrompt />

      {/* One-time full-screen tip */}
      <FullScreenTip />
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
