import { Bell, BellOff, ChevronDown, Edit3, Plus, Trash2 } from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { useBackup } from "../context/BackupContext";
import { useTheme } from "../context/ThemeContext";
import { useAutoSave } from "../hooks/useAutoSave";
import type { Todo } from "../types";
import { getTodos, saveTodos } from "../utils/storage";

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function postAlarmToSW(todo: Todo) {
  if (
    "serviceWorker" in navigator &&
    navigator.serviceWorker.controller &&
    todo.deadline
  ) {
    navigator.serviceWorker.controller.postMessage({
      type: "SCHEDULE_ALARM",
      payload: { id: todo.id, title: todo.title, deadline: todo.deadline },
    });
  }
}

function cancelAlarmInSW(id: string) {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "CANCEL_ALARM",
      payload: { id },
    });
  }
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#22C55E",
};

const PRIORITY_BG: Record<string, string> = {
  high: "rgba(239,68,68,0.1)",
  medium: "rgba(245,158,11,0.1)",
  low: "rgba(34,197,94,0.1)",
};

type FilterTab = "all" | "active" | "completed";

interface TodoFormData {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  deadline: string;
  alarmSet: boolean;
}

const DEFAULT_FORM: TodoFormData = {
  title: "",
  description: "",
  priority: "medium",
  deadline: "",
  alarmSet: false,
};

