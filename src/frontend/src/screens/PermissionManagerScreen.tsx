import {
  Bell,
  BellOff,
  CheckCircle,
  FolderOpen,
  Shield,
  X,
} from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { usePalette } from "../context/ThemeContext";
import { PREF_KEYS, Preferences } from "../utils/preferences";

interface Props {
  onDismiss: () => void;
}

type PermState = "idle" | "granted" | "denied" | "unavailable";

const PermissionManagerScreen: FC<Props> = ({ onDismiss }) => {
  const { palette } = usePalette();
  const [notifState, setNotifState] = useState<PermState>("idle");
  const [storageState, setStorageState] = useState<PermState>("idle");
  const [requesting, setRequesting] = useState(false);

  // Read current permission state on mount
  useEffect(() => {
    if ("Notification" in window) {
      const p = Notification.permission;
      if (p === "granted") setNotifState("granted");
      else if (p === "denied") setNotifState("denied");
    } else {
      setNotifState("unavailable");
    }

    if ("storage" in navigator && "persisted" in navigator.storage) {
      navigator.storage
        .persisted()
        .then((persisted) => {
          setStorageState(persisted ? "granted" : "idle");
        })
        .catch(() => setStorageState("unavailable"));
    } else {
      setStorageState("unavailable");
    }
  }, []);

  const requestNotifications = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      setNotifState("granted");
      return;
    }
    if (Notification.permission === "denied") {
      setNotifState("denied");
      return;
    }
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setNotifState(result === "granted" ? "granted" : "denied");
    } catch {
      setNotifState("denied");
    } finally {
      setRequesting(false);
    }
  };

  const requestStorage = async () => {
    if (!("storage" in navigator && "persist" in navigator.storage)) return;
    setRequesting(true);
    try {
      const granted = await navigator.storage.persist();
      setStorageState(granted ? "granted" : "denied");
    } catch {
      setStorageState("denied");
    } finally {
      setRequesting(false);
    }
  };

  const handleDone = async () => {
    await Preferences.set({ key: PREF_KEYS.permissionsAsked, value: "true" });
    onDismiss();
  };

  const stateColor = (s: PermState) => {
    if (s === "granted") return "#22C55E";
    if (s === "denied") return "#EF4444";
    return "rgba(255,255,255,0.5)";
  };

  const stateLabel = (s: PermState) => {
    if (s === "granted") return "Granted";
    if (s === "denied") return "Denied";
    if (s === "unavailable") return "N/A";
    return "Not asked";
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: palette.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      {/* Close */}
      <button
        type="button"
        onClick={handleDone}
        style={{
          position: "absolute",
          top: 18,
          right: 18,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          padding: "6px 8px",
          cursor: "pointer",
          color: "rgba(255,255,255,0.6)",
          display: "flex",
          alignItems: "center",
        }}
      >
        <X size={16} />
      </button>

      {/* Header */}
      <Shield
        size={48}
        color={palette.accent}
        style={{
          marginBottom: 16,
          filter: `drop-shadow(0 0 12px ${palette.accent}80)`,
        }}
      />
      <h1
        style={{
          color: palette.text,
          fontSize: 24,
          fontWeight: 700,
          margin: "0 0 6px",
          textAlign: "center",
        }}
      >
        Permission Manager
      </h1>
      <p
        style={{
          color: "rgba(255,255,255,0.5)",
          fontSize: 13,
          textAlign: "center",
          margin: "0 0 32px",
          lineHeight: 1.5,
          maxWidth: 320,
        }}
      >
        Naksha needs these permissions to keep your timer running and your data
        safe.
      </p>

      {/* Permission rows */}
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* Notifications */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: `${stateColor(notifState)}18`,
              border: `1px solid ${stateColor(notifState)}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {notifState === "denied" ? (
              <BellOff size={20} color="#EF4444" />
            ) : (
              <Bell size={20} color={stateColor(notifState)} />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: palette.text, fontWeight: 600, fontSize: 14 }}>
              Notifications
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Timer alerts when app is in background
            </div>
            <div
              style={{
                color: stateColor(notifState),
                fontSize: 11,
                marginTop: 4,
                fontWeight: 600,
              }}
            >
              {stateLabel(notifState)}
            </div>
          </div>
          {notifState !== "granted" && notifState !== "unavailable" && (
            <button
              type="button"
              onClick={requestNotifications}
              disabled={requesting || notifState === "denied"}
              style={{
                background:
                  notifState === "denied"
                    ? "rgba(239,68,68,0.12)"
                    : `${palette.accent}22`,
                border: `1px solid ${notifState === "denied" ? "rgba(239,68,68,0.3)" : `${palette.accent}50`}`,
                borderRadius: 8,
                padding: "6px 14px",
                color: notifState === "denied" ? "#EF4444" : palette.accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: notifState === "denied" ? "default" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {notifState === "denied" ? "Blocked" : "Allow"}
            </button>
          )}
          {notifState === "granted" && (
            <CheckCircle size={20} color="#22C55E" style={{ flexShrink: 0 }} />
          )}
        </div>

        {/* Persistent Storage */}
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 14,
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: `${stateColor(storageState)}18`,
              border: `1px solid ${stateColor(storageState)}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <FolderOpen size={20} color={stateColor(storageState)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: palette.text, fontWeight: 600, fontSize: 14 }}>
              Persistent Storage
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.45)",
                fontSize: 12,
                marginTop: 2,
              }}
            >
              Prevents the browser from clearing your data
            </div>
            <div
              style={{
                color: stateColor(storageState),
                fontSize: 11,
                marginTop: 4,
                fontWeight: 600,
              }}
            >
              {stateLabel(storageState)}
            </div>
          </div>
          {storageState !== "granted" && storageState !== "unavailable" && (
            <button
              type="button"
              onClick={requestStorage}
              disabled={requesting}
              style={{
                background: `${palette.accent}22`,
                border: `1px solid ${palette.accent}50`,
                borderRadius: 8,
                padding: "6px 14px",
                color: palette.accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Allow
            </button>
          )}
          {storageState === "granted" && (
            <CheckCircle size={20} color="#22C55E" style={{ flexShrink: 0 }} />
          )}
        </div>
      </div>

      {/* Notification blocked help */}
      {notifState === "denied" && (
        <div
          style={{
            marginTop: 16,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 12,
            padding: "12px 16px",
            maxWidth: 380,
            width: "100%",
          }}
        >
          <p
            style={{
              color: "#EF4444",
              fontSize: 12,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            <strong>Notifications are blocked.</strong> To enable them:
            <br />
            Phone Settings &rarr; Apps &rarr; Naksha &rarr; Notifications &rarr;
            Allow
          </p>
        </div>
      )}

      {/* Done button */}
      <button
        type="button"
        onClick={handleDone}
        style={{
          marginTop: 32,
          width: "100%",
          maxWidth: 380,
          padding: "14px 0",
          borderRadius: 50,
          background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent}CC)`,
          border: "none",
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: `0 8px 24px ${palette.accent}40`,
          letterSpacing: "0.02em",
        }}
      >
        Done
      </button>
    </div>
  );
};

export default PermissionManagerScreen;
