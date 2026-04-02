import { Bell, X } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";

interface Props {
  timerRunning?: boolean;
}

const NotificationBanner: FC<Props> = ({ timerRunning = false }) => {
  const [visible, setVisible] = useState(false);
  // Use component state only (NOT localStorage) so it resets on every reload
  const [dismissed, setDismissed] = useState(false);
  const rescheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Re-show banner whenever timer starts (timerRunning becomes true)
  useEffect(() => {
    if (!timerRunning) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return; // already have permission
    if (Notification.permission === "denied") return; // user explicitly denied
    // Show banner on every timer start (reset dismissed state)
    setDismissed(false);
    setVisible(true);
  }, [timerRunning]);

  // Initial show: after 1.5s if permission not yet decided
  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (dismissed) return;
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [dismissed]);

  // Re-show 30s after dismiss if timer still running
  useEffect(() => {
    if (rescheduleRef.current) clearTimeout(rescheduleRef.current);
    if (!dismissed || !timerRunning) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;

    rescheduleRef.current = setTimeout(() => {
      setDismissed(false);
      setVisible(true);
    }, 30000);
    return () => {
      if (rescheduleRef.current) clearTimeout(rescheduleRef.current);
    };
  }, [dismissed, timerRunning]);

  const handleAllow = async () => {
    if ("Notification" in window) {
      await Notification.requestPermission();
    }
    setVisible(false);
    setDismissed(true);
  };

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
  };

  if (!visible) return null;

  return (
    <div
      data-ocid="notification_banner.panel"
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 430,
        zIndex: 200,
        background:
          "linear-gradient(90deg, rgba(245,158,11,0.95), rgba(251,191,36,0.95))",
        backdropFilter: "blur(12px)",
        color: "#1C1917",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 4px 16px rgba(245,158,11,0.35)",
      }}
    >
      <Bell size={18} style={{ flexShrink: 0 }} />
      <p style={{ fontSize: 13, flex: 1, margin: 0, lineHeight: 1.4 }}>
        Allow notifications to keep your timer running in background.
      </p>
      <button
        type="button"
        data-ocid="notification_banner.primary_button"
        onClick={handleAllow}
        style={{
          background: "#1C1917",
          color: "#FEF3C7",
          border: "none",
          borderRadius: 8,
          padding: "5px 12px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Allow
      </button>
      <button
        type="button"
        data-ocid="notification_banner.close_button"
        onClick={handleDismiss}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          flexShrink: 0,
          padding: 4,
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default NotificationBanner;
