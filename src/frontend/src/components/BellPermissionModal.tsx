import { Bell, X } from "lucide-react";
import type { FC } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  "Open your Phone Settings",
  "Tap 'Apps' or 'Application Manager'",
  "Find and tap 'Naksha'",
  "Tap 'Notifications' and enable them",
];

const BellPermissionModal: FC<Props> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss is supplemental; close button handles keyboard
    <div
      data-ocid="bell_permission.modal"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background:
            "linear-gradient(135deg, rgba(30,30,45,0.98) 0%, rgba(18,18,30,0.98) 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 24,
          padding: "28px 24px",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
          position: "relative",
        }}
      >
        {/* Close button */}
        <button
          type="button"
          data-ocid="bell_permission.close_button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <X size={15} />
        </button>

        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <Bell size={26} color="#EF4444" />
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: 18,
            fontWeight: 800,
            color: "#FFFFFF",
            margin: "0 0 10px",
            letterSpacing: "-0.02em",
          }}
        >
          Notifications Blocked
        </h3>

        {/* Body */}
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.6,
            margin: "0 0 20px",
          }}
        >
          To see the timer while the app is closed, you must manually enable
          notifications in your{" "}
          <strong style={{ color: "#FFFFFF" }}>
            Phone Settings &gt; Apps &gt; Naksha &gt; Notifications
          </strong>
          .
        </p>

        {/* Steps */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 20,
          }}
        >
          {STEPS.map((step, stepIndex) => (
            <div
              key={step}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: stepIndex < 3 ? 10 : 0,
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#EF4444",
                }}
              >
                {stepIndex + 1}
              </div>
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.7)",
                  lineHeight: 1.5,
                  paddingTop: 2,
                }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Got it button */}
        <button
          type="button"
          data-ocid="bell_permission.confirm_button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "13px",
            borderRadius: 14,
            border: "1px solid rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.12)",
            color: "#EF4444",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.01em",
            transition: "background 0.2s",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default BellPermissionModal;
