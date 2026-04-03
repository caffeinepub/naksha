import { BookOpen, Check, Pencil, Star, X } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import SubjectChapterTopicPicker from "../components/SubjectChapterTopicPicker";
import { useTheme } from "../context/ThemeContext";
import { useAutoSave } from "../hooks/useAutoSave";
import type { Session } from "../types";
import {
  getSessions,
  getStudyTime,
  getSubjects,
  saveSessionLabel,
  updateSessionEnergy,
  updateSessionTopic,
} from "../utils/storage";

type FilterPeriod = "daily" | "weekly" | "monthly" | "yearly";

function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

function getPeriodStart(period: FilterPeriod): number {
  const now = new Date();
  switch (period) {
    case "daily":
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).getTime();
    case "weekly": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    case "yearly":
      return new Date(now.getFullYear(), 0, 1).getTime();
  }
}

function energyColor(rating: number): string {
  if (rating <= 0) return "#374151"; // neutral grey
  if (rating <= 2) return "#EF4444"; // red - low battery
  if (rating === 3) return "#F59E0B"; // amber - medium
  return "#22C55E"; // green - high battery
}

function energyGlow(rating: number): string {
  if (rating <= 0) return "none";
  if (rating <= 2)
    return "0 0 8px rgba(239,68,68,0.7), 0 0 16px rgba(239,68,68,0.3)";
  if (rating === 3)
    return "0 0 8px rgba(245,158,11,0.7), 0 0 16px rgba(245,158,11,0.3)";
  return "0 0 8px rgba(34,197,94,0.7), 0 0 16px rgba(34,197,94,0.3)";
}

function EnergyStars({ rating }: { rating: number }) {
  return (
    <span style={{ fontSize: 12 }}>
      {Array.from({ length: 5 }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable 5-star positions
        <span key={i} style={{ color: i < rating ? "#F59E0B" : "#9CA3AF" }}>
          ★
        </span>
      ))}
    </span>
  );
}

const WITTY = "You haven't done this yet, Dumbo! 🥜";

