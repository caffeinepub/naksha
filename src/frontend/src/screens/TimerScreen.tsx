import {
  Bell,
  BellOff,
  BookOpen,
  Briefcase,
  Check,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { type FC, useCallback, useEffect, useRef, useState } from "react";
import EnergyRatingModal from "../components/EnergyRatingModal";
import SubjectChapterTopicPicker, {
  type TrioSelection,
} from "../components/SubjectChapterTopicPicker";
import TimerRing from "../components/TimerRing";
import { useBackup } from "../context/BackupContext";
import { useTheme } from "../context/ThemeContext";
import { useAutoSave } from "../hooks/useAutoSave";
import { useWakeLock } from "../hooks/useWakeLock";
import type { Session, Subject, Task, Topic } from "../types";
import { playStartChime } from "../utils/audio";
import { saveSessionIDB } from "../utils/indexedDB";
import {
  addStudyTime,
  getProjects,
  getSubjects,
  getTasks,
  saveProject,
  saveSession,
  saveTasksForTopic,
} from "../utils/storage";

const INITIAL_PRESETS = [25, 45, 65, 90];
const DEFAULT_TOPIC = "Unlabelled";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatTime(ms: number | undefined | null): string {
  if (ms == null || Number.isNaN(ms) || ms < 0) return "00:00";
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDeadlineCountdown(deadline: string): string {
  if (!deadline) return "";
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return "Overdue!";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0) return `Due in ${h}h ${m}m`;
  return `Due in ${m}m`;
}

function postToSW(msg: object) {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(msg);
  }
}

interface Props {
  selectedTopic?: Topic | null;
  onClearTopic?: () => void;
  remaining: number;
  isRunning: boolean;
  isPaused: boolean;
  totalDuration: number;
  startTimer: (topic: string, durationMs: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  onTimerComplete?: (ms: number) => void;
}

const TimerScreen: FC<Props> = ({
  selectedTopic = null,
  onClearTopic,
  remaining,
  isRunning,
  isPaused,
  totalDuration,
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  onTimerComplete,
}) => {
  const { palette } = useTheme();
  const { triggerSync } = useBackup();
  const { triggerAutoSave } = useAutoSave();
  const [selectedMins, setSelectedMins] = useState(25);
  const [editingPreset, setEditingPreset] = useState<number | null>(null);
  const [presetValues, setPresetValues] = useState([...INITIAL_PRESETS]);
  const [customInput, setCustomInput] = useState("");
  const [showRating, setShowRating] = useState(false);
  const [completedMs, setCompletedMs] = useState(0);
  const { acquireWakeLock, releaseWakeLock } = useWakeLock();
  const lastTapRef = useRef(0);

  // Label picker — now uses SubjectChapterTopicPicker
  const [customLabel, setCustomLabel] = useState("");
  const [showTrioPicker, setShowTrioPicker] = useState(false);
  const [pickerContext, setPickerContext] = useState<"label" | "project">(
    "label",
  );
  const [selectedTopicFromPicker, setSelectedTopicFromPicker] = useState<{
    topicId?: string;
    subjectId?: string;
    chapterId?: string;
  } | null>(null);

  // Legacy subject list for dropdown (kept for backward compat)
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Project link
  const [currentProject, setCurrentProject] = useState("");
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [projects, setProjects] = useState<string[]>([]);

  // Tasks state
  const TASKS_KEY = selectedTopic?.id || "__general__";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskAlarm, setNewTaskAlarm] = useState(false);
  const [, setTickTrigger] = useState(0);

