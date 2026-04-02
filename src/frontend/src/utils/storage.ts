import type {
  AppearanceSettings,
  Chapter,
  Note,
  PaletteId,
  Session,
  Subject,
  Task,
  TimerState,
  Todo,
  Topic,
} from "../types";

const KEYS = {
  username: "nk_username",
  notes: "nk_notes",
  timerState: "nk_timerState",
  todos: "nk_todos",
  sessions: "nk_sessions",
  settings: "nk_settings",
  subjects: "nk_subjects",
  chapters: "nk_chapters",
  topics: "nk_topics",
  theme: "nk_theme",
  appearance: "nk_appearance",
  projects: "nk_projects",
} as const;

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getUsername(): string | null {
  try {
    return localStorage.getItem(KEYS.username);
  } catch {
    return null;
  }
}
export function setUsername(name: string): void {
  try {
    localStorage.setItem(KEYS.username, name);
  } catch {}
}

export function getNotes(): Note[] {
  const notes = get<Note[]>(KEYS.notes, []);
  while (notes.length < 3) {
    notes.push({
      id: `note-${notes.length}`,
      content: "",
      updatedAt: Date.now(),
    });
  }
  return notes.slice(0, 3);
}
export function saveNotes(notes: Note[]): void {
  set(KEYS.notes, notes);
}

export function getTimerState(): TimerState | null {
  return get<TimerState | null>(KEYS.timerState, null);
}
export function saveTimerState(state: TimerState): void {
  set(KEYS.timerState, state);
}
export function clearTimerState(): void {
  try {
    localStorage.removeItem(KEYS.timerState);
  } catch {}
}

export function getTodos(): Todo[] {
  return get<Todo[]>(KEYS.todos, []);
}
export function saveTodos(todos: Todo[]): void {
  set(KEYS.todos, todos);
}

export function getSessions(): Session[] {
  return get<Session[]>(KEYS.sessions, []);
}
export function saveSession(session: Session): void {
  const sessions = getSessions();
  sessions.push(session);
  set(KEYS.sessions, sessions);
}
export function saveSessionLabel(id: string, newTopic: string): void {
  const sessions = getSessions();
  const updated = sessions.map((s) =>
    s.id === id ? { ...s, topic: newTopic } : s,
  );
  set(KEYS.sessions, updated);
}

export function updateSessionEnergy(id: string, rating: number): void {
  const sessions = getSessions();
  const updated = sessions.map((s) =>
    s.id === id ? { ...s, energyRating: rating } : s,
  );
  set(KEYS.sessions, updated);
}

export function updateSessionTopic(
  id: string,
  topic: string,
  topicId?: string,
  subjectId?: string,
  chapterId?: string,
): void {
  const sessions = getSessions();
  const updated = sessions.map((s) =>
    s.id === id ? { ...s, topic, topicId, subjectId, chapterId } : s,
  );
  set(KEYS.sessions, updated);
}

export function getSubjects(): Subject[] {
  return get<Subject[]>(KEYS.subjects, []);
}
export function saveSubjects(subjects: Subject[]): void {
  set(KEYS.subjects, subjects);
}

export function getChapters(): Chapter[] {
  return get<Chapter[]>(KEYS.chapters, []);
}
export function saveChapters(chapters: Chapter[]): void {
  set(KEYS.chapters, chapters);
}

export function getTopics(): Topic[] {
  return get<Topic[]>(KEYS.topics, []);
}
export function saveTopics(topics: Topic[]): void {
  set(KEYS.topics, topics);
}

export function getTasks(topicId: string): Task[] {
  return get<Task[]>(`nk_tasks_${topicId}`, []);
}
export function saveTasksForTopic(topicId: string, tasks: Task[]): void {
  set(`nk_tasks_${topicId}`, tasks);
}

export function getTheme(): PaletteId {
  const saved = get<string>(KEYS.theme, "spotify-green");
  return saved as PaletteId;
}
export function saveTheme(theme: PaletteId): void {
  set(KEYS.theme, theme);
}

const DEFAULT_APPEARANCE: AppearanceSettings = {
  backgroundImage: null,
  backgroundOpacity: 0.3,
  starsEnabled: true,
  starsOpacity: 0.8,
  shootingStarsEnabled: true,
  shootingStarsOpacity: 0.9,
  orionBeltEnabled: true,
  orionBeltOpacity: 0.7,
};

export function getAppearance(): AppearanceSettings {
  return get<AppearanceSettings>(KEYS.appearance, DEFAULT_APPEARANCE);
}
export function saveAppearance(settings: AppearanceSettings): void {
  set(KEYS.appearance, settings);
}

export function addStudyTime(entityId: string, ms: number): void {
  const key = `nk_studytime_${entityId}`;
  const current = get<number>(key, 0);
  set(key, current + ms);
}
export function getStudyTime(entityId: string): number {
  return get<number>(`nk_studytime_${entityId}`, 0);
}

export function getProjects(): string[] {
  return get<string[]>(KEYS.projects, []);
}
export function saveProject(name: string): void {
  const projects = getProjects();
  if (!projects.includes(name)) {
    projects.push(name);
    set(KEYS.projects, projects);
  }
}
export function saveProjects(projects: string[]): void {
  set(KEYS.projects, projects);
}
