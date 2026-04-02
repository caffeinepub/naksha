import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Flame,
  GraduationCap,
  Music,
  Plus,
  Sigma,
  Star,
  X,
  Zap,
} from "lucide-react";
import { type FC, type ReactNode, useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import type { Chapter, Subject, Topic } from "../types";
import {
  addStudyTime,
  getChapters,
  getStudyTime,
  getSubjects,
  getTopics,
  saveChapters,
  saveSubjects,
  saveTopics,
} from "../utils/storage";

const ACCENT_COLORS = [
  "#1DB954",
  "#A855F7",
  "#F59E0B",
  "#60A5FA",
  "#F97316",
  "#67E8F9",
  "#F472B6",
  "#22D3EE",
];

// Curated set of 8 subject icons
const SUBJECT_ICONS: ReactNode[] = [
  <BookOpen key="book" size={32} strokeWidth={1.5} />,
  <Zap key="zap" size={32} strokeWidth={1.5} />,
  <Music key="music" size={32} strokeWidth={1.5} />,
  <Sigma key="sigma" size={32} strokeWidth={1.5} />,
  <GraduationCap key="grad" size={32} strokeWidth={1.5} />,
  <Star key="star" size={32} strokeWidth={1.5} />,
  <Flame key="flame" size={32} strokeWidth={1.5} />,
  <BookOpen key="book2" size={32} strokeWidth={1.5} />,
];

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0m";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

interface ContextMenu {
  type: "subject" | "chapter" | "topic";
  id: string;
  x: number;
  y: number;
}

interface RenameState {
  type: "subject" | "chapter" | "topic";
  id: string;
  value: string;
}

interface Props {
  onSelectTopic: (topic: Topic) => void;
}

const TopicsScreen: FC<Props> = ({ onSelectTopic }) => {
  const { palette } = useTheme();
  const [subjects, setSubjects] = useState<Subject[]>(getSubjects);
  const [chapters, setChapters] = useState<Chapter[]>(getChapters);
  const [topics, setTopics] = useState<Topic[]>(getTopics);

  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(
    new Set(),
  );
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(),
  );
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [renameState, setRenameState] = useState<RenameState | null>(null);

  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectColor, setNewSubjectColor] = useState(ACCENT_COLORS[0]);
  const [addChapterForSubject, setAddChapterForSubject] = useState<
    string | null
  >(null);
  const [newChapterName, setNewChapterName] = useState("");
  const [addTopicForChapter, setAddTopicForChapter] = useState<string | null>(
    null,
  );
  const [newTopicName, setNewTopicName] = useState("");

  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (contextMenu && !target.closest("[data-context-menu]")) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [contextMenu]);

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(8px)",
    fontSize: 14,
    color: palette.text,
    outline: "none",
    fontFamily: "inherit",
  };

  const glassCard: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
  };

  // Subject handlers
  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    const subject: Subject = {
      id: genId(),
      name: newSubjectName.trim(),
      colorAccent: newSubjectColor,
      createdAt: Date.now(),
    };
    const updated = [...subjects, subject];
    setSubjects(updated);
    saveSubjects(updated);
    setNewSubjectName("");
    setShowAddSubject(false);
  };

  const handleDeleteSubject = (id: string) => {
    const updatedSubjects = subjects.filter((s) => s.id !== id);
    const updatedChapters = chapters.filter((c) => c.subjectId !== id);
    const affectedChapterIds = chapters
      .filter((c) => c.subjectId === id)
      .map((c) => c.id);
    const updatedTopics = topics.filter(
      (t) => !affectedChapterIds.includes(t.chapterId),
    );
    setSubjects(updatedSubjects);
    setChapters(updatedChapters);
    setTopics(updatedTopics);
    saveSubjects(updatedSubjects);
    saveChapters(updatedChapters);
    saveTopics(updatedTopics);
    setContextMenu(null);
  };

  const handleRenameSubject = (id: string, name: string) => {
    const updated = subjects.map((s) => (s.id === id ? { ...s, name } : s));
    setSubjects(updated);
    saveSubjects(updated);
    setRenameState(null);
  };

  const handleAddChapter = (subjectId: string) => {
    if (!newChapterName.trim()) return;
    const chapter: Chapter = {
      id: genId(),
      subjectId,
      name: newChapterName.trim(),
      createdAt: Date.now(),
    };
    const updated = [...chapters, chapter];
    setChapters(updated);
    saveChapters(updated);
    setNewChapterName("");
    setAddChapterForSubject(null);
  };

  const handleDeleteChapter = (id: string) => {
    const updatedChapters = chapters.filter((c) => c.id !== id);
    const updatedTopics = topics.filter((t) => t.chapterId !== id);
    setChapters(updatedChapters);
    setTopics(updatedTopics);
    saveChapters(updatedChapters);
    saveTopics(updatedTopics);
    setContextMenu(null);
  };

  const handleRenameChapter = (id: string, name: string) => {
    const updated = chapters.map((c) => (c.id === id ? { ...c, name } : c));
    setChapters(updated);
    saveChapters(updated);
    setRenameState(null);
  };

  const handleAddTopic = (chapterId: string, subjectId: string) => {
    if (!newTopicName.trim()) return;
    const topic: Topic = {
      id: genId(),
      chapterId,
      subjectId,
      name: newTopicName.trim(),
      createdAt: Date.now(),
    };
    const updated = [...topics, topic];
    setTopics(updated);
    saveTopics(updated);
    setNewTopicName("");
    setAddTopicForChapter(null);
  };

  const handleDeleteTopic = (id: string) => {
    const updated = topics.filter((t) => t.id !== id);
    setTopics(updated);
    saveTopics(updated);
    setContextMenu(null);
  };

  const handleRenameTopic = (id: string, name: string) => {
    const updated = topics.map((t) => (t.id === id ? { ...t, name } : t));
    setTopics(updated);
    saveTopics(updated);
    setRenameState(null);
  };

  const openContextMenu = (
    type: ContextMenu["type"],
    id: string,
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({ type, id, x: rect.left, y: rect.bottom + 4 });
  };

  const startLongPress = (
    type: ContextMenu["type"],
    id: string,
    e: React.TouchEvent,
  ) => {
    const touch = e.touches[0];
    longPressRef.current = setTimeout(() => {
      setContextMenu({ type, id, x: touch.clientX, y: touch.clientY });
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressRef.current) clearTimeout(longPressRef.current);
  };

  const toggleSubject = (id: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChapter = (id: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSubjectTime = (subjectId: string) => {
    const subjectChapters = chapters.filter((c) => c.subjectId === subjectId);
    const subjectTopics = topics.filter((t) =>
      subjectChapters.some((c) => c.id === t.chapterId),
    );
    const fromStorage = getStudyTime(subjectId);
    const fromTopics = subjectTopics.reduce(
      (sum, t) => sum + getStudyTime(t.id),
      0,
    );
    return Math.max(fromStorage, fromTopics);
  };

  const getChapterTime = (chapterId: string) => {
    const chapterTopics = topics.filter((t) => t.chapterId === chapterId);
    const fromStorage = getStudyTime(chapterId);
    const fromTopics = chapterTopics.reduce(
      (sum, t) => sum + getStudyTime(t.id),
      0,
    );
    return Math.max(fromStorage, fromTopics);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.bg,
        paddingBottom: 100,
        maxWidth: 430,
        margin: "0 auto",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: palette.text,
              margin: 0,
            }}
          >
            Topics
          </h2>
          <p
            style={{
              fontSize: 12,
              color: palette.textMuted,
              margin: "2px 0 0",
            }}
          >
            {subjects.length} subjects
          </p>
        </div>
        <button
          type="button"
          data-ocid="topics.open_modal_button"
          onClick={() => setShowAddSubject(!showAddSubject)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "8px 16px",
            borderRadius: 50,
            border: `1px solid ${palette.accent}60`,
            background: `${palette.accent}14`,
            color: palette.accent,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: `0 0 10px ${palette.accentGlow}25`,
          }}
        >
          <Plus size={14} /> Subject
        </button>
      </div>

      {/* Add Subject form */}
      {showAddSubject && (
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(255,255,255,0.04)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            animation: "slide-up 0.2s ease",
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              data-ocid="topics.subject.input"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubject()}
              placeholder="Subject name..."
              style={inputStyle}
              // biome-ignore lint/a11y/noAutofocus: intentional UX
              autoFocus
            />
            <button
              type="button"
              data-ocid="topics.subject.submit_button"
              onClick={handleAddSubject}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px solid ${palette.accent}60`,
                background: `${palette.accent}18`,
                color: palette.accent,
                cursor: "pointer",
              }}
            >
              ✓
            </button>
            <button
              type="button"
              data-ocid="topics.subject.cancel_button"
              onClick={() => {
                setShowAddSubject(false);
                setNewSubjectName("");
              }}
              style={{
                padding: "10px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "transparent",
                color: palette.textMuted,
                cursor: "pointer",
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ACCENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewSubjectColor(c)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: c,
                  border:
                    newSubjectColor === c
                      ? "2px solid #fff"
                      : "2px solid transparent",
                  cursor: "pointer",
                  boxShadow:
                    newSubjectColor === c ? `0 0 10px ${c}` : `0 0 4px ${c}60`,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Subject gallery grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: "16px 16px 0",
        }}
      >
        {subjects.map((subject, sIdx) => {
          const isExpanded = expandedSubjects.has(subject.id);
          const subjectChapters = chapters.filter(
            (c) => c.subjectId === subject.id,
          );
          const studyTime = getSubjectTime(subject.id);
          const iconEl = SUBJECT_ICONS[sIdx % SUBJECT_ICONS.length];

          return (
            <div
              key={subject.id}
              style={{
                gridColumn: isExpanded ? "1 / -1" : undefined,
              }}
            >
              {/* Subject card */}
              {renameState?.type === "subject" &&
              renameState.id === subject.id ? (
                <div
                  style={{
                    ...glassCard,
                    padding: "12px",
                    display: "flex",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <input
                    value={renameState.value}
                    onChange={(e) =>
                      setRenameState({ ...renameState, value: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        handleRenameSubject(subject.id, renameState.value);
                      if (e.key === "Escape") setRenameState(null);
                    }}
                    style={inputStyle}
                    // biome-ignore lint/a11y/noAutofocus: intentional UX
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() =>
                      handleRenameSubject(subject.id, renameState.value)
                    }
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1px solid ${palette.accent}60`,
                      background: `${palette.accent}18`,
                      color: palette.accent,
                      cursor: "pointer",
                    }}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenameState(null)}
                    style={{
                      padding: "8px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "transparent",
                      color: palette.textMuted,
                      cursor: "pointer",
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  data-ocid={`topics.subject.item.${sIdx + 1}`}
                  onClick={() => toggleSubject(subject.id)}
                  onContextMenu={(e) =>
                    openContextMenu("subject", subject.id, e)
                  }
                  onTouchStart={(e) => startLongPress("subject", subject.id, e)}
                  onTouchEnd={cancelLongPress}
                  onTouchMove={cancelLongPress}
                  style={{
                    width: "100%",
                    height: 150,
                    borderRadius: 20,
                    border: `1px solid ${isExpanded ? `${subject.colorAccent}60` : "rgba(255,255,255,0.08)"}`,
                    background: `linear-gradient(135deg, ${subject.colorAccent}22 0%, ${subject.colorAccent}08 100%)`,
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "16px 12px 12px",
                    boxSizing: "border-box",
                    transition: "all 0.25s ease",
                    boxShadow: isExpanded
                      ? `0 0 20px ${subject.colorAccent}40, 0 0 40px ${subject.colorAccent}20`
                      : "0 4px 16px rgba(0,0,0,0.3)",
                    transform: isExpanded ? "scale(1)" : "scale(1)",
                  }}
                >
                  <div
                    style={{
                      color: subject.colorAccent,
                      filter: `drop-shadow(0 0 8px ${subject.colorAccent}80)`,
                    }}
                  >
                    {iconEl}
                  </div>
                  <div style={{ textAlign: "center", width: "100%" }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: palette.text,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                      }}
                    >
                      {subject.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: palette.textMuted,
                        marginTop: 2,
                      }}
                    >
                      {studyTime > 0
                        ? formatDuration(studyTime)
                        : "No sessions yet"}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      color: subject.colorAccent,
                      opacity: 0.7,
                    }}
                  >
                    {isExpanded ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </div>
                </button>
              )}

              {/* Context menu */}
              {contextMenu?.type === "subject" &&
                contextMenu.id === subject.id && (
                  <div
                    data-context-menu
                    style={{
                      position: "fixed",
                      top: contextMenu.y,
                      left: Math.min(contextMenu.x, window.innerWidth - 160),
                      background: "rgba(15,15,20,0.95)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 12,
                      padding: 6,
                      zIndex: 300,
                      minWidth: 150,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setRenameState({
                          type: "subject",
                          id: subject.id,
                          value: subject.name,
                        });
                        setContextMenu(null);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "9px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        color: palette.text,
                        fontSize: 14,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubject(subject.id)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: "9px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        color: "#EF4444",
                        fontSize: 14,
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}

              {/* Expanded chapters section */}
              {isExpanded && (
                <div style={{ marginTop: 12, animation: "slide-up 0.2s ease" }}>
                  {/* Add chapter button */}
                  <div style={{ marginBottom: 8 }}>
                    {addChapterForSubject === subject.id ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="text"
                          value={newChapterName}
                          onChange={(e) => setNewChapterName(e.target.value)}
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleAddChapter(subject.id)
                          }
                          placeholder="Chapter name..."
                          style={inputStyle}
                          // biome-ignore lint/a11y/noAutofocus: intentional UX
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleAddChapter(subject.id)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 10,
                            border: `1px solid ${palette.accent}60`,
                            background: `${palette.accent}18`,
                            color: palette.accent,
                            cursor: "pointer",
                          }}
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddChapterForSubject(null)}
                          style={{
                            padding: "8px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: "transparent",
                            color: palette.textMuted,
                            cursor: "pointer",
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddChapterForSubject(subject.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          padding: "7px 14px",
                          borderRadius: 20,
                          border: "1px dashed rgba(255,255,255,0.15)",
                          background: "transparent",
                          color: palette.textMuted,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={12} /> Add Chapter
                      </button>
                    )}
                  </div>

                  {subjectChapters.length === 0 && (
                    <div
                      style={{
                        padding: "12px",
                        color: palette.textMuted,
                        fontSize: 12,
                        textAlign: "center",
                      }}
                    >
                      No chapters yet
                    </div>
                  )}

                  {subjectChapters.map((chapter, cIdx) => {
                    const isChapterExpanded = expandedChapters.has(chapter.id);
                    const chapterTopics = topics.filter(
                      (t) => t.chapterId === chapter.id,
                    );
                    const chapterTime = getChapterTime(chapter.id);

                    return (
                      <div key={chapter.id} style={{ marginBottom: 8 }}>
                        {/* Chapter row */}
                        {renameState?.type === "chapter" &&
                        renameState.id === chapter.id ? (
                          <div
                            style={{ display: "flex", gap: 8, marginBottom: 4 }}
                          >
                            <input
                              value={renameState.value}
                              onChange={(e) =>
                                setRenameState({
                                  ...renameState,
                                  value: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleRenameChapter(
                                    chapter.id,
                                    renameState.value,
                                  );
                                if (e.key === "Escape") setRenameState(null);
                              }}
                              style={inputStyle}
                              // biome-ignore lint/a11y/noAutofocus: intentional UX
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleRenameChapter(
                                  chapter.id,
                                  renameState.value,
                                )
                              }
                              style={{
                                padding: "8px 12px",
                                borderRadius: 8,
                                border: `1px solid ${palette.accent}60`,
                                background: `${palette.accent}18`,
                                color: palette.accent,
                                cursor: "pointer",
                              }}
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              onClick={() => setRenameState(null)}
                              style={{
                                padding: "8px",
                                borderRadius: 8,
                                border: "1px solid rgba(255,255,255,0.10)",
                                background: "transparent",
                                color: palette.textMuted,
                                cursor: "pointer",
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            data-ocid={`topics.chapter.item.${cIdx + 1}`}
                            onClick={() => toggleChapter(chapter.id)}
                            onContextMenu={(e) =>
                              openContextMenu("chapter", chapter.id, e)
                            }
                            onTouchStart={(e) =>
                              startLongPress("chapter", chapter.id, e)
                            }
                            onTouchEnd={cancelLongPress}
                            onTouchMove={cancelLongPress}
                            style={{
                              width: "100%",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              padding: "11px 14px",
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.08)",
                              background: "rgba(255,255,255,0.04)",
                              backdropFilter: "blur(8px)",
                              cursor: "pointer",
                              textAlign: "left",
                              boxSizing: "border-box",
                              borderLeft: `3px solid ${subject.colorAccent}60`,
                            }}
                          >
                            {isChapterExpanded ? (
                              <ChevronDown
                                size={14}
                                color={palette.textMuted}
                              />
                            ) : (
                              <ChevronRight
                                size={14}
                                color={palette.textMuted}
                              />
                            )}
                            <span
                              style={{
                                flex: 1,
                                fontSize: 14,
                                fontWeight: 600,
                                color: palette.text,
                              }}
                            >
                              {chapter.name}
                            </span>
                            <span
                              style={{ fontSize: 11, color: palette.textMuted }}
                            >
                              {chapterTime > 0
                                ? formatDuration(chapterTime)
                                : ""}
                            </span>
                          </button>
                        )}

                        {contextMenu?.type === "chapter" &&
                          contextMenu.id === chapter.id && (
                            <div
                              data-context-menu
                              style={{
                                position: "fixed",
                                top: contextMenu.y,
                                left: Math.min(
                                  contextMenu.x,
                                  window.innerWidth - 160,
                                ),
                                background: "rgba(15,15,20,0.95)",
                                backdropFilter: "blur(20px)",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: 12,
                                padding: 6,
                                zIndex: 300,
                                minWidth: 150,
                                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setRenameState({
                                    type: "chapter",
                                    id: chapter.id,
                                    value: chapter.name,
                                  });
                                  setContextMenu(null);
                                }}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  padding: "9px 14px",
                                  borderRadius: 8,
                                  border: "none",
                                  background: "transparent",
                                  color: palette.text,
                                  fontSize: 14,
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteChapter(chapter.id)}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  padding: "9px 14px",
                                  borderRadius: 8,
                                  border: "none",
                                  background: "transparent",
                                  color: "#EF4444",
                                  fontSize: 14,
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}

                        {/* Topics list */}
                        {isChapterExpanded && (
                          <div style={{ paddingLeft: 16, marginTop: 4 }}>
                            {addTopicForChapter === chapter.id ? (
                              <div
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  marginBottom: 6,
                                }}
                              >
                                <input
                                  type="text"
                                  value={newTopicName}
                                  onChange={(e) =>
                                    setNewTopicName(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    handleAddTopic(chapter.id, subject.id)
                                  }
                                  placeholder="Topic name..."
                                  style={inputStyle}
                                  // biome-ignore lint/a11y/noAutofocus: intentional UX
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddTopic(chapter.id, subject.id)
                                  }
                                  style={{
                                    padding: "8px 12px",
                                    borderRadius: 10,
                                    border: `1px solid ${palette.accent}60`,
                                    background: `${palette.accent}18`,
                                    color: palette.accent,
                                    cursor: "pointer",
                                  }}
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAddTopicForChapter(null)}
                                  style={{
                                    padding: "8px",
                                    borderRadius: 10,
                                    border: "1px solid rgba(255,255,255,0.10)",
                                    background: "transparent",
                                    color: palette.textMuted,
                                    cursor: "pointer",
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setAddTopicForChapter(chapter.id)
                                }
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                  padding: "6px 12px",
                                  borderRadius: 20,
                                  border: "1px dashed rgba(255,255,255,0.12)",
                                  background: "transparent",
                                  color: palette.textMuted,
                                  fontSize: 12,
                                  cursor: "pointer",
                                  marginBottom: 6,
                                }}
                              >
                                <Plus size={11} /> Add Topic
                              </button>
                            )}

                            {chapterTopics.map((topic, tIdx) => (
                              <div
                                key={topic.id}
                                style={{
                                  position: "relative",
                                  marginBottom: 4,
                                }}
                              >
                                {renameState?.type === "topic" &&
                                renameState.id === topic.id ? (
                                  <div style={{ display: "flex", gap: 8 }}>
                                    <input
                                      value={renameState.value}
                                      onChange={(e) =>
                                        setRenameState({
                                          ...renameState,
                                          value: e.target.value,
                                        })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          handleRenameTopic(
                                            topic.id,
                                            renameState.value,
                                          );
                                        if (e.key === "Escape")
                                          setRenameState(null);
                                      }}
                                      style={inputStyle}
                                      // biome-ignore lint/a11y/noAutofocus: intentional UX
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRenameTopic(
                                          topic.id,
                                          renameState.value,
                                        )
                                      }
                                      style={{
                                        padding: "8px 12px",
                                        borderRadius: 8,
                                        border: `1px solid ${palette.accent}60`,
                                        background: `${palette.accent}18`,
                                        color: palette.accent,
                                        cursor: "pointer",
                                      }}
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRenameState(null)}
                                      style={{
                                        padding: "8px",
                                        borderRadius: 8,
                                        border:
                                          "1px solid rgba(255,255,255,0.10)",
                                        background: "transparent",
                                        color: palette.textMuted,
                                        cursor: "pointer",
                                      }}
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    data-ocid={`topics.topic.item.${tIdx + 1}`}
                                    onClick={() => onSelectTopic(topic)}
                                    onContextMenu={(e) =>
                                      openContextMenu("topic", topic.id, e)
                                    }
                                    onTouchStart={(e) =>
                                      startLongPress("topic", topic.id, e)
                                    }
                                    onTouchEnd={cancelLongPress}
                                    onTouchMove={cancelLongPress}
                                    style={{
                                      width: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 10,
                                      padding: "10px 12px",
                                      borderRadius: 10,
                                      border:
                                        "1px solid rgba(255,255,255,0.07)",
                                      background: "rgba(255,255,255,0.03)",
                                      cursor: "pointer",
                                      textAlign: "left",
                                      boxSizing: "border-box",
                                    }}
                                  >
                                    <span
                                      style={{
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        background: subject.colorAccent,
                                        flexShrink: 0,
                                        boxShadow: `0 0 5px ${subject.colorAccent}`,
                                      }}
                                    />
                                    <span
                                      style={{
                                        flex: 1,
                                        fontSize: 13,
                                        color: palette.text,
                                      }}
                                    >
                                      {topic.name}
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: palette.textMuted,
                                      }}
                                    >
                                      {getStudyTime(topic.id) > 0
                                        ? formatDuration(getStudyTime(topic.id))
                                        : ""}
                                    </span>
                                  </button>
                                )}

                                {contextMenu?.type === "topic" &&
                                  contextMenu.id === topic.id && (
                                    <div
                                      data-context-menu
                                      style={{
                                        position: "fixed",
                                        top: contextMenu.y,
                                        left: Math.min(
                                          contextMenu.x,
                                          window.innerWidth - 160,
                                        ),
                                        background: "rgba(15,15,20,0.95)",
                                        backdropFilter: "blur(20px)",
                                        border:
                                          "1px solid rgba(255,255,255,0.15)",
                                        borderRadius: 12,
                                        padding: 6,
                                        zIndex: 300,
                                        minWidth: 150,
                                        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRenameState({
                                            type: "topic",
                                            id: topic.id,
                                            value: topic.name,
                                          });
                                          setContextMenu(null);
                                        }}
                                        style={{
                                          display: "block",
                                          width: "100%",
                                          padding: "9px 14px",
                                          borderRadius: 8,
                                          border: "none",
                                          background: "transparent",
                                          color: palette.text,
                                          fontSize: 14,
                                          cursor: "pointer",
                                          textAlign: "left",
                                        }}
                                      >
                                        Rename
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteTopic(topic.id)
                                        }
                                        style={{
                                          display: "block",
                                          width: "100%",
                                          padding: "9px 14px",
                                          borderRadius: 8,
                                          border: "none",
                                          background: "transparent",
                                          color: "#EF4444",
                                          fontSize: 14,
                                          cursor: "pointer",
                                          textAlign: "left",
                                        }}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Add new subject card (dashed) */}
        <button
          type="button"
          data-ocid="topics.add_subject.button"
          onClick={() => setShowAddSubject(true)}
          style={{
            height: 150,
            borderRadius: 20,
            border: "1.5px dashed rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.02)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            color: "rgba(255,255,255,0.30)",
          }}
        >
          <Plus size={28} strokeWidth={1.5} />
          <span style={{ fontSize: 13 }}>Add Subject</span>
        </button>
      </div>

      {subjects.length === 0 && (
        <div
          data-ocid="topics.empty_state"
          style={{
            textAlign: "center",
            padding: "60px 24px",
            color: "rgba(255,255,255,0.3)",
          }}
        >
          <BookOpen
            size={48}
            strokeWidth={1}
            style={{ marginBottom: 12, opacity: 0.4 }}
          />
          <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 6px" }}>
            No subjects yet
          </p>
          <p style={{ fontSize: 13, margin: 0 }}>
            Tap "+Subject" to create your first subject
          </p>
        </div>
      )}
    </div>
  );
};

export default TopicsScreen;
