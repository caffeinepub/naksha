import {
  Bell,
  BellOff,
  Check,
  CheckCircle,
  Database,
  Download,
  Eye,
  HardDrive,
  Image,
  Info,
  Link2,
  Palette,
  RefreshCw,
  Star,
  Upload,
  User,
  Zap,
} from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
import { useAppearance } from "../context/AppearanceContext";
import { useBackup } from "../context/BackupContext";
import { usePalette } from "../context/ThemeContext";
import type { PaletteId } from "../types";
import {
  exportData,
  hasLinkedFile,
  importData,
  isFileSystemSupported,
  linkFile,
  syncToLocalAndIDB,
} from "../utils/monarchStorage";
import { PALETTES } from "../utils/palettes";
import { getUsername, setUsername } from "../utils/storage";

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
  const [fileLinked, setFileLinked] = useState(hasLinkedFile);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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

  const handleSaveName = () => {
    setUsername(username);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNotifRequest = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
    }
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

  const handleLinkFile = async () => {
    const linked = await linkFile();
    setFileLinked(linked);
    if (linked) {
      triggerSync();
    }
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
    // Save to localStorage + IDB immediately
    await syncToLocalAndIDB();
    triggerSync(); // also trigger file sync if linked
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
        ? "Saving…"
        : status === "error"
          ? "Error"
          : "No file linked";

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

      {/* Data Management — Monarch Storage */}
      <div style={sectionStyle}>
        <div style={labelStyle}>
          <HardDrive size={13} /> Data Management
        </div>

        {/* Backup status row */}
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
          <HardDrive
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
          <span style={{ fontSize: 13, color: palette.text, flex: 1 }}>
            Monarch Storage
          </span>
          <span
            style={{
              fontSize: 11,
              color: backupStatusColor,
              fontWeight: 600,
            }}
          >
            {backupStatusLabel}
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
            {refreshing ? "Saving…" : "Refresh & Sync"}
          </button>
          {/* Saved checkmark badge */}
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

        {/* Link File */}
        {isFileSystemSupported() && (
          <button
            type="button"
            data-ocid="settings.monarch.link_button"
            onClick={handleLinkFile}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: 12,
              border: fileLinked
                ? "1px solid rgba(34,197,94,0.4)"
                : `1px solid ${palette.accent}40`,
              background: fileLinked
                ? "rgba(34,197,94,0.08)"
                : `${palette.accent}0C`,
              color: fileLinked ? "#22C55E" : palette.accent,
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
            <Link2 size={15} />
            {fileLinked
              ? "Re-link File (naksha_data.json)"
              : "Link File (naksha_data.json)"}
          </button>
        )}

        {!isFileSystemSupported() && (
          <p
            style={{
              fontSize: 12,
              color: palette.textMuted,
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            File System API is not supported in this browser. Use Export/Import
            below to back up your data manually.
          </p>
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
            marginBottom: notifPerm !== "granted" ? 10 : 0,
          }}
        >
          <span style={{ fontSize: 14, color: palette.text }}>
            Status:{" "}
            <strong
              style={{
                color:
                  notifPerm === "granted"
                    ? "#22C55E"
                    : notifPerm === "denied"
                      ? "#EF4444"
                      : "#F59E0B",
              }}
            >
              {notifPerm}
            </strong>
          </span>
        </div>
        {notifPerm !== "granted" && notifPerm !== "denied" && (
          <button
            type="button"
            data-ocid="settings.notifications.primary_button"
            onClick={handleNotifRequest}
            style={{
              padding: "10px 20px",
              borderRadius: 50,
              border: `1px solid ${palette.accent}50`,
              background: `${palette.accent}14`,
              color: palette.accent,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Grant Permission
          </button>
        )}
        {notifPerm === "denied" && (
          <p style={{ fontSize: 13, color: "#EF4444", margin: 0 }}>
            Notifications blocked. Please enable in browser settings.
          </p>
        )}
      </div>

      {/* Storage */}
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
            ✨ Living Space
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
          Naksha 🧭
        </h3>
        <p style={{ fontSize: 13, color: palette.accent, margin: "0 0 4px" }}>
          Your Time. Your Orbit. 🪐
        </p>
        <p style={{ fontSize: 12, color: palette.textMuted, margin: 0 }}>
          Version 1.8.0
        </p>
      </div>
    </div>
  );
};

export default SettingsScreen;
