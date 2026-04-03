import {
  Bell,
  BellOff,
  Check,
  CheckCircle,
  Database,
  Download,
  Eye,
  FolderOpen,
  Image,
  Info,
  Palette,
  RefreshCw,
  Shield,
  Star,
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
import type { PaletteId } from "../types";
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
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ("Notification" in window) setNotifPerm(Notification.permission);
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

  // Poll notification permission every 3s
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
    if (testNotifCountdown !== null) return; // already counting
    let remaining = 5;
    setTestNotifCountdown(remaining);

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
        setTestNotifCountdown(null);
        // Send test notification to service worker
        if (
          "serviceWorker" in navigator &&
          navigator.serviceWorker.controller
        ) {
          navigator.serviceWorker.controller.postMessage({
            type: "TEST_NOTIFICATION",
          });
        } else {
          // SW not yet controlling — wait for it and retry once
          if ("serviceWorker" in navigator) {
            navigator.serviceWorker.ready.then((reg) => {
              reg.active?.postMessage({ type: "TEST_NOTIFICATION" });
            });
          }
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
    const linked = await selectFolder();
    if (linked) {
      setFolderLinked(true);
      setCurrentFolderName(getFolderName());
      triggerSync();
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

  // Notification permission styling
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

        {/* Permission status pill */}
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

        {/* Enable Timer Notifications button */}
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

        {/* Test Notification button */}
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

        {/* Permission Manager button */}
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

      {/* Data Management — Monarch Storage */}
      <div style={sectionStyle}>
        <div style={labelStyle}>
          <FolderOpen size={13} /> Data Management
        </div>

        {/* Sync status row */}
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
                  style={{
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
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

        {/* Refresh & Sync button */}
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

        {/* Select Folder button */}
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

        {/* Folder path display */}
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

        {/* Test Connection button */}
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

        {/* Test result toast */}
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

        {/* Export / Import row */}
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

        {/* Background image */}
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

        {/* Living Space */}
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
