import {
  Bell,
  BellOff,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudOff,
  Copy,
  Database,
  Download,
  Eye,
  FolderOpen,
  Image,
  Info,
  LogIn,
  LogOut,
  Palette,
  RefreshCw,
  Share2,
  Shield,
  Smartphone,
  Star,
  Trash2,
  Upload,
  User,
  WifiOff,
  Zap,
} from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
import BellPermissionModal from "../components/BellPermissionModal";
import { useAppearance } from "../context/AppearanceContext";
import { useBackup } from "../context/BackupContext";
import { usePalette } from "../context/ThemeContext";
import { useCloudSync } from "../hooks/useCloudSync";
import type { PaletteId } from "../types";
import { isCapacitorNative } from "../utils/capacitorStorage";
import {
  exportData,
  getFolderName,
  hasFolderLinked,
  importData,
  isFolderSystemSupported,
  selectFolder,
  syncToLocalAndIDB,
  testConnection,
} from "../utils/monarchStorage";
import { PALETTES } from "../utils/palettes";
import { getUsername, setUsername } from "../utils/storage";
import PermissionManagerScreen from "./PermissionManagerScreen";

const SettingsScreen: FC = () => {
  const { paletteId, palette, setPalette } = usePalette();
  const { appearance, setAppearance } = useAppearance();
  const { status, triggerSync } = useBackup();
  const {
    isLoggedIn,
    login,
    logout,
    cloudSyncStatus,
    lastSyncedAt,
    pushToCloud,
    pullFromCloud,
    deleteCloudData,
    principal,
  } = useCloudSync();

  const [username, setUsernameLocal] = useState(getUsername() || "");
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>("default");
  const [persistedStorage, setPersistedStorage] = useState<boolean | null>(
    null,
  );
  const [storageEstimate, setStorageEstimate] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [folderLinked, setFolderLinked] = useState(hasFolderLinked());
  const [currentFolderName, setCurrentFolderName] = useState(getFolderName());
  const [importResult, setImportResult] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [bellModalOpen, setBellModalOpen] = useState(false);
  const [showPermManager, setShowPermManager] = useState(false);
  const [testNotifCountdown, setTestNotifCountdown] = useState<number | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [confirmDeleteCloud, setConfirmDeleteCloud] = useState(false);
  const [confirmPullCloud, setConfirmPullCloud] = useState(false);
  const [cloudMsg, setCloudMsg] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ("Notification" in window) setNotifPerm(Notification.permission);
    if (isCapacitorNative() && !hasFolderLinked()) {
      setFolderLinked(true);
      setCurrentFolderName("Documents/NakshaData");
    }
    if ("storage" in navigator && "persisted" in navigator.storage) {
      navigator.storage
        .persisted()
        .then(setPersistedStorage)
        .catch(() => {});
    }
    if ("storage" in navigator && "estimate" in navigator.storage) {
      navigator.storage
        .estimate()
        .then((est) => {
          const used = est.usage ? (est.usage / 1024).toFixed(1) : "?";
          const quota = est.quota ? (est.quota / 1024 / 1024).toFixed(0) : "?";
          setStorageEstimate(`${used} KB used of ${quota} MB`);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if ("Notification" in window) setNotifPerm(Notification.permission);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveName = () => {
    setUsername(username);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "denied") {
      setBellModalOpen(true);
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "denied") {
      setBellModalOpen(true);
    }
  };

  const handleTestNotification = () => {
    if (testNotifCountdown !== null) return;
    let remaining = 5;
    setTestNotifCountdown(remaining);

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setTestNotifCountdown(null);
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready
            .then((reg) => {
              reg.active?.postMessage({ type: "TEST_NOTIFICATION" });
            })
            .catch(() => {
              if (
                "Notification" in window &&
                Notification.permission === "granted"
              ) {
                new Notification("Naksha Timer", {
                  body: "Test notification \u2014 Naksha is working!",
                  icon: "/icon-192.png",
                });
              }
            });
        }
      } else {
        setTestNotifCountdown(remaining);
      }
    }, 1000);
  };

  const handlePersistStorage = async () => {
    if ("storage" in navigator && "persist" in navigator.storage) {
      const result = await navigator.storage.persist();
      setPersistedStorage(result);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAppearance({
        ...appearance,
        backgroundImage: ev.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSelectFolder = async () => {
    if (isCapacitorNative()) {
      setFolderLinked(true);
      setCurrentFolderName("Documents/NakshaData");
      triggerSync();
      return;
    }
    const linked = await selectFolder();
    if (linked) {
      setFolderLinked(true);
      setCurrentFolderName(getFolderName());
      triggerSync();
    } else {
      setTestResult(
        "\u26a0\ufe0f Folder picker not supported in this browser. Data is auto-saved to IndexedDB.",
      );
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    const result = await testConnection();
    if (result.success) {
      setTestResult(
        `\u2705 Storage Verified: All systems synced to ${result.folderName}`,
      );
    } else {
      setTestResult(
        `\u274c Connection failed: ${result.error ?? "Unknown error"}`,
      );
    }
    setTimeout(() => setTestResult(null), 5000);
  };

  const handleExport = () => {
    exportData();
  };

  const handleImport = async () => {
    setImportResult(null);
    const result = await importData();
    if (result.success) {
      setImportResult("Data restored! Reload the app to see changes.");
      setTimeout(() => setImportResult(null), 5000);
    } else {
      setImportResult(`Import failed: ${result.error ?? "Unknown error"}`);
      setTimeout(() => setImportResult(null), 5000);
    }
  };

  const handleSafeRefresh = async () => {
    setRefreshing(true);
    await syncToLocalAndIDB();
    triggerSync();
    await new Promise<void>((res) => setTimeout(res, 200));
    window.location.reload();
  };

  const handleCopyLink = async () => {
    const url = window.location.origin;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShare = async () => {
    const url = window.location.origin;
    const text = `Try Naksha \ud83e\udded \u2014 Your personal study timer app!\n\nOpen it here: ${url}\n\nTip: In Chrome, tap the menu \u2192 'Add to Home Screen' to use it as an app!`;
    if ("share" in navigator) {
      try {
        await navigator.share({ title: "Naksha \ud83e\uddedF", text, url });
        return;
      } catch {
        // user cancelled or not supported
      }
    }
    await handleCopyLink();
  };

  const handleSyncNow = async () => {
    setCloudMsg(null);
    try {
      await pushToCloud();
      setCloudMsg("\u2705 Synced to cloud!");
    } catch {
      setCloudMsg("\u274c Sync failed. Check your connection.");
    }
    setTimeout(() => setCloudMsg(null), 4000);
  };

  const handlePullCloud = async () => {
    setConfirmPullCloud(false);
    setCloudMsg(null);
    try {
      await pullFromCloud();
      setCloudMsg("\u2705 Cloud data loaded! Refresh for changes.");
    } catch {
      setCloudMsg("\u274c Pull failed. Check your connection.");
    }
    setTimeout(() => setCloudMsg(null), 5000);
  };

  const handleDeleteCloud = async () => {
    setConfirmDeleteCloud(false);
    setCloudMsg(null);
    try {
      await deleteCloudData();
      setCloudMsg("\u2705 Cloud data deleted.");
    } catch {
      setCloudMsg("\u274c Delete failed.");
    }
    setTimeout(() => setCloudMsg(null), 4000);
  };

  const sectionStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: palette.textMuted,
    fontWeight: 700,
    letterSpacing: 1,
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
    textTransform: "uppercase",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    fontSize: 15,
    color: palette.text,
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 10,
    display: "block",
    fontFamily: "inherit",
  };

  const sliderRow = (
    label: string,
    value: number,
    onChange: (v: number) => void,
    enabled = true,
  ) => (
    <div
      style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}
    >
      <span
        style={{
          fontSize: 13,
          color: palette.textMuted,
          width: 80,
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={!enabled}
        style={{ flex: 1, opacity: enabled ? 1 : 0.4 }}
      />
      <span
        style={{
          fontSize: 12,
          color: palette.textMuted,
          width: 32,
          textAlign: "right",
        }}
      >
        {Math.round(value * 100)}%
      </span>
    </div>
  );

  const toggleRow = (
    label: string,
    icon: React.ReactNode,
    checked: boolean,
    onChange: (v: boolean) => void,
  ) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <span style={{ fontSize: 14, color: palette.text }}>{label}</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 46,
          height: 26,
          borderRadius: 13,
          border: "none",
          background: checked ? palette.accent : "rgba(255,255,255,0.12)",
          position: "relative",
          cursor: "pointer",
          transition: "background 0.2s",
          flexShrink: 0,
          boxShadow: checked ? `0 0 8px ${palette.accentGlow}60` : "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 22 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.2s",
          }}
        />
      </button>
    </div>
  );

  const allPalettes = Object.values(PALETTES);

  const backupStatusColor =
    status === "saved"
      ? "#22C55E"
      : status === "saving"
        ? "#F59E0B"
        : status === "error"
          ? "#EF4444"
          : palette.textMuted;

  const backupStatusLabel =
    status === "saved"
      ? "Saved"
      : status === "saving"
        ? "Saving\u2026"
        : status === "error"
          ? "Error"
          : "No folder linked";

  const notifColor =
    notifPerm === "granted"
      ? "#22C55E"
      : notifPerm === "denied"
        ? "#EF4444"
        : "#F59E0B";

  const notifLabel =
    notifPerm === "granted"
      ? "Active \u2705"
      : notifPerm === "denied"
        ? "Blocked \u274c"
        : "Not set \u26a0\ufe0f";

  // Cloud sync status display
  const cloudStatusColor =
    cloudSyncStatus === "synced"
      ? "#22C55E"
      : cloudSyncStatus === "syncing"
        ? "#F59E0B"
        : cloudSyncStatus === "error"
          ? "#EF4444"
          : cloudSyncStatus === "offline"
            ? "rgba(255,255,255,0.4)"
            : palette.textMuted;

  const cloudStatusLabel =
    cloudSyncStatus === "synced"
      ? "Synced \u2713"
      : cloudSyncStatus === "syncing"
        ? "Syncing\u2026"
        : cloudSyncStatus === "error"
          ? "Error"
          : cloudSyncStatus === "offline"
            ? "Offline"
            : "Idle";

  const truncatedPrincipal = principal
    ? `${principal.slice(0, 8)}\u2026${principal.slice(-6)}`
    : null;

  const lastSyncLabel = lastSyncedAt
    ? (() => {
        const diffMs = Date.now() - lastSyncedAt.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return "Just now";
        if (diffMin < 60) return `${diffMin}m ago`;
        const diffHr = Math.floor(diffMin / 60);
        return `${diffHr}h ago`;
      })()
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.bg,
        padding: "20px 16px 110px",
        maxWidth: 430,
        margin: "0 auto",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <BellPermissionModal
        open={bellModalOpen}
        onClose={() => setBellModalOpen(false)}
      />

      <h2
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: palette.text,
          margin: "0 0 20px",
        }}
      >
        Settings
      </h2>

      {/* Profile */}
      <div style={sectionStyle}>
        <div style={labelStyle}>
          <User size={13} /> Profile
        </div>
        <input
          id="settings-username"
          data-ocid="settings.username.input"
          type="text"
          value={username}
          onChange={(e) => setUsernameLocal(e.target.value)}
          placeholder="Your name"
          style={inputStyle}
        />
        <button
          type="button"
          data-ocid="settings.username.save_button"
          onClick={handleSaveName}
          style={{
            padding: "10px 20px",
            borderRadius: 50,
            border: saved
              ? "1px solid rgba(34,197,94,0.5)"
              : `1px solid ${palette.accent}50`,
            background: saved ? "rgba(34,197,94,0.12)" : `${palette.accent}14`,
            color: saved ? "#22C55E" : palette.accent,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: saved
              ? "0 0 10px rgba(34,197,94,0.3)"
              : `0 0 10px ${palette.accentGlow}25`,
            transition: "all 0.3s",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {saved && <Check size={14} />}
          {saved ? "Saved!" : "Save Name"}
        </button>
      </div>

      {/* Theme Center */}
      <div style={sectionStyle}>
        <div style={labelStyle}>
          <Palette size={13} /> Theme Center
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
          }}
        >
          {allPalettes.map((p) => {
            const isActive = paletteId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                data-ocid={`settings.theme.${p.id}.button`}
                onClick={() => setPalette(p.id as PaletteId)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "10px 6px",
                  borderRadius: 14,
                  border: isActive
                    ? `1.5px solid ${p.accent}`
                    : "1px solid rgba(255,255,255,0.08)",
                  background: isActive ? `${p.accent}14` : p.bg,
                  cursor: "pointer",
                  transition: "all 0.2s",
                  boxShadow: isActive ? `0 0 14px ${p.accentGlow}50` : "none",
                  position: "relative",
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: p.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: `0 0 6px ${p.accentGlow}`,
                    }}
                  >
                    <Check size={8} color="#000" strokeWidth={3} />
                  </div>
                )}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: p.accent,
                    boxShadow: `0 0 12px ${p.accentGlow}80`,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    color: isActive ? p.accent : "rgba(255,255,255,0.5)",
                    fontWeight: isActive ? 700 : 400,
                    textAlign: "center",
                    lineHeight: 1.2,
                  }}
                >
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      <div style={sectionStyle}>
        <div style={labelStyle}>
          {notifPerm === "granted" ? <Bell size={13} /> : <BellOff size={13} />}
          Notifications
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 14, color: palette.text }}>Status</span>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: notifColor,
              background: `${notifColor}14`,
              border: `1px solid ${notifColor}40`,
              borderRadius: 20,
              padding: "3px 10px",
              boxShadow:
                notifPerm === "granted"
                  ? "0 0 8px rgba(34,197,94,0.3)"
                  : "none",
            }}
          >
            {notifLabel}
          </span>
        </div>

        <button
          type="button"
          data-ocid="settings.notifications.primary_button"
          onClick={handleEnableNotifications}
          style={{
            width: "100%",
            padding: "11px 16px",
            borderRadius: 12,
            border:
              notifPerm === "granted"
                ? "1px solid rgba(34,197,94,0.4)"
                : notifPerm === "denied"
                  ? "1px solid rgba(239,68,68,0.4)"
                  : `1px solid ${palette.accent}50`,
            background:
              notifPerm === "granted"
                ? "rgba(34,197,94,0.08)"
                : notifPerm === "denied"
                  ? "rgba(239,68,68,0.08)"
                  : `${palette.accent}14`,
            color:
              notifPerm === "granted"
                ? "#22C55E"
                : notifPerm === "denied"
                  ? "#EF4444"
                  : palette.accent,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
            transition: "all 0.2s",
          }}
        >
          <Bell size={15} />
          {notifPerm === "granted"
            ? "Notifications Enabled \u2705"
            : notifPerm === "denied"
              ? "Enable in Phone Settings"
              : "Enable Timer Notifications"}
        </button>

        <button
          type="button"
          data-ocid="settings.notifications.secondary_button"
          onClick={handleTestNotification}
          disabled={testNotifCountdown !== null}
          style={{
            width: "100%",
            padding: "11px 16px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: testNotifCountdown !== null ? "#F59E0B" : palette.text,
            fontSize: 14,
            fontWeight: 600,
            cursor: testNotifCountdown !== null ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: testNotifCountdown !== null ? 0.85 : 1,
            transition: "all 0.2s",
          }}
        >
          <Bell size={15} />
          {testNotifCountdown !== null
            ? `Testing in ${testNotifCountdown}s\u2026`
            : "Test Notification (5s delay)"}
        </button>

        {notifPerm === "denied" && (
          <div
            style={{
              marginTop: 10,
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              fontSize: 12,
              color: "rgba(239,68,68,0.9)",
              lineHeight: 1.5,
            }}
          >
            Notifications are blocked. Tap \u201cEnable in Phone Settings\u201d
            above for instructions.
          </div>
        )}

        <button
          type="button"
          data-ocid="settings.permissions.button"
          onClick={() => setShowPermManager(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "10px 14px",
            color: "rgba(255,255,255,0.7)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            marginTop: 8,
          }}
        >
          <Shield size={15} />
          Permission Manager
        </button>
      </div>

      {/* Data Management */}
      <div style={sectionStyle}>
        <div style={labelStyle}>
          <FolderOpen size={13} /> Data Management
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {folderLinked ? (
            <FolderOpen
              size={16}
              color={backupStatusColor}
              style={{
                filter:
                  status === "saved"
                    ? "drop-shadow(0 0 6px rgba(34,197,94,0.8))"
                    : undefined,
                transition: "color 0.4s, filter 0.4s",
                flexShrink: 0,
              }}
            />
          ) : (
            <WifiOff size={16} color="#EF4444" style={{ flexShrink: 0 }} />
          )}
          <span style={{ fontSize: 13, color: palette.text, flex: 1 }}>
            {folderLinked ? (
              <>
                Master Folder:{" "}
                <strong
                  style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13 }}
                >
                  {currentFolderName || "(linked)"}
                </strong>
              </>
            ) : (
              "No Folder Linked"
            )}
          </span>
          <span
            style={{
              fontSize: 11,
              color: folderLinked ? backupStatusColor : "#EF4444",
              fontWeight: 600,
            }}
          >
            {folderLinked ? backupStatusLabel : "Disconnected"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <button
            type="button"
            data-ocid="settings.monarch.primary_button"
            onClick={handleSafeRefresh}
            disabled={refreshing}
            style={{
              flex: 1,
              padding: "11px 16px",
              borderRadius: 12,
              border: `1px solid ${palette.accent}40`,
              background: `${palette.accent}0C`,
              color: palette.accent,
              fontSize: 14,
              fontWeight: 600,
              cursor: refreshing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: refreshing ? 0.7 : 1,
              transition: "all 0.2s",
            }}
          >
            <RefreshCw
              size={15}
              style={{
                animation: refreshing ? "spin 0.6s linear infinite" : "none",
              }}
            />
            {refreshing ? "Saving\u2026" : "Refresh & Sync"}
          </button>
          {(status === "saved" || status === "idle") && !refreshing && (
            <div
              data-ocid="settings.monarch.success_state"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "6px 10px",
                borderRadius: 20,
                background: "rgba(34,197,94,0.10)",
                border: "1px solid rgba(34,197,94,0.3)",
                flexShrink: 0,
              }}
            >
              <CheckCircle size={13} color="#22C55E" />
              <span style={{ fontSize: 11, color: "#22C55E", fontWeight: 600 }}>
                Saved
              </span>
            </div>
          )}
        </div>

        {isFolderSystemSupported() && (
          <button
            type="button"
            data-ocid="settings.monarch.link_button"
            onClick={handleSelectFolder}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: 12,
              border: folderLinked
                ? "1.5px solid rgba(34,197,94,0.5)"
                : `1px solid ${palette.accent}40`,
              background: folderLinked
                ? "rgba(34,197,94,0.10)"
                : `${palette.accent}0C`,
              color: folderLinked ? "#22C55E" : palette.accent,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: folderLinked ? 6 : 10,
              transition: "all 0.2s",
              boxShadow: folderLinked
                ? "0 0 14px rgba(34,197,94,0.25), inset 0 0 0 1px rgba(34,197,94,0.2)"
                : "none",
            }}
          >
            <FolderOpen size={15} />
            {folderLinked ? "Re-select Folder" : "Select Folder"}
          </button>
        )}

        {folderLinked && currentFolderName && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
              padding: "8px 12px",
              borderRadius: 10,
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.15)",
            }}
          >
            <FolderOpen size={13} color="#22C55E" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "#FFFFFF",
                letterSpacing: "0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentFolderName}
            </span>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <button
            type="button"
            data-ocid="settings.monarch.change_dir.button"
            onClick={handleSelectFolder}
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: palette.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 7,
              transition: "all 0.2s",
            }}
          >
            <FolderOpen size={14} />
            Change Directory
          </button>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.4)",
              padding: "6px 10px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              maxWidth: 140,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={
              isCapacitorNative()
                ? `Documents/NakshaData${currentFolderName && currentFolderName !== "Documents" ? ` \u2192 ${currentFolderName}` : ""}`
                : currentFolderName || "NakshaData (default)"
            }
          >
            {isCapacitorNative()
              ? "Documents/NakshaData"
              : currentFolderName
                ? currentFolderName
                : "NakshaData (default)"}
          </div>
        </div>

        {!isFolderSystemSupported() && (
          <p
            style={{
              fontSize: 12,
              color: palette.textMuted,
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            Folder picker is not supported in this browser. Use Export/Import
            below to back up your data manually.
          </p>
        )}

        {folderLinked && (
          <button
            type="button"
            data-ocid="settings.monarch.secondary_button"
            onClick={handleTestConnection}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: palette.text,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 10,
              transition: "all 0.2s",
            }}
          >
            <CheckCircle size={15} />
            Test Connection
          </button>
        )}

        {testResult && (
          <div
            data-ocid="settings.monarch.success_state"
            style={{
              marginBottom: 10,
              padding: "8px 12px",
              borderRadius: 8,
              background: testResult.startsWith("\u274c")
                ? "rgba(239,68,68,0.10)"
                : "rgba(34,197,94,0.10)",
              border: testResult.startsWith("\u274c")
                ? "1px solid rgba(239,68,68,0.3)"
                : "1px solid rgba(34,197,94,0.3)",
              fontSize: 12,
              color: testResult.startsWith("\u274c") ? "#EF4444" : "#22C55E",
              lineHeight: 1.4,
            }}
          >
            {testResult}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            data-ocid="settings.monarch.export_button"
            onClick={handleExport}
            style={{
              flex: 1,
              padding: "11px 12px",
              borderRadius: 12,
              border: `1px solid ${palette.accent}40`,
              background: `${palette.accent}0C`,
              color: palette.accent,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Download size={14} /> Export Data
          </button>
          <button
            type="button"
            data-ocid="settings.monarch.import_button"
            onClick={handleImport}
            style={{
              flex: 1,
              padding: "11px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: palette.text,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Upload size={14} /> Import Data
          </button>
        </div>

        {importResult && (
          <div
            style={{
              marginTop: 10,
              padding: "8px 12px",
              borderRadius: 8,
              background: importResult.startsWith("Import failed")
                ? "rgba(239,68,68,0.10)"
                : "rgba(34,197,94,0.10)",
              border: importResult.startsWith("Import failed")
                ? "1px solid rgba(239,68,68,0.3)"
                : "1px solid rgba(34,197,94,0.3)",
              fontSize: 12,
              color: importResult.startsWith("Import failed")
                ? "#EF4444"
                : "#22C55E",
              lineHeight: 1.4,
            }}
          >
            {importResult}
          </div>
        )}
      </div>

      {/* Browser Storage */}
      <div style={sectionStyle}>
        <div style={labelStyle}>
          <Database size={13} /> Browser Storage
        </div>
        {storageEstimate && (
          <p style={{ fontSize: 14, color: palette.text, margin: "0 0 8px" }}>
            Local usage:{" "}
            <strong style={{ color: palette.accent }}>{storageEstimate}</strong>
          </p>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 14, color: palette.text }}>
            Persistent:{" "}
            <strong style={{ color: persistedStorage ? "#22C55E" : "#F59E0B" }}>
              {persistedStorage === null
                ? "..."
                : persistedStorage
                  ? "Yes"
                  : "No"}
            </strong>
          </span>
          {!persistedStorage && (
            <button
              type="button"
              data-ocid="settings.storage.primary_button"
              onClick={handlePersistStorage}
              style={{
                padding: "8px 14px",
                borderRadius: 50,
                border: `1px solid ${palette.accent}40`,
                background: `${palette.accent}10`,
                color: palette.accent,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Enable
            </button>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div style={sectionStyle}>
        <div style={labelStyle}>
          <Eye size={13} /> Appearance
        </div>

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 13,
              color: palette.text,
              fontWeight: 600,
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Image size={13} style={{ display: "inline" }} /> Background Image
          </div>
          {appearance.backgroundImage ? (
            <div style={{ marginBottom: 10 }}>
              <img
                src={appearance.backgroundImage}
                alt="Background preview"
                style={{
                  width: "100%",
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 10,
                  marginBottom: 8,
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              />
              <button
                type="button"
                data-ocid="settings.appearance.delete_button"
                onClick={() =>
                  setAppearance({ ...appearance, backgroundImage: null })
                }
                style={{
                  padding: "6px 14px",
                  borderRadius: 50,
                  border: "1px solid rgba(239,68,68,0.4)",
                  background: "rgba(239,68,68,0.08)",
                  color: "#EF4444",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                Remove Image
              </button>
            </div>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleBgUpload}
            style={{ display: "none" }}
          />
          <button
            type="button"
            data-ocid="settings.appearance.upload_button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "8px 16px",
              borderRadius: 50,
              border: "1px dashed rgba(255,255,255,0.20)",
              background: "transparent",
              color: palette.textMuted,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Upload Image
          </button>
          {appearance.backgroundImage &&
            sliderRow("Opacity", appearance.backgroundOpacity, (v) =>
              setAppearance({ ...appearance, backgroundOpacity: v }),
            )}
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              color: palette.text,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            \u2728 Living Space
          </div>
          {toggleRow(
            "Stars",
            <Star size={14} color={palette.textMuted} />,
            appearance.starsEnabled,
            (v) => setAppearance({ ...appearance, starsEnabled: v }),
          )}
          {appearance.starsEnabled &&
            sliderRow("Opacity", appearance.starsOpacity, (v) =>
              setAppearance({ ...appearance, starsOpacity: v }),
            )}
          <div style={{ height: 10 }} />
          {toggleRow(
            "Shooting Stars",
            <Zap size={14} color={palette.textMuted} />,
            appearance.shootingStarsEnabled,
            (v) => setAppearance({ ...appearance, shootingStarsEnabled: v }),
          )}
          {appearance.shootingStarsEnabled &&
            sliderRow("Opacity", appearance.shootingStarsOpacity, (v) =>
              setAppearance({ ...appearance, shootingStarsOpacity: v }),
            )}
          <div style={{ height: 10 }} />
          {toggleRow(
            "Orion Belt",
            <Star size={14} color={palette.textMuted} />,
            appearance.orionBeltEnabled,
            (v) => setAppearance({ ...appearance, orionBeltEnabled: v }),
          )}
          {appearance.orionBeltEnabled &&
            sliderRow("Opacity", appearance.orionBeltOpacity, (v) =>
              setAppearance({ ...appearance, orionBeltOpacity: v }),
            )}
        </div>
      </div>

      {/* ===== CLOUD SYNC & ACCOUNT ===== */}
      <div style={sectionStyle}>
        <div style={labelStyle}>
          <Cloud size={13} /> Cloud Sync &amp; Account
        </div>

        {!isLoggedIn ? (
          /* --- Logged OUT state --- */
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 14,
              }}
            >
              <CloudOff size={15} color="rgba(255,255,255,0.35)" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.4)",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 20,
                  padding: "3px 10px",
                }}
              >
                Not logged in
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: palette.textMuted,
                lineHeight: 1.5,
                margin: "0 0 14px",
              }}
            >
              Log in to backup your study data to the cloud and access it from
              any device \u2014 even if you lose your phone.
            </p>
            <button
              type="button"
              data-ocid="settings.cloud.login.primary_button"
              onClick={login}
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: 14,
                border: `1.5px solid ${palette.accent}60`,
                background: `${palette.accent}18`,
                color: palette.accent,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: `0 0 20px ${palette.accentGlow}30`,
                transition: "all 0.25s",
              }}
            >
              <LogIn size={17} />
              Login with Internet Identity
            </button>
          </>
        ) : (
          /* --- Logged IN state --- */
          <>
            {/* Principal pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <User size={14} color="#22C55E" />
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#22C55E",
                  background: "rgba(34,197,94,0.10)",
                  border: "1px solid rgba(34,197,94,0.35)",
                  borderRadius: 20,
                  padding: "3px 10px",
                  fontFamily: "monospace",
                  boxShadow: "0 0 8px rgba(34,197,94,0.2)",
                }}
              >
                {truncatedPrincipal}
              </span>
            </div>

            {/* Sync status + last synced */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 14,
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: cloudStatusColor,
                  background: `${cloudStatusColor}14`,
                  border: `1px solid ${cloudStatusColor}40`,
                  borderRadius: 20,
                  padding: "3px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  boxShadow:
                    cloudSyncStatus === "synced"
                      ? "0 0 8px rgba(34,197,94,0.25)"
                      : cloudSyncStatus === "syncing"
                        ? "0 0 8px rgba(245,158,11,0.3)"
                        : "none",
                  animation:
                    cloudSyncStatus === "syncing"
                      ? "pulse 1s ease-in-out infinite"
                      : "none",
                }}
              >
                <Cloud size={11} />
                {cloudStatusLabel}
              </span>
              {lastSyncLabel && (
                <span style={{ fontSize: 11, color: palette.textMuted }}>
                  Last synced: {lastSyncLabel}
                </span>
              )}
            </div>

            {/* Feedback message */}
            {cloudMsg && (
              <div
                data-ocid="settings.cloud.success_state"
                style={{
                  marginBottom: 12,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: cloudMsg.startsWith("\u274c")
                    ? "rgba(239,68,68,0.10)"
                    : "rgba(34,197,94,0.10)",
                  border: cloudMsg.startsWith("\u274c")
                    ? "1px solid rgba(239,68,68,0.3)"
                    : "1px solid rgba(34,197,94,0.3)",
                  fontSize: 12,
                  color: cloudMsg.startsWith("\u274c") ? "#EF4444" : "#22C55E",
                  lineHeight: 1.4,
                }}
              >
                {cloudMsg}
              </div>
            )}

            {/* Sync Now button */}
            <button
              type="button"
              data-ocid="settings.cloud.sync.primary_button"
              onClick={handleSyncNow}
              disabled={cloudSyncStatus === "syncing"}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: 12,
                border: `1px solid ${palette.accent}50`,
                background: `${palette.accent}12`,
                color: palette.accent,
                fontSize: 14,
                fontWeight: 700,
                cursor:
                  cloudSyncStatus === "syncing" ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
                opacity: cloudSyncStatus === "syncing" ? 0.7 : 1,
                transition: "all 0.2s",
                boxShadow: `0 0 12px ${palette.accentGlow}20`,
              }}
            >
              <RefreshCw
                size={15}
                style={{
                  animation:
                    cloudSyncStatus === "syncing"
                      ? "spin 0.6s linear infinite"
                      : "none",
                }}
              />
              {cloudSyncStatus === "syncing" ? "Syncing\u2026" : "Sync Now"}
            </button>

            {/* Pull from Cloud button */}
            {!confirmPullCloud ? (
              <button
                type="button"
                data-ocid="settings.cloud.pull.secondary_button"
                onClick={() => setConfirmPullCloud(true)}
                style={{
                  width: "100%",
                  padding: "11px 16px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  color: palette.text,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                  transition: "all 0.2s",
                }}
              >
                <Download size={15} />
                Pull from Cloud
              </button>
            ) : (
              <div
                style={{
                  marginBottom: 8,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.3)",
                }}
              >
                <p
                  style={{
                    fontSize: 13,
                    color: "#F59E0B",
                    margin: "0 0 10px",
                    fontWeight: 600,
                  }}
                >
                  \u26a0\ufe0f This will overwrite your local data with cloud
                  data. Continue?
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    data-ocid="settings.cloud.pull.confirm_button"
                    onClick={handlePullCloud}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(245,158,11,0.5)",
                      background: "rgba(245,158,11,0.15)",
                      color: "#F59E0B",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Yes, overwrite
                  </button>
                  <button
                    type="button"
                    data-ocid="settings.cloud.pull.cancel_button"
                    onClick={() => setConfirmPullCloud(false)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.05)",
                      color: palette.textMuted,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Logout + Delete row */}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                data-ocid="settings.cloud.logout.button"
                onClick={logout}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 0.2s",
                }}
              >
                <LogOut size={14} />
                Logout
              </button>

              {!confirmDeleteCloud ? (
                <button
                  type="button"
                  data-ocid="settings.cloud.delete.delete_button"
                  onClick={() => setConfirmDeleteCloud(true)}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.06)",
                    color: "#EF4444",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.2s",
                  }}
                >
                  <Trash2 size={14} />
                  Delete Cloud Data
                </button>
              ) : (
                <button
                  type="button"
                  data-ocid="settings.cloud.delete.confirm_button"
                  onClick={handleDeleteCloud}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: "1.5px solid rgba(239,68,68,0.7)",
                    background: "rgba(239,68,68,0.15)",
                    color: "#EF4444",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    animation: "pulse 0.8s ease-in-out 2",
                  }}
                >
                  \u274c Confirm Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* ===== SHARE NAKSHA ===== */}
      <div style={sectionStyle}>
        <div style={labelStyle}>
          <Share2 size={13} /> Share Naksha
        </div>

        <p
          style={{
            fontSize: 13,
            color: palette.textMuted,
            lineHeight: 1.6,
            margin: "0 0 16px",
          }}
        >
          Share Naksha with friends! They can open it in any browser and add it
          to their home screen \u2014 no install required.
        </p>

        {/* Action buttons row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button
            type="button"
            data-ocid="settings.share.copy.primary_button"
            onClick={handleCopyLink}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: copied
                ? "1px solid rgba(34,197,94,0.5)"
                : "1px solid rgba(255,255,255,0.14)",
              background: copied
                ? "rgba(34,197,94,0.10)"
                : "rgba(255,255,255,0.05)",
              color: copied ? "#22C55E" : palette.text,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              transition: "all 0.25s",
              boxShadow: copied ? "0 0 12px rgba(34,197,94,0.2)" : "none",
            }}
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>

          <button
            type="button"
            data-ocid="settings.share.share.primary_button"
            onClick={handleShare}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRadius: 12,
              border: `1.5px solid ${palette.accent}55`,
              background: `${palette.accent}15`,
              color: palette.accent,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
              boxShadow: `0 0 14px ${palette.accentGlow}25`,
              transition: "all 0.25s",
            }}
          >
            <Share2 size={15} />
            Share
          </button>
        </div>

        {/* How to install as App — expandable card */}
        <button
          type="button"
          data-ocid="settings.share.install_guide.toggle"
          onClick={() => setShowInstallGuide((v) => !v)}
          style={{
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: showInstallGuide
              ? `1px solid ${palette.accent}40`
              : "1px solid rgba(255,255,255,0.10)",
            background: showInstallGuide
              ? `${palette.accent}0A`
              : "rgba(255,255,255,0.04)",
            color: showInstallGuide ? palette.accent : palette.textMuted,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "all 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Smartphone size={14} />
            How to install as App
          </div>
          {showInstallGuide ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>

        {showInstallGuide && (
          <div
            style={{
              marginTop: 8,
              padding: "14px 16px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: palette.accent,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: 5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                \ud83e\udd16 Android
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: palette.text,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Open in <strong>Chrome</strong> \u2192 tap the{" "}
                <strong>\u22ef menu</strong> (top-right) \u2192 tap{" "}
                <strong>\u2018Add to Home screen\u2019</strong>
              </p>
            </div>
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.07)",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: palette.accent,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  marginBottom: 5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                \ud83c\udf4e iPhone
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: palette.text,
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Open in <strong>Safari</strong> \u2192 tap the{" "}
                <strong>Share button</strong> \u2192 tap{" "}
                <strong>\u2018Add to Home Screen\u2019</strong>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* About */}
      <div style={{ ...sectionStyle, textAlign: "center" }}>
        <Info
          size={24}
          color={palette.accent}
          style={{
            marginBottom: 8,
            filter: `drop-shadow(0 0 8px ${palette.accentGlow})`,
          }}
        />
        <h3
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: palette.text,
            margin: "0 0 4px",
          }}
        >
          Naksha \ud83e\uddedF
        </h3>
        <p style={{ fontSize: 13, color: palette.accent, margin: "0 0 4px" }}>
          Your Time. Your Orbit. \ud83e\ude90
        </p>
        <p style={{ fontSize: 12, color: palette.textMuted, margin: 0 }}>
          Version 1.9.0
        </p>
      </div>

      {showPermManager && (
        <PermissionManagerScreen onDismiss={() => setShowPermManager(false)} />
      )}
    </div>
  );
};

export default SettingsScreen;
