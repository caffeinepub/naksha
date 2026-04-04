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

/*
 * Fixed bottom dock — flush against the screen edge.
 * Background matches the app body (#0a0a0f) exactly so Android's system nav
 * bar color blends seamlessly with no visible gap or line.
 * No border-top, no box-shadow — truly seamless dock.
 * touch-action: manipulation on every button eliminates the 300ms tap delay.
 */
const BottomNav: FC<Props> = ({ active, onChange }) => {
  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        width: "100%",
        height: "calc(70px + env(safe-area-inset-bottom, 0px))",
        background: "#0a0a0f",
        border: "none",
        boxShadow: "none",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-around",
        paddingTop: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: 0,
        paddingRight: 0,
        zIndex: 100,
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "manipulation",
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
              padding: "12px 10px 10px",
              flex: 1,
              height: 70,
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "opacity 0.15s ease",
              touchAction: "manipulation",
              userSelect: "none",
              WebkitUserSelect:
                "none" as React.CSSProperties["WebkitUserSelect"],
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