const DashboardScreen: FC = () => {
  const { theme } = useTheme();
  const [period, setPeriod] = useState<FilterPeriod>("weekly");
  const [sessions, setSessions] = useState<Session[]>(() => getSessions());
  const { triggerAutoSave } = useAutoSave();
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingEnergyId, setEditingEnergyId] = useState<string | null>(null);
  const [showTopicPickerId, setShowTopicPickerId] = useState<string | null>(
    null,
  );

  const subjects = useMemo(() => getSubjects(), []);

  const reloadSessions = () => setSessions(getSessions());

  const filtered = useMemo(() => {
    const start = getPeriodStart(period);
    return sessions.filter((s) => s.timestamp >= start);
  }, [sessions, period]);

  const totalTime = useMemo(
    () => filtered.reduce((sum, s) => sum + s.actualTime, 0),
    [filtered],
  );

  const subjectData = useMemo(() => {
    return subjects
      .map((subj) => ({
        name: subj.name,
        color: subj.colorAccent,
        time:
          filtered
            .filter((s) => s.subjectId === subj.id)
            .reduce((sum, s) => sum + s.actualTime, 0) || getStudyTime(subj.id),
      }))
      .filter((s) => s.time > 0);
  }, [filtered, subjects]);

  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0) as number[];
    for (const s of filtered) {
      const h = new Date(s.timestamp).getHours();
      hours[h] += s.actualTime;
    }
    return hours;
  }, [filtered]);

  const maxHourly = Math.max(...hourlyData, 1);

  const energySessions = useMemo(
    () => filtered.filter((s) => s.energyRating > 0),
    [filtered],
  );

  const sessionNotes = useMemo(
    () => filtered.filter((s) => s.note?.trim() && s.note !== "auto-saved"),
    [filtered],
  );

  const todayStart = getPeriodStart("daily");
  const yesterdayStart = todayStart - 86400000;
  const todayTime = sessions
    .filter((s) => s.timestamp >= todayStart)
    .reduce((s, sess) => s + sess.actualTime, 0);
  const yesterdayTime = sessions
    .filter((s) => s.timestamp >= yesterdayStart && s.timestamp < todayStart)
    .reduce((s, sess) => s + sess.actualTime, 0);
  const weekStart = getPeriodStart("weekly");
  const lastWeekStart = weekStart - 7 * 86400000;
  const thisWeekTime = sessions
    .filter((s) => s.timestamp >= weekStart)
    .reduce((s, sess) => s + sess.actualTime, 0);
  const lastWeekTime = sessions
    .filter((s) => s.timestamp >= lastWeekStart && s.timestamp < weekStart)
    .reduce((s, sess) => s + sess.actualTime, 0);

  const dayDelta =
    yesterdayTime > 0
      ? Math.round(((todayTime - yesterdayTime) / yesterdayTime) * 100)
      : null;
  const weekDelta =
    lastWeekTime > 0
      ? Math.round(((thisWeekTime - lastWeekTime) / lastWeekTime) * 100)
      : null;

  const handleSaveLabel = (sessionId: string) => {
    if (!editingLabel.trim()) {
      setEditingSessionId(null);
      return;
    }
    saveSessionLabel(sessionId, editingLabel.trim());
    reloadSessions();
    setEditingSessionId(null);
    setEditingLabel("");
  };

  const cardStyle: React.CSSProperties = {
    background: theme.card,
    borderRadius: 14,
    border: `1px solid ${theme.cardShadowDark}`,
    padding: 16,
    marginBottom: 14,
  };

  const sectionTitle = (t: string) => (
    <h3
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: theme.textMuted,
        letterSpacing: 0.8,
        margin: "0 0 12px",
        textTransform: "uppercase",
      }}
    >
      {t}
    </h3>
  );

  // Suppress unused warning

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bgGrad,
        padding: "16px 16px 100px",
        maxWidth: 430,
        margin: "0 auto",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          color: theme.text,
          margin: "0 0 14px",
        }}
      >
        Dashboard
      </h2>

      {/* Period filter */}
      <div
        data-ocid="dashboard.filter.tab"
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 18,
          background: theme.card,
          borderRadius: 10,
          border: `1px solid ${theme.cardShadowDark}`,
          overflow: "hidden",
        }}
      >
        {(["daily", "weekly", "monthly", "yearly"] as FilterPeriod[]).map(
          (p) => (
            <button
              key={p}
              type="button"
              data-ocid={`dashboard.${p}.tab`}
              onClick={() => setPeriod(p)}
              style={{
                flex: 1,
                padding: "9px 4px",
                border: "none",
                borderRight: `1px solid ${theme.cardShadowDark}`,
                background: period === p ? theme.accent : "transparent",
                color: period === p ? theme.accentText : theme.textMuted,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.15s",
              }}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ),
        )}
      </div>

      {/* Total time */}
      <div style={{ ...cardStyle, textAlign: "center", padding: "20px 16px" }}>
        {sectionTitle("Total Study Time")}
        {totalTime === 0 ? (
          <p style={{ color: theme.textMuted, fontSize: 14, margin: 0 }}>
            {WITTY}
          </p>
        ) : (
          <div style={{ fontSize: 40, fontWeight: 800, color: theme.accent }}>
            {formatDuration(totalTime)}
          </div>
        )}
      </div>

      {/* Subject bar chart */}
      <div style={cardStyle}>
        {sectionTitle("Time Per Subject")}
        {subjectData.length === 0 ? (
          <p style={{ color: theme.textMuted, fontSize: 13, margin: 0 }}>
            {WITTY}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {subjectData.map((s) => {
              const maxTime = Math.max(...subjectData.map((x) => x.time));
              const pct = Math.max(4, (s.time / maxTime) * 100);
              return (
                <div key={s.name}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: theme.text,
                        fontWeight: 500,
                      }}
                    >
                      {s.name}
                    </span>
                    <span style={{ fontSize: 12, color: theme.textMuted }}>
                      {formatDuration(s.time)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: theme.bg,
                      borderRadius: 4,
                      overflow: "hidden",
                      border: `1px solid ${theme.cardShadowDark}`,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: s.color,
                        borderRadius: 4,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hourly productivity */}
      <div style={cardStyle}>
        {sectionTitle("Hourly Productivity")}
        {filtered.length === 0 ? (
          <p style={{ color: theme.textMuted, fontSize: 13, margin: 0 }}>
            {WITTY}
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 3,
              height: 60,
              overflowX: "auto",
            }}
          >
            {hourlyData.map((val, h) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: stable hour index
                key={h}
                title={`${h}:00 — ${formatDuration(val)}`}
                style={{
                  flex: 1,
                  minWidth: 8,
                  height:
                    val > 0 ? `${Math.max(8, (val / maxHourly) * 60)}px` : 4,
                  background: val > 0 ? theme.accent : `${theme.accent}20`,
                  borderRadius: 3,
                  transition: "height 0.3s ease",
                  opacity: val > 0 ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Energy map */}
      {energySessions.length > 0 && (
        <div style={cardStyle}>
          {sectionTitle("Energy Map")}
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 8,
              fontSize: 10,
              color: "rgba(255,255,255,0.5)",
              alignItems: "center",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: "#EF4444",
                  display: "inline-block",
                  boxShadow: "0 0 4px rgba(239,68,68,0.7)",
                }}
              />
              Low
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: "#F59E0B",
                  display: "inline-block",
                  boxShadow: "0 0 4px rgba(245,158,11,0.7)",
                }}
              />
              Mid
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: "#22C55E",
                  display: "inline-block",
                  boxShadow: "0 0 4px rgba(34,197,94,0.7)",
                }}
              />
              High
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {energySessions.slice(-28).map((s) => (
              <div
                key={s.id}
                title={`${s.topic}: energy ${s.energyRating}/5`}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: energyColor(s.energyRating),
                  opacity: 0.9,
                  boxShadow: energyGlow(s.energyRating),
                  transition: "box-shadow 0.3s",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Improvement log */}
      <div style={cardStyle}>
        {sectionTitle("Daily Progress")}
        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "space-around",
          }}
        >
          <div
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 6px",
              background: theme.bg,
              borderRadius: 10,
              border: `1px solid ${theme.cardShadowDark}`,
            }}
          >
            <div
              style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}
            >
              vs Yesterday
            </div>
            {dayDelta === null ? (
              <div style={{ fontSize: 13, color: theme.textMuted }}>
                No data
              </div>
            ) : (
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: dayDelta >= 0 ? "#22C55E" : "#EF4444",
                }}
              >
                {dayDelta >= 0 ? "+" : ""}
                {dayDelta}%
              </div>
            )}
            <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>
              {formatDuration(todayTime)} today
            </div>
          </div>
          <div
            style={{
              flex: 1,
              textAlign: "center",
              padding: "10px 6px",
              background: theme.bg,
              borderRadius: 10,
              border: `1px solid ${theme.cardShadowDark}`,
            }}
          >
            <div
              style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}
            >
              vs Last Week
            </div>
            {weekDelta === null ? (
              <div style={{ fontSize: 13, color: theme.textMuted }}>
                No data
              </div>
            ) : (
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: weekDelta >= 0 ? "#22C55E" : "#EF4444",
                }}
              >
                {weekDelta >= 0 ? "+" : ""}
                {weekDelta}%
              </div>
            )}
            <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>
              {formatDuration(thisWeekTime)} this week
            </div>
          </div>
        </div>
      </div>

      {/* Session notes */}
      {sessionNotes.length > 0 && (
        <div style={cardStyle}>
          {sectionTitle("Session Notes")}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sessionNotes
              .slice(-5)
              .reverse()
              .map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: theme.bg,
                    borderRadius: 8,
                    padding: "10px 12px",
                    fontSize: 13,
                    color: theme.text,
                    lineHeight: 1.5,
                    border: `1px solid ${theme.cardShadowDark}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.textMuted,
                      marginBottom: 4,
                    }}
                  >
                    {s.topic} · {formatDate(s.timestamp)}
                  </div>
                  {s.note}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      <div style={cardStyle}>
        {sectionTitle("Recent Sessions")}
        {filtered.length === 0 ? (
          <p style={{ color: theme.textMuted, fontSize: 13, margin: 0 }}>
            {WITTY}
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered
              .slice(-8)
              .reverse()
              .map((s, idx) => (
                <div
                  key={s.id}
                  data-ocid={`dashboard.sessions.item.${idx + 1}`}
                  style={{
                    background: theme.bg,
                    borderRadius: 10,
                    padding: "11px 12px",
                    border: `1px solid ${theme.cardShadowDark}`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 6,
                    }}
                  >
                    {/* Topic name — editable */}
                    {editingSessionId === s.id ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flex: 1,
                          marginRight: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <input
                          type="text"
                          data-ocid={`dashboard.sessions.input.${idx + 1}`}
                          value={editingLabel}
                          onChange={(e) => setEditingLabel(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveLabel(s.id);
                            if (e.key === "Escape") {
                              setEditingSessionId(null);
                              setEditingLabel("");
                            }
                          }}
                          // biome-ignore lint/a11y/noAutofocus: intentional UX
                          autoFocus
                          style={{
                            flex: 1,
                            minWidth: 80,
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: `1px solid ${theme.accent}`,
                            background: theme.card,
                            color: theme.text,
                            fontSize: 13,
                            outline: "none",
                            fontFamily: "inherit",
                          }}
                        />
                        <button
                          type="button"
                          data-ocid={`dashboard.sessions.save_button.${idx + 1}`}
                          onClick={() => handleSaveLabel(s.id)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: "none",
                            background: theme.accent,
                            color: theme.accentText,
                            cursor: "pointer",
                          }}
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          data-ocid={`dashboard.sessions.cancel_button.${idx + 1}`}
                          onClick={() => {
                            setEditingSessionId(null);
                            setEditingLabel("");
                          }}
                          style={{
                            padding: "4px 6px",
                            borderRadius: 6,
                            border: `1px solid ${theme.cardShadowDark}`,
                            background: "none",
                            color: theme.textMuted,
                            cursor: "pointer",
                          }}
                        >
                          <X size={12} />
                        </button>
                        {/* Button to open SubjectChapterTopicPicker */}
                        <button
                          type="button"
                          data-ocid={`dashboard.sessions.open_modal_button.${idx + 1}`}
                          onClick={() => setShowTopicPickerId(s.id)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: 6,
                            border: `1px solid ${theme.accent}40`,
                            background: `${theme.accent}14`,
                            color: theme.accent,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                          }}
                        >
                          <BookOpen size={11} /> Pick Topic
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flex: 1,
                          marginRight: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: theme.text,
                          }}
                        >
                          {s.topic}
                        </span>
                        <button
                          type="button"
                          data-ocid={`dashboard.sessions.edit_button.${idx + 1}`}
                          onClick={() => {
                            setEditingSessionId(s.id);
                            setEditingLabel(s.topic);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: theme.textMuted,
                            padding: 2,
                            flexShrink: 0,
                          }}
                        >
                          <Pencil size={11} />
                        </button>
                      </div>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        color: theme.textMuted,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {formatDate(s.timestamp)}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={{ fontSize: 12, color: theme.textMuted }}>
                      {formatDuration(s.actualTime)}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color:
                          s.completionPct >= 80
                            ? "#22C55E"
                            : s.completionPct >= 50
                              ? "#F59E0B"
                              : "#EF4444",
                      }}
                    >
                      {s.completionPct}% done
                    </span>

                    {/* Energy display */}
                    {editingEnergyId === s.id ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 2,
                          alignItems: "center",
                        }}
                      >
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button
                            key={r}
                            type="button"
                            data-ocid={`dashboard.sessions.energy.${idx + 1}`}
                            onClick={() => {
                              updateSessionEnergy(s.id, r);
                              reloadSessions();
                              setEditingEnergyId(null);
                              triggerAutoSave();
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 1,
                              color: "#F59E0B",
                              fontSize: 16,
                              lineHeight: 1,
                            }}
                          >
                            <Star
                              size={16}
                              fill={
                                r <= (s.energyRating > 0 ? s.energyRating : 0)
                                  ? "#F59E0B"
                                  : "none"
                              }
                              stroke="#F59E0B"
                            />
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setEditingEnergyId(null)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: theme.textMuted,
                            padding: 1,
                            marginLeft: 2,
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : s.energyRating > 0 ? (
                      <button
                        type="button"
                        data-ocid={`dashboard.sessions.energy.${idx + 1}`}
                        onClick={() => setEditingEnergyId(s.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                        title="Edit energy rating"
                      >
                        <EnergyStars rating={s.energyRating} />
                      </button>
                    ) : (
                      // auto-saved or skipped: show ? badge
                      <button
                        type="button"
                        data-ocid={`dashboard.sessions.energy.${idx + 1}`}
                        onClick={() => setEditingEnergyId(s.id)}
                        style={{
                          background: "none",
                          border: `1px solid ${theme.cardShadowDark}`,
                          borderRadius: 4,
                          cursor: "pointer",
                          padding: "1px 5px",
                          color: theme.textMuted,
                          fontSize: 12,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                        title="Set energy rating"
                      >
                        ?
                      </button>
                    )}

                    {s.note === "auto-saved" && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "#F59E0B",
                          padding: "1px 5px",
                          borderRadius: 4,
                          border: "1px solid #F59E0B40",
                          background: "#F59E0B10",
                        }}
                      >
                        auto
                      </span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* SubjectChapterTopicPicker for session reassignment */}
      {showTopicPickerId && (
        <SubjectChapterTopicPicker
          onSelect={(sel) => {
            updateSessionTopic(
              showTopicPickerId,
              sel.label,
              sel.topic?.id,
              sel.subject?.id,
              sel.chapter?.id,
            );
            reloadSessions();
            setShowTopicPickerId(null);
            setEditingSessionId(null);
            setEditingLabel("");
          }}
          onClose={() => setShowTopicPickerId(null)}
          initialLabel=""
        />
      )}
    </div>
  );
};

export default DashboardScreen;
