export type Capacity = 'empty' | 'steady' | 'ready';
export type HabitVariantKind = 'tiny' | 'standard' | 'stretch';
export type HabitContext = 'anywhere' | 'home' | 'work' | 'outside' | 'phone';
export type CompletionSource = 'today' | 'widget' | 'notification' | 'history' | 'routine';

export interface HabitPauseInterval {
  startedOn: string;
  endedOn: string;
}

export interface HabitVariant {
  id: string;
  kind: HabitVariantKind;
  label: string;
  targetMinutes: number;
  reward: number;
}

export type ScheduleRule =
  | { type: 'daily' }
  | { type: 'weekdays'; days: number[] }
  | { type: 'timesPerWeek'; count: number }
  | { type: 'interval'; everyDays: number; anchorDate: string }
  | { type: 'anytime' };

export interface Habit {
  id: string;
  title: string;
  reason?: string;
  cue?: string;
  color: string;
  icon: string;
  variants: HabitVariant[];
  schedule: ScheduleRule;
  preferredTime?: string;
  reminderEnabled: boolean;
  priority: 1 | 2 | 3;
  contexts: HabitContext[];
  createdAt: string;
  pausedAt?: string | null;
  pausedUntil?: string | null;
  pauseHistory?: HabitPauseInterval[];
  archivedAt?: string | null;
  sortOrder: number;
}

export interface Completion {
  id: string;
  habitId: string;
  variantId: string;
  variantKind: HabitVariantKind;
  reward: number;
  occurredAt: string;
  loggedAt: string;
  localDate: string;
  source: CompletionSource;
  note?: string;
}

export interface FocusSession {
  id: string;
  title: string;
  plannedSeconds: number;
  startedAt: string;
  endedAt?: string | null;
  pausedAt?: string | null;
  pausedSeconds: number;
  completed: boolean;
  interruptionCount: number;
}

export interface CaptureItem {
  id: string;
  text: string;
  createdAt: string;
  resolvedAt?: string | null;
  convertedHabitId?: string | null;
}

export interface RoutineStep {
  id: string;
  title: string;
  tinyTitle?: string;
  estimateMinutes: number;
  sortOrder: number;
}

export interface Routine {
  id: string;
  title: string;
  icon: string;
  color: string;
  steps: RoutineStep[];
  createdAt: string;
  archivedAt?: string | null;
}

export interface ActionSuggestion {
  habit: Habit;
  variant: HabitVariant;
  score: number;
  explanation: string;
}

export interface RhythmSummary {
  wins: number;
  activeDays: number;
  opportunities: number;
  percentage: number;
  comeback: boolean;
}

export interface RewardSummary {
  totalSparks: number;
  level: number;
  levelProgress: number;
  nextLevelAt: number;
}