const TodoModal: FC<{
  initial?: TodoFormData;
  onSave: (data: TodoFormData) => void;
  onClose: () => void;
  theme: ReturnType<
    typeof import("../context/ThemeContext")["useTheme"]
  >["theme"];
}> = ({ initial = DEFAULT_FORM, onSave, onClose, theme }) => {
  const [form, setForm] = useState<TodoFormData>(initial);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: `1px solid ${theme.cardShadowDark}`,
    background: theme.bg,
    fontSize: 14,
    color: theme.text,
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 12,
    display: "block",
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop dismiss is supplemental
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 300,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        data-ocid="todo.modal"
        style={{
          width: "100%",
          maxWidth: 430,
          margin: "0 auto",
          background: theme.card,
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px 40px",
          borderTop: `1px solid ${theme.cardShadowDark}`,
        }}
      >
        <h3
          style={{
            margin: "0 0 18px",
            fontSize: 17,
            fontWeight: 700,
            color: theme.text,
          }}
        >
          {initial.title ? "Edit Task" : "New Task"}
        </h3>

        <input
          id="todo-title"
          type="text"
          data-ocid="todo.input"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Task title *"
          style={inputStyle}
        />

        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description (optional)"
          style={{
            ...inputStyle,
            minHeight: 68,
            resize: "vertical",
          }}
        />

        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="priority-high"
            style={{
              fontSize: 12,
              color: theme.textMuted,
              display: "block",
              marginBottom: 6,
            }}
          >
            Priority
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {(["high", "medium", "low"] as const).map((p) => (
              <button
                type="button"
                key={p}
                id={`priority-${p}`}
                onClick={() => setForm({ ...form, priority: p })}
                style={{
                  flex: 1,
                  padding: "8px",
                  borderRadius: 8,
                  border:
                    form.priority === p
                      ? `2px solid ${PRIORITY_COLORS[p]}`
                      : `1px solid ${theme.cardShadowDark}`,
                  background: form.priority === p ? PRIORITY_BG[p] : theme.bg,
                  color: PRIORITY_COLORS[p],
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  minHeight: 40,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label
            htmlFor="todo-deadline"
            style={{
              fontSize: 12,
              color: theme.textMuted,
              display: "block",
              marginBottom: 6,
            }}
          >
            Deadline
          </label>
          <input
            id="todo-deadline"
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            style={inputStyle}
          />
        </div>

        {form.deadline && (
          <button
            type="button"
            onClick={() => setForm({ ...form, alarmSet: !form.alarmSet })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: `1px solid ${
                form.alarmSet ? theme.accent : theme.cardShadowDark
              }`,
              background: form.alarmSet ? `${theme.accent}15` : theme.bg,
              color: form.alarmSet ? theme.accent : theme.textMuted,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 16,
            }}
          >
            {form.alarmSet ? <Bell size={15} /> : <BellOff size={15} />}
            {form.alarmSet ? "Alarm On" : "Set Alarm"}
          </button>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            data-ocid="todo.cancel_button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: "13px",
              borderRadius: 10,
              border: `1px solid ${theme.cardShadowDark}`,
              background: theme.bg,
              color: theme.textMuted,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              minHeight: 48,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            data-ocid="todo.submit_button"
            onClick={() => {
              if (form.title.trim()) onSave(form);
            }}
            disabled={!form.title.trim()}
            style={{
              flex: 2,
              padding: "13px",
              borderRadius: 10,
              border: "none",
              background: theme.accent,
              color: theme.accentText,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              opacity: form.title.trim() ? 1 : 0.5,
              minHeight: 48,
            }}
          >
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
};

const TodoScreen: FC = () => {
  const { theme } = useTheme();
  const { triggerSync } = useBackup();
  const { triggerAutoSave } = useAutoSave();
  const [todos, setTodos] = useState<Todo[]>(getTodos);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const persist = (updated: Todo[]) => {
    setTodos(updated);
    saveTodos(updated);
    triggerSync();
    triggerAutoSave();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount to restore alarms
  useEffect(() => {
    for (const t of todos) {
      if (t.alarmSet && t.deadline && !t.completed) {
        postAlarmToSW(t);
      }
    }
  }, []);

  const filtered = todos.filter((t) => {
    if (filter === "active") return !t.completed;
    if (filter === "completed") return t.completed;
    return true;
  });

  const handleAdd = (data: TodoFormData) => {
    const todo: Todo = {
      ...data,
      id: genId(),
      completed: false,
      createdAt: Date.now(),
    };
    const updated = [todo, ...todos];
    persist(updated);
    if (todo.alarmSet && todo.deadline) postAlarmToSW(todo);
    setShowModal(false);
  };

  const handleEdit = (data: TodoFormData) => {
    if (!editingTodo) return;
    const updated = todos.map((t) =>
      t.id === editingTodo.id ? { ...t, ...data } : t,
    );
    persist(updated);
    const updatedTodo = updated.find((t) => t.id === editingTodo.id)!;
    if (updatedTodo.alarmSet && updatedTodo.deadline)
      postAlarmToSW(updatedTodo);
    else cancelAlarmInSW(editingTodo.id);
    setEditingTodo(null);
  };

  const handleToggle = (id: string) => {
    const updated = todos.map((t) =>
      t.id === id ? { ...t, completed: !t.completed } : t,
    );
    persist(updated);
  };

  const handleDelete = (id: string) => {
    cancelAlarmInSW(id);
    persist(todos.filter((t) => t.id !== id));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bgGrad,
        paddingBottom: 100,
        maxWidth: 430,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 16px 12px",
          borderBottom: `1px solid ${theme.cardShadowDark}`,
          background: theme.card,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 800,
              color: theme.text,
              margin: 0,
            }}
          >
            To-Do
          </h2>
          <p
            style={{ fontSize: 12, color: theme.textMuted, margin: "2px 0 0" }}
          >
            {todos.filter((t) => !t.completed).length} active
          </p>
        </div>
        <button
          type="button"
          data-ocid="todo.open_modal_button"
          onClick={() => setShowModal(true)}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "none",
            background: theme.accent,
            color: theme.accentText,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: "flex",
          background: theme.card,
          borderBottom: `1px solid ${theme.cardShadowDark}`,
        }}
      >
        {(["all", "active", "completed"] as FilterTab[]).map((f) => (
          <button
            type="button"
            key={f}
            data-ocid={`todo.${f}.tab`}
            onClick={() => setFilter(f)}
            style={{
              flex: 1,
              padding: "10px 8px",
              border: "none",
              borderBottom: `2px solid ${
                filter === f ? theme.accent : "transparent"
              }`,
              background: "none",
              color: filter === f ? theme.accent : theme.textMuted,
              fontSize: 13,
              fontWeight: filter === f ? 700 : 500,
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 0.15s",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div
          data-ocid="todo.empty_state"
          style={{
            textAlign: "center",
            padding: "56px 20px",
            color: theme.textMuted,
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <p style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>
            No tasks here
          </p>
          <p style={{ fontSize: 13, color: theme.textMuted }}>
            Add a task with the + button
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((todo, idx) => (
            <div
              key={todo.id}
              data-ocid={`todo.item.${idx + 1}`}
              style={{
                background: theme.card,
                borderBottom: `1px solid ${theme.cardShadowDark}`,
                opacity: todo.completed ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <div
                style={{
                  padding: "13px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  data-ocid={`todo.checkbox.${idx + 1}`}
                  onClick={() => handleToggle(todo.id)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    border: `2px solid ${
                      todo.completed ? theme.accent : theme.textMuted
                    }`,
                    background: todo.completed ? theme.accent : "none",
                    cursor: "pointer",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                >
                  {todo.completed && (
                    <span
                      style={{
                        color: theme.accentText,
                        fontSize: 13,
                        lineHeight: 1,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: theme.text,
                        textDecoration: todo.completed
                          ? "line-through"
                          : "none",
                        wordBreak: "break-word",
                      }}
                    >
                      {todo.title}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: PRIORITY_COLORS[todo.priority],
                        background: PRIORITY_BG[todo.priority],
                        borderRadius: 5,
                        padding: "2px 7px",
                        textTransform: "capitalize",
                      }}
                    >
                      {todo.priority}
                    </span>
                    {todo.alarmSet && <Bell size={12} color={theme.accent} />}
                  </div>

                  {todo.deadline && (
                    <p
                      style={{
                        fontSize: 12,
                        color: theme.textMuted,
                        margin: "3px 0 0",
                      }}
                    >
                      📅{" "}
                      {new Date(todo.deadline).toLocaleString(undefined, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  )}

                  {todo.description && (
                    <p
                      style={{
                        fontSize: 13,
                        color: theme.textMuted,
                        margin: "4px 0 0",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: expandedId === todo.id ? undefined : 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {todo.description}
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <button
                    type="button"
                    data-ocid={`todo.edit_button.${idx + 1}`}
                    onClick={() => setEditingTodo(todo)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 7,
                      border: `1px solid ${theme.cardShadowDark}`,
                      background: theme.bg,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Edit3 size={13} color={theme.textMuted} />
                  </button>
                  <button
                    type="button"
                    data-ocid={`todo.delete_button.${idx + 1}`}
                    onClick={() => handleDelete(todo.id)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 7,
                      border: `1px solid ${theme.cardShadowDark}`,
                      background: theme.bg,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Trash2 size={13} color="#EF4444" />
                  </button>
                  {todo.description && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(expandedId === todo.id ? null : todo.id)
                      }
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 7,
                        border: `1px solid ${theme.cardShadowDark}`,
                        background: theme.bg,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ChevronDown
                        size={13}
                        color={theme.textMuted}
                        style={{
                          transform:
                            expandedId === todo.id ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s",
                        }}
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TodoModal
          theme={theme}
          onSave={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
      {editingTodo && (
        <TodoModal
          theme={theme}
          initial={{
            title: editingTodo.title,
            description: editingTodo.description,
            priority: editingTodo.priority,
            deadline: editingTodo.deadline,
            alarmSet: editingTodo.alarmSet,
          }}
          onSave={handleEdit}
          onClose={() => setEditingTodo(null)}
        />
      )}
    </div>
  );
};

export default TodoScreen;
