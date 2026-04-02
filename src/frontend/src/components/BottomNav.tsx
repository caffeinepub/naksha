import {
  BarChart2,
  BookOpen,
  CheckSquare,
  Home,
  Settings,
  Timer,
} from "lucide-react";
import type { FC } from "react";
import type { TabId } from "../types";

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

const TABS: {
  id: TabId;
  label: string;
  Icon: FC<{
    size?: number;
    strokeWidth?: number;
    color?: string;
    style?: React.CSSProperties;
  }>;
}[] = [
  { id: "home", label: "Home", Icon: Home },
  { id: "topics", label: "Topics", Icon: BookOpen },
  { id: "timer", label: "Timer", Icon: Timer },
  { id: "todo", label: "To-Do", Icon: CheckSquare },
  { id: "dashboard", label: "Stats", Icon: BarChart2 },
  { id: "settings", label: "", Icon: Settings },
];

const BottomNav: FC<Props> = ({ active, onChange }) => {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: 398,
        height: 64,
        background: "rgba(10,10,15,0.75)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        borderRadius: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 100,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <button
            type="button"
            key={id}
            data-ocid={`nav.${id}.tab`}
            onClick={() => onChange(id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "8px 10px",
              minWidth: 48,
              minHeight: 48,
              background: isActive ? "rgba(255,255,255,0.08)" : "none",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.2 : 1.6}
              color={isActive ? "var(--accent)" : "rgba(255,255,255,0.35)"}
              style={
                isActive
                  ? {
                      filter: "drop-shadow(0 0 6px var(--accent-glow))",
                    }
                  : undefined
              }
            />
            {label ? (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: isActive ? 600 : 400,
                  lineHeight: 1,
                  letterSpacing: 0.3,
                  color: isActive ? "var(--accent)" : "rgba(255,255,255,0.3)",
                }}
              >
                {label}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
