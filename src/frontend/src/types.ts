export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number;
  totalDuration: number;
  elapsed: number;
  topic: string;
}

export interface Session {
  id: string;
  topic: string;
  duration: number;
  actualTime: number;
  completionPct: number;
  energyRating: number; // -1 = auto-saved/skipped, 0 = no rating, 1-5 = rating
  note: string;
  timestamp: number;
  topicId?: string;
  subjectId?: string;
  chapterId?: string;
  project?: string;
}

export interface Todo {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  deadline: string;
  completed: boolean;
  alarmSet: boolean;
  createdAt: number;
}

export interface Note {
  id: string;
  content: string;
  updatedAt: number;
}

export type TabId =
  | "home"
  | "topics"
  | "timer"
  | "todo"
  | "dashboard"
  | "settings";

export interface Subject {
  id: string;
  name: string;
  colorAccent: string;
  createdAt: number;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  createdAt: number;
}

export interface Topic {
  id: string;
  chapterId: string;
  subjectId: string;
  name: string;
  createdAt: number;
}

export interface Task {
  id: string;
  topicId: string;
  name: string;
  completed: boolean;
  deadline: string;
  alarmSet: boolean;
  createdAt: number;
}

// ---- Palette (replaces old ThemeId/ThemeColors) ----

export type PaletteId =
  | "spotify-green"
  | "midnight-purple"
  | "royal-gold"
  | "ethereal-ink"
  | "solar-flare"
  | "nordic-frost"
  | "cherry-blossom"
  | "ocean-depth"
  | "crimson-dawn"
  | "sage-mist"
  | "copper-sky"
  | "obsidian-white";

export interface Palette {
  id: PaletteId;
  name: string;
  accent: string;
  accentGlow: string;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

// Legacy compatibility — some screens still use ThemeColors shape
export type ThemeId = PaletteId;

export interface ThemeColors {
  bg: string;
  bgGrad: string;
  card: string;
  cardShadowDark: string;
  cardShadowLight: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  insetShadowDark: string;
  insetShadowLight: string;
  starColor: string;
}

export interface AppearanceSettings {
  backgroundImage: string | null;
  backgroundOpacity: number;
  starsEnabled: boolean;
  starsOpacity: number;
  shootingStarsEnabled: boolean;
  shootingStarsOpacity: number;
  orionBeltEnabled: boolean;
  orionBeltOpacity: number;
}
