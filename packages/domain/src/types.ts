export type Capacity = 'empty' | 'steady' | 'ready';
export type HabitVariantKind = 'tiny' | 'standard' | 'stretch';
export type HabitContext = 'anywhere' | 'home' | 'work' | 'outside' | 'phone';
export type CompletionSource = 'today' | 'widget' | 'notification' | 'history' | 'routine';
export type ReminderWindow = 'exact' | 'morning' | 'afternoon' | 'evening';
export type CompletionTag = 'timer_helped' | 'made_it_tiny' | 'body_double' | 'good_cue';
export type MomentumCadence = 'daily' | 'everyOtherDay';
export type MomentumProtectionKind = 'flex' | 'delay';

export interface HabitPauseInterval {
  startedOn: string;
  endedOn: string;
}

export interface MomentumProtection {
  windowStart: string;
  kind: MomentumProtectionKind;
}

export interface HabitMomentum {
  enabled: boolean;
  cadence: MomentumCadence;
  anchorDate: string;
  protections: MomentumProtection[];
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
  | { type: 'afterCompletion'; everyDays: number; anchorDate: string }
  | { type: 'anytime' };

export interface Habit {
  id: string;
  title: string;
  reason?: string;
  cue?: string;
  friction?: {
    environment?: string;
    materials?: string;
    firstStep?: string;
    obstacle?: string;
    fallback?: string;
    futureNote?: string;
  };
  color: string;
  icon: string;
  variants: HabitVariant[];
  schedule: ScheduleRule;
  preferredTime?: string;
  reminderWindow?: ReminderWindow;
  reminderEnabled: boolean;
  priority: 1 | 2 | 3;
  contexts: HabitContext[];
  createdAt: string;
  pausedAt?: string | null;
  pausedUntil?: string | null;
  pauseHistory?: HabitPauseInterval[];
  momentum?: HabitMomentum;
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
  context?: HabitContext;
  tags?: CompletionTag[];
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
  linkedHabitId?: string;
  focusMinutes?: number;
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

export interface MomentumSummary {
  cadence: MomentumCadence;
  cadenceDays: 1 | 2;
  current: number;
  best: number;
  completedWindows: number;
  protectedWindows: number;
  usedFlexPasses: number;
  flexPassesAvailable: number;
  activeWindowStart: string;
  nextWindowStart: string;
  activeWindowCompleted: boolean;
  activeWindowProtected: boolean;
  mostRecentMissedWindow?: string;
  status: 'not-started' | 'due' | 'on-track' | 'resting';
}

export interface RewardSummary {
  totalSparks: number;
  level: number;
  levelProgress: number;
  nextLevelAt: number;
}

export interface SupportiveInsight {
  id: string;
  title: string;
  body: string;
  kind: 'habit-size' | 'context' | 'focus' | 'return';
  habitId?: string;
}
