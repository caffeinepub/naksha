import { Plus, Share, X } from "lucide-react";
import { useEffect, useState } from "react";

function isIOS(): boolean {
  return (
    /(iPad|iPhone|iPod)/i.test(navigator.userAgent) && !(window as any).MSStream
  );
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches;
}

/** iOS install instruction card — also exported for use in SettingsScreen */
export function IOSInstallCard() {
  return (
    <div
      data-ocid="install.ios.card"
      style={{
        borderRadius: 14,
        background: "rgba(29,185,84,0.06)",
        border: "1px solid rgba(29,185,84,0.25)",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <Share size={14} color="rgba(29,185,84,0.9)" />
        Install Naksha on iOS
      </div>
      <ol
        style={{
          margin: 0,
          paddingLeft: 18,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <li
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.5,
          }}
        >
          Open this page in <strong style={{ color: "#fff" }}>Safari</strong>
        </li>
        <li
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.5,
          }}
        >
          Tap the <strong style={{ color: "#fff" }}>Share icon &#x2B06;</strong>{" "}
          at the bottom
        </li>
        <li
          style={{
            fontSize: 12,
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.5,
          }}
        >
          Tap{" "}
          <strong style={{ color: "#fff" }}>
            &apos;Add to Home Screen&apos;
          </strong>{" "}
          and confirm
        </li>
      </ol>
    </div>
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    // Never show if already installed
    if (localStorage.getItem("naksha-pwa-installed")) return;
    // Never show if running as standalone
    if (isStandalone()) return;

    // iOS: always show the manual instruction card (no beforeinstallprompt)
    if (isIOS()) {
      setShowIOS(true);
      return;
    }

    // Android: check if was dismissed within 24h
    const dismissedAt = localStorage.getItem("naksha-install-dismissed");
    if (dismissedAt) {
      const age = Date.now() - Number(dismissedAt);
      if (age < 86400000) {
        // dismissed within last 24h, skip for this session
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShow(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handler as EventListener,
      );
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem("naksha-pwa-installed", "1");
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem("naksha-install-dismissed", Date.now().toString());
  };

  const handleDismissIOS = () => {
    setShowIOS(false);
    localStorage.setItem("naksha-install-dismissed", Date.now().toString());
  };

  // Android install banner
  if (show && !showIOS) {
    return (
      <div className="install-banner" data-ocid="install.panel">
        <img
          src="/icon-192.png"
          alt="Naksha"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            flexShrink: 0,
            objectFit: "cover",
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.3,
            }}
          >
            Add Naksha to Home Screen
          </div>
          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.75)",
              marginTop: 2,
            }}
          >
            Works offline &amp; launches like a native app
          </div>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          data-ocid="install.primary_button"
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: 10,
            padding: "6px 12px",
            color: "#fff",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
            touchAction: "manipulation",
          }}
          aria-label="Install app"
        >
          <Plus size={14} />
          Install
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          data-ocid="install.close_button"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.7)",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
            touchAction: "manipulation",
          }}
          aria-label="Dismiss install banner"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // iOS instruction card (as floating banner near bottom)
  if (showIOS) {
    return (
      <div
        data-ocid="install.ios.panel"
        style={{
          position: "fixed",
          bottom: "calc(80px + env(safe-area-inset-bottom, 0px) + 8px)",
          left: 16,
          right: 16,
          zIndex: 9000,
          background:
            "linear-gradient(135deg, rgba(10,20,14,0.97) 0%, rgba(15,30,20,0.97) 100%)",
          border: "1px solid rgba(29,185,84,0.3)",
          borderRadius: 16,
          padding: "14px 16px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          maxWidth: 430,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <img
            src="/icon-192.png"
            alt="Naksha"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              flexShrink: 0,
              objectFit: "cover",
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 8,
              }}
            >
              Install Naksha on iPhone
            </div>
            <ol
              style={{
                margin: 0,
                paddingLeft: 16,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <li
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.8)",
                  lineHeight: 1.5,
                }}
              >
                Open in <strong>Safari</strong>
              </li>
              <li
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.8)",
                  lineHeight: 1.5,
                }}
              >
                Tap <strong>Share &#x2B06;</strong> below
              </li>
              <li
                style={{
                  fontSize: 12,
                  color: "rgba(255,255,255,0.8)",
                  lineHeight: 1.5,
                }}
              >
                Tap <strong>&apos;Add to Home Screen&apos;</strong>
              </li>
            </ol>
          </div>
          <button
            type="button"
            onClick={handleDismissIOS}
            data-ocid="install.ios.close_button"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
              padding: "0 2px",
              flexShrink: 0,
              fontSize: 18,
              lineHeight: 1,
            }}
            aria-label="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