  // Drag/hold for task reordering
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holdActive, setHoldActive] = useState<number | null>(null);

  const prevIsRunningRef = useRef(false);
  const prevTotalDurationRef = useRef(0);

  // Load data
  useEffect(() => {
    setTasks(getTasks(TASKS_KEY));
  }, [TASKS_KEY]);

  useEffect(() => {
    setSubjects(getSubjects());
    setProjects(getProjects());
  }, []);

  useEffect(() => {
    if (showProjectPicker) {
      setProjects(getProjects());
    }
  }, [showProjectPicker]);

  useEffect(() => {
    const id = setInterval(() => setTickTrigger((n) => n + 1), 60000);
    return () => clearInterval(id);
  }, []);

  // Detect natural timer completion
  useEffect(() => {
    const wasRunning = prevIsRunningRef.current;
    const prevDuration = prevTotalDurationRef.current;
    prevIsRunningRef.current = isRunning;
    prevTotalDurationRef.current = totalDuration;

    if (
      wasRunning &&
      !isRunning &&
      !isPaused &&
      remaining === 0 &&
      prevDuration > 0
    ) {
      const actualMs = prevDuration;
      setCompletedMs(actualMs);
      setShowRating(true);
      releaseWakeLock();
      onTimerComplete?.(actualMs);
    }
  }, [
    isRunning,
    isPaused,
    remaining,
    totalDuration,
    releaseWakeLock,
    onTimerComplete,
  ]);

  const saveTasks = useCallback(
    (updated: Task[]) => {
      setTasks(updated);
      saveTasksForTopic(TASKS_KEY, updated);
      triggerSync();
    },
    [TASKS_KEY, triggerSync],
  );

  const handleAddTask = () => {
    if (!newTaskName.trim()) return;
    const task: Task = {
      id: genId(),
      topicId: TASKS_KEY,
      name: newTaskName.trim(),
      completed: false,
      deadline: newTaskDeadline,
      alarmSet: newTaskAlarm,
      createdAt: Date.now(),
    };
    if (newTaskAlarm && newTaskDeadline) {
      postToSW({
        type: "SCHEDULE_ALARM",
        payload: { id: task.id, title: task.name, deadline: newTaskDeadline },
      });
    }
    saveTasks([...tasks, task]);
    setNewTaskName("");
    setNewTaskDeadline("");
    setNewTaskAlarm(false);
    setShowAddTask(false);
  };

  const handleToggleTask = (id: string) => {
    saveTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };

  const handleDeleteTask = (id: string) => {
    postToSW({ type: "CANCEL_ALARM", payload: { id } });
    saveTasks(tasks.filter((t) => t.id !== id));
  };

  const handleToggleAlarm = (task: Task) => {
    const updated = { ...task, alarmSet: !task.alarmSet };
    if (updated.alarmSet && updated.deadline) {
      postToSW({
        type: "SCHEDULE_ALARM",
        payload: { id: task.id, title: task.name, deadline: task.deadline },
      });
    } else {
      postToSW({ type: "CANCEL_ALARM", payload: { id: task.id } });
    }
    saveTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
  };

  const handleMoveTask = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= tasks.length) return;
    const updated = [...tasks];
    const temp = updated[idx];
    updated[idx] = updated[newIdx];
    updated[newIdx] = temp;
    saveTasks(updated);
  };

  const topicName = selectedTopic?.name || customLabel || DEFAULT_TOPIC;
  const safeRemaining =
    Number.isNaN(remaining) || remaining < 0 ? totalDuration || 0 : remaining;
  const safeTotal =
    Number.isNaN(totalDuration) || totalDuration <= 0
      ? selectedMins * 60 * 1000
      : totalDuration;
  const progress =
    safeTotal > 0 ? Math.min(1, Math.max(0, 1 - safeRemaining / safeTotal)) : 0;
  const displayRemaining =
    isRunning || isPaused ? safeRemaining : selectedMins * 60 * 1000;

  const filteredProjects = projects.filter((p) =>
    p.toLowerCase().includes(projectSearch.toLowerCase()),
  );
  // keep subjects available for backward compat
  const _subjects = subjects;

  const handleStart = () => {
    const mins = customInput
      ? Number.parseInt(customInput) || selectedMins
      : selectedMins;
    acquireWakeLock();
    startTimer(topicName, mins * 60 * 1000);
    triggerAutoSave();
  };

  const handleStop = () => {
    releaseWakeLock();
    const elapsedMs = safeTotal - safeRemaining;
    stopTimer();
    setCompletedMs(Math.max(elapsedMs, 1000));
    setShowRating(true);
  };

  const handleSaveSession = (rating: number, note: string) => {
    const session: Session = {
      id: genId(),
      topic: topicName,
      topicId: selectedTopic?.id || selectedTopicFromPicker?.topicId,
      subjectId: selectedTopic?.subjectId || selectedTopicFromPicker?.subjectId,
      chapterId: selectedTopic?.chapterId || selectedTopicFromPicker?.chapterId,
      duration: safeTotal,
      actualTime: completedMs,
      completionPct: Math.round((completedMs / safeTotal) * 100),
      energyRating: rating,
      note,
      timestamp: Date.now(),
      project: currentProject || undefined,
    };
    saveSession(session);
    saveSessionIDB(session);
    triggerSync();
    if (selectedTopic) {
      addStudyTime(selectedTopic.id, completedMs);
      addStudyTime(selectedTopic.chapterId, completedMs);
      addStudyTime(selectedTopic.subjectId, completedMs);
    } else if (selectedTopicFromPicker?.topicId) {
      addStudyTime(selectedTopicFromPicker.topicId, completedMs);
      if (selectedTopicFromPicker.chapterId)
        addStudyTime(selectedTopicFromPicker.chapterId, completedMs);
      if (selectedTopicFromPicker.subjectId)
        addStudyTime(selectedTopicFromPicker.subjectId, completedMs);
    }
    setShowRating(false);
    playStartChime();
  };

  const handleSkipRating = () => {
    const session: Session = {
      id: genId(),
      topic: topicName,
      topicId: selectedTopic?.id || selectedTopicFromPicker?.topicId,
      subjectId: selectedTopic?.subjectId || selectedTopicFromPicker?.subjectId,
      chapterId: selectedTopic?.chapterId || selectedTopicFromPicker?.chapterId,
      duration: safeTotal,
      actualTime: completedMs,
      completionPct: Math.round((completedMs / safeTotal) * 100),
      energyRating: 0,
      note: "",
      timestamp: Date.now(),
      project: currentProject || undefined,
    };
    saveSession(session);
    saveSessionIDB(session);
    triggerSync();
    if (selectedTopic) {
      addStudyTime(selectedTopic.id, completedMs);
      addStudyTime(selectedTopic.chapterId, completedMs);
      addStudyTime(selectedTopic.subjectId, completedMs);
    } else if (selectedTopicFromPicker?.topicId) {
      addStudyTime(selectedTopicFromPicker.topicId, completedMs);
      if (selectedTopicFromPicker.chapterId)
        addStudyTime(selectedTopicFromPicker.chapterId, completedMs);
      if (selectedTopicFromPicker.subjectId)
        addStudyTime(selectedTopicFromPicker.subjectId, completedMs);
    }
    setShowRating(false);
    playStartChime();
  };

  const handleTrioSelect = (sel: TrioSelection) => {
    if (pickerContext === "label") {
      setCustomLabel(sel.label);
      if (sel.topic) {
        setSelectedTopicFromPicker({
          topicId: sel.topic.id,
          subjectId: sel.subject?.id,
          chapterId: sel.chapter?.id,
        });
      } else if (sel.chapter) {
        setSelectedTopicFromPicker({
          subjectId: sel.subject?.id,
          chapterId: sel.chapter.id,
        });
      } else if (sel.subject) {
        setSelectedTopicFromPicker({ subjectId: sel.subject.id });
      } else {
        setSelectedTopicFromPicker(null);
      }
    }
    // For project context, just use the label as a project tag
    if (pickerContext === "project") {
      setCurrentProject(sel.label);
    }
    setShowTrioPicker(false);
  };

  const handlePresetTap = (idx: number) => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      setEditingPreset(idx);
    } else {
      setSelectedMins(presetValues[idx]);
      setCustomInput("");
    }
    lastTapRef.current = now;
  };

  const glassCard: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
  };

  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 10,
    color: palette.text,
    outline: "none",
    fontSize: 14,
    padding: "9px 12px",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  // Suppress unused warning — subjects used in SubjectChapterTopicPicker indirectly
  void _subjects;

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
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: palette.text,
            margin: 0,
          }}
        >
          Naksha 🧭
        </h2>
        <p
          style={{
            fontSize: 12,
            color: palette.accent,
            margin: "3px 0 0",
            opacity: 0.8,
          }}
        >
          Your Time. Your Orbit.
        </p>
      </div>

      {/* Topic badge — opens SubjectChapterTopicPicker */}
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              display: "inline-block",
              padding: "6px 18px",
              borderRadius: 20,
              background: `${palette.accent}18`,
              color: palette.accent,
              fontSize: 13,
              fontWeight: 600,
              border: `1px solid ${palette.accent}40`,
              boxShadow: `0 0 8px ${palette.accentGlow}30`,
            }}
          >
            {topicName}
          </span>
          {selectedTopic && onClearTopic ? (
            <button
              type="button"
              data-ocid="timer.topic.close_button"
              onClick={onClearTopic}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: palette.textMuted,
                padding: 2,
              }}
            >
              <X size={14} />
            </button>
          ) : (
            <button
              type="button"
              data-ocid="timer.label.edit_button"
              onClick={() => {
                setPickerContext("label");
                setShowTrioPicker(true);
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: palette.textMuted,
                padding: 2,
              }}
              title="Change label"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Project link badge */}
      <div
        style={{
          textAlign: "center",
          marginBottom: 20,
          display: "flex",
          justifyContent: "center",
          gap: 6,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          data-ocid="timer.project.button"
          onClick={() => setShowProjectPicker(!showProjectPicker)}
          style={{
            padding: "4px 14px",
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.12)",
            background: currentProject ? `${palette.accent}14` : "transparent",
            color: currentProject ? palette.accent : palette.textMuted,
            fontSize: 12,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Briefcase size={11} />
          {currentProject || "Project: None"}
        </button>
        {/* Book icon to open trio picker for project/topic tagging */}
        <button
          type="button"
          data-ocid="timer.project.open_modal_button"
          onClick={() => {
            setPickerContext("project");
            setShowTrioPicker(true);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: palette.textMuted,
            padding: 4,
            display: "flex",
            alignItems: "center",
          }}
          title="Pick Subject→Chapter→Topic"
        >
          <BookOpen size={14} />
        </button>

        {/* Project picker dropdown */}
        {showProjectPicker && (
          <div
            style={{
              ...glassCard,
              padding: 12,
              width: 240,
              position: "absolute",
              zIndex: 10,
              marginTop: 48,
              animation: "slide-up 0.2s ease",
            }}
          >
            <input
              type="text"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && projectSearch.trim()) {
                  const p = projectSearch.trim();
                  saveProject(p);
                  setCurrentProject(p);
                  setProjects(getProjects());
                  setShowProjectPicker(false);
                  setProjectSearch("");
                }
                if (e.key === "Escape") setShowProjectPicker(false);
              }}
              placeholder="Project name..."
              style={{ ...inputStyle, fontSize: 13, marginBottom: 8 }}
              // biome-ignore lint/a11y/noAutofocus: intentional UX
              autoFocus
            />
            {filteredProjects.length > 0 && (
              <div style={{ maxHeight: 140, overflowY: "auto" }}>
                {filteredProjects.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setCurrentProject(p);
                      setShowProjectPicker(false);
                      setProjectSearch("");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "7px 10px",
                      borderRadius: 8,
                      border: "none",
                      background:
                        currentProject === p
                          ? `${palette.accent}20`
                          : "transparent",
                      color:
                        currentProject === p ? palette.accent : palette.text,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {projectSearch.trim() &&
              !projects.includes(projectSearch.trim()) && (
                <button
                  type="button"
                  onClick={() => {
                    const p = projectSearch.trim();
                    saveProject(p);
                    setCurrentProject(p);
                    setProjects(getProjects());
                    setShowProjectPicker(false);
                    setProjectSearch("");
                  }}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: `1px dashed ${palette.accent}40`,
                    background: "transparent",
                    color: palette.accent,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <Plus size={12} /> Create "{projectSearch.trim()}"
                </button>
              )}
            {currentProject && (
              <button
                type="button"
                onClick={() => {
                  setCurrentProject("");
                  setShowProjectPicker(false);
                }}
                style={{
                  marginTop: 6,
                  width: "100%",
                  padding: "5px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  color: palette.textMuted,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                Clear project
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timer ring — neon glow */}
      <div
        style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}
      >
        <TimerRing
          progress={progress}
          size={260}
          isRunning={isRunning}
          isPaused={isPaused}
          color={palette.accent}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: palette.text,
                letterSpacing: -2,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                textShadow: isRunning
                  ? `0 0 20px ${palette.accentGlow}60`
                  : "none",
              }}
            >
              {formatTime(displayRemaining)}
            </div>
            <div
              style={{
                fontSize: 11,
                color: palette.textMuted,
                marginTop: 4,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              {isRunning ? "Running" : isPaused ? "Paused" : "Ready"}
            </div>
          </div>
        </TimerRing>
      </div>

      {/* Controls */}
      {!isRunning && !isPaused ? (
        <>
          <div style={{ ...glassCard, padding: 16, marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 12, color: palette.textMuted }}>
                Duration
              </span>
              <span
                style={{ fontSize: 14, fontWeight: 700, color: palette.accent }}
              >
                {selectedMins} min
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={120}
              value={selectedMins}
              onChange={(e) => {
                setSelectedMins(Number(e.target.value));
                setCustomInput("");
              }}
              style={{ width: "100%" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                color: palette.textMuted,
                marginTop: 2,
              }}
            >
              <span>1 min</span>
              <span>120 min</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              justifyContent: "center",
            }}
          >
            {presetValues.map((val, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: stable preset list
              <div key={idx} style={{ flex: 1 }}>
                {editingPreset === idx ? (
                  <input
                    type="number"
                    // biome-ignore lint/a11y/noAutofocus: intentional UX
                    autoFocus
                    min={1}
                    max={180}
                    defaultValue={val}
                    onBlur={(e) => {
                      const v = Number.parseInt(e.target.value);
                      if (v > 0) {
                        const updated = [...presetValues];
                        updated[idx] = v;
                        setPresetValues(updated);
                        setSelectedMins(v);
                      }
                      setEditingPreset(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        (e.target as HTMLInputElement).blur();
                    }}
                    style={{
                      ...inputStyle,
                      textAlign: "center",
                      padding: "8px 4px",
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    data-ocid={`timer.preset.button.${idx + 1}`}
                    onPointerDown={() => handlePresetTap(idx)}
                    style={{
                      width: "100%",
                      padding: "8px 4px",
                      borderRadius: 10,
                      border:
                        selectedMins === val
                          ? `1px solid ${palette.accent}60`
                          : "1px solid rgba(255,255,255,0.10)",
                      background:
                        selectedMins === val
                          ? `${palette.accent}20`
                          : "rgba(255,255,255,0.04)",
                      color:
                        selectedMins === val
                          ? palette.accent
                          : palette.textMuted,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {val}m
                  </button>
                )}
              </div>
            ))}
          </div>

          <input
            type="number"
            value={customInput}
            onChange={(e) => {
              setCustomInput(e.target.value);
              if (e.target.value)
                setSelectedMins(
                  Number.parseInt(e.target.value) || selectedMins,
                );
            }}
            placeholder="Custom minutes..."
            style={inputStyle}
          />

          <div style={{ marginBottom: 12 }} />
          <button
            type="button"
            data-ocid="timer.start.primary_button"
            onClick={handleStart}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: 50,
              border: `1px solid ${palette.accent}60`,
              background: `${palette.accent}18`,
              color: palette.accent,
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              letterSpacing: 1,
              boxShadow: `0 0 18px ${palette.accentGlow}30, inset 0 0 12px ${palette.accentGlow}10`,
              transition: "all 0.2s ease",
            }}
          >
            ▶ Start Timer
          </button>
        </>
      ) : (
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button
            type="button"
            data-ocid="timer.pause.button"
            onClick={() => {
              if (isPaused) {
                resumeTimer();
              } else {
                pauseTimer();
              }
              triggerAutoSave();
            }}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: 50,
              border: `1px solid ${palette.accent}50`,
              background: "rgba(255,255,255,0.05)",
              backdropFilter: "blur(8px)",
              color: palette.accent,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              minHeight: 52,
              boxShadow: `0 0 12px ${palette.accentGlow}25`,
              transition: "all 0.2s ease",
            }}
          >
            {isPaused ? "▶ Resume" : "⏸ Pause"}
          </button>
          <button
            type="button"
            data-ocid="timer.stop.button"
            onClick={handleStop}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: 50,
              border: "1px solid rgba(239,68,68,0.4)",
              background: "rgba(239,68,68,0.08)",
              backdropFilter: "blur(8px)",
              color: "#EF4444",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              minHeight: 52,
              boxShadow: "0 0 12px rgba(239,68,68,0.2)",
              transition: "all 0.2s ease",
            }}
          >
            ⏹ Stop
          </button>
        </div>
      )}

      {/* Tasks Section */}
      <div style={{ marginTop: 36 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: palette.text,
              margin: 0,
              letterSpacing: 0.5,
              textTransform: "uppercase",
              opacity: 0.7,
            }}
          >
            Tasks
          </h3>
          <span style={{ fontSize: 11, color: palette.textMuted }}>
            {tasks.filter((t) => t.completed).length}/{tasks.length} done
          </span>
        </div>

        {tasks.length === 0 && !showAddTask && (
          <div
            data-ocid="timer.tasks.empty_state"
            style={{
              textAlign: "center",
              padding: "14px",
              color: palette.textMuted,
              fontSize: 12,
              background: "rgba(255,255,255,0.03)",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.06)",
              marginBottom: 8,
            }}
          >
            No tasks yet
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {tasks.map((task, taskIdx) => (
            <div
              key={task.id}
              data-task-item
              data-ocid={`timer.tasks.item.${taskIdx + 1}`}
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.09)",
                padding: "10px 12px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: task.completed ? 0.55 : 1,
                minHeight: 52,
                boxShadow:
                  holdActive === taskIdx
                    ? `0 0 0 2px ${palette.accent}50, 0 4px 16px rgba(0,0,0,0.4)`
                    : "none",
                transition: "box-shadow 0.15s, opacity 0.15s",
              }}
            >
              {/* Grip drag handle — hold to reorder */}
              <div
                data-ocid={`timer.tasks.drag_handle.${taskIdx + 1}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  holdTimerRef.current = setTimeout(() => {
                    setHoldActive(taskIdx);
                    setDragIndex(taskIdx);
                  }, 300);
                }}
                onPointerUp={() => {
                  if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                  setHoldActive(null);
                  setDragIndex(null);
                }}
                onPointerMove={(e) => {
                  if (dragIndex === null || holdActive === null) return;
                  const el = e.currentTarget.closest(
                    "[data-task-item]",
                  ) as HTMLElement;
                  if (!el) return;
                  const rect = el.getBoundingClientRect();
                  const midY = rect.top + rect.height / 2;
                  if (e.clientY < midY - 12 && dragIndex > 0) {
                    handleMoveTask(dragIndex, -1);
                    setDragIndex(dragIndex - 1);
                    setHoldActive(dragIndex - 1);
                  } else if (
                    e.clientY > midY + 12 &&
                    dragIndex < tasks.length - 1
                  ) {
                    handleMoveTask(dragIndex, 1);
                    setDragIndex(dragIndex + 1);
                    setHoldActive(dragIndex + 1);
                  }
                }}
                onPointerLeave={() => {
                  if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
                  if (dragIndex !== null) {
                    setDragIndex(null);
                    setHoldActive(null);
                  }
                }}
                style={{
                  cursor: holdActive === taskIdx ? "grabbing" : "grab",
                  color:
                    holdActive === taskIdx ? palette.accent : palette.textMuted,
                  padding: "2px",
                  flexShrink: 0,
                  touchAction: "none",
                  opacity: holdActive === taskIdx ? 1 : 0.5,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <GripVertical size={16} />
              </div>

              {/* Checkbox */}
              <button
                type="button"
                data-ocid={`timer.tasks.checkbox.${taskIdx + 1}`}
                onClick={() => handleToggleTask(task.id)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `2px solid ${
                    task.completed ? palette.accent : "rgba(255,255,255,0.25)"
                  }`,
                  background: task.completed ? palette.accent : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  boxShadow: task.completed
                    ? `0 0 6px ${palette.accentGlow}50`
                    : "none",
                }}
              >
                {task.completed && <Check size={11} color="#000" />}
              </button>

              {/* Task text — centered vertically */}
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    color: palette.text,
                    fontWeight: 500,
                    textDecoration: task.completed ? "line-through" : "none",
                    wordBreak: "break-word",
                    opacity: task.completed ? 0.6 : 1,
                  }}
                >
                  {task.name}
                </div>
                {task.deadline && (
                  <div
                    style={{
                      fontSize: 11,
                      color: task.completed ? palette.textMuted : "#F59E0B",
                      marginTop: 2,
                    }}
                  >
                    {formatDeadlineCountdown(task.deadline)}
                  </div>
                )}
              </div>

              {task.deadline && (
                <button
                  type="button"
                  data-ocid={`timer.tasks.toggle.${taskIdx + 1}`}
                  onClick={() => handleToggleAlarm(task)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: task.alarmSet ? palette.accent : palette.textMuted,
                    padding: 2,
                    flexShrink: 0,
                  }}
                >
                  {task.alarmSet ? <Bell size={14} /> : <BellOff size={14} />}
                </button>
              )}

              <button
                type="button"
                data-ocid={`timer.tasks.delete_button.${taskIdx + 1}`}
                onClick={() => handleDeleteTask(task.id)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(239,68,68,0.6)",
                  padding: 2,
                  flexShrink: 0,
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        {showAddTask ? (
          <div style={{ ...glassCard, padding: 12, marginTop: 8 }}>
            <input
              type="text"
              data-ocid="timer.tasks.input"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
              placeholder="Task name..."
              // biome-ignore lint/a11y/noAutofocus: intentional UX
              autoFocus
              style={{ ...inputStyle, marginBottom: 8 }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <input
                type="datetime-local"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                style={{ ...inputStyle, flex: 1, fontSize: 12 }}
              />
              <button
                type="button"
                data-ocid="timer.tasks.toggle"
                onClick={() => setNewTaskAlarm(!newTaskAlarm)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: newTaskAlarm ? palette.accent : palette.textMuted,
                  padding: 5,
                  flexShrink: 0,
                }}
              >
                {newTaskAlarm ? <Bell size={17} /> : <BellOff size={17} />}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                data-ocid="timer.tasks.submit_button"
                onClick={handleAddTask}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 8,
                  border: `1px solid ${palette.accent}50`,
                  background: `${palette.accent}18`,
                  color: palette.accent,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Add
              </button>
              <button
                type="button"
                data-ocid="timer.tasks.cancel_button"
                onClick={() => {
                  setShowAddTask(false);
                  setNewTaskName("");
                  setNewTaskDeadline("");
                  setNewTaskAlarm(false);
                }}
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "transparent",
                  color: palette.textMuted,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            data-ocid="timer.tasks.open_modal_button"
            onClick={() => setShowAddTask(true)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 10,
              border: "1px dashed rgba(255,255,255,0.15)",
              background: "transparent",
              color: palette.textMuted,
              fontSize: 13,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 6,
            }}
          >
            <Plus size={13} /> Add Task
          </button>
        )}
      </div>

      {/* Subject-Chapter-Topic Picker */}
      {showTrioPicker && (
        <SubjectChapterTopicPicker
          onSelect={handleTrioSelect}
          onClose={() => setShowTrioPicker(false)}
          initialLabel={customLabel}
        />
      )}

      {showRating && (
        <EnergyRatingModal
          topic={topicName}
          actualMs={completedMs}
          totalMs={safeTotal}
          onSave={handleSaveSession}
          onSkip={handleSkipRating}
        />
      )}
    </div>
  );
};

export default TimerScreen;
