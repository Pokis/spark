import type {
  Capacity,
  CaptureItem,
  Completion,
  FocusSession,
  Habit,
  HabitContext,
  Routine
} from '@spark/domain';

export interface DailyCheckIn {
  localDate: string;
  capacity: Capacity;
  availableMinutes: number | null;
  mood: number | null;
  context?: HabitContext | null;
}

export interface AppSettings {
  onboardingComplete: boolean;
  displayName: string;
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  sensoryProfile: 'calm' | 'balanced' | 'celebratory';
  highContrast: boolean;
  minimumViableDay: boolean;
  rememberContextByTime: boolean;
  contextByPeriod: {
    morning: HabitContext | null;
    afternoon: HabitContext | null;
    evening: HabitContext | null;
  };
  launchCountdownEnabled: boolean;
  transitionNudgesEnabled: boolean;
  showRewards: boolean;
  showRhythmPercentages: boolean;
  insightsEnabled: boolean;
  hiddenInsightIds: string[];
  supporterThemeEnabled: boolean;
  supporterTheme: 'aurora' | 'ocean' | 'forest';
  supporterBadgeVisible: boolean;
  companionStyle: 'spark' | 'owl' | 'cloud';
  celebrationStyle: 'burst' | 'ripple' | 'confetti';
  appIconStyle: 'classic' | 'calm' | 'midnight';
  notificationsEnabled: boolean;
  autoQuietReminders: boolean;
  notificationCap: number;
  reminderSnoozeMinutes: number;
  defaultFocusMinutes: number;
  soundscapeEnabled: boolean;
  soundscapeKind: 'brown' | 'pink' | 'soft';
  soundscapeVolume: number;
  cloudSupportEnabled: boolean;
}

export interface Entitlement {
  premium: boolean;
  source: 'none' | 'play' | 'app-store' | 'promo' | 'admin';
  expiresAt: string | null;
  checkedAt: string | null;
}

export interface CompletionTotals {
  totalWins: number;
  totalSparks: number;
}

export interface CompletionDailySummary {
  localDate: string;
  wins: number;
  sparks: number;
  activeHabits: number;
}

export interface HabitDeferral {
  habitId: string;
  until: string;
  kind: 'not_now' | 'later_today' | 'tomorrow' | 'quiet_today';
}

export interface RoutineRunState {
  routineId: string;
  stepIndex: number;
  tiny: boolean;
  paused: boolean;
  skippedStepIds: string[];
  startedAt: string;
  updatedAt: string;
}

export interface AppSnapshot {
  schemaVersion: 3;
  exportedAt: string;
  habits: Habit[];
  completions: Completion[];
  focusSessions: FocusSession[];
  captureItems: CaptureItem[];
  routines: Routine[];
  dailyCheckIns: DailyCheckIn[];
  habitDeferrals: HabitDeferral[];
  routineRuns: RoutineRunState[];
  settings: AppSettings;
}

export interface AppData {
  habits: Habit[];
  completions: Completion[];
  completionTotals: CompletionTotals;
  completionDailySummaries: CompletionDailySummary[];
  focusSessions: FocusSession[];
  captureItems: CaptureItem[];
  routines: Routine[];
  dailyCheckIns: DailyCheckIn[];
  habitDeferrals: HabitDeferral[];
  routineRuns: RoutineRunState[];
  settings: AppSettings;
  entitlement: Entitlement;
}

export const defaultSettings: AppSettings = {
  onboardingComplete: false,
  displayName: '',
  reducedMotion: false,
  hapticsEnabled: true,
  sensoryProfile: 'balanced',
  highContrast: false,
  minimumViableDay: false,
  rememberContextByTime: true,
  contextByPeriod: {
    morning: null,
    afternoon: null,
    evening: null
  },
  launchCountdownEnabled: false,
  transitionNudgesEnabled: true,
  showRewards: true,
  showRhythmPercentages: true,
  insightsEnabled: true,
  hiddenInsightIds: [],
  supporterThemeEnabled: false,
  supporterTheme: 'aurora',
  supporterBadgeVisible: true,
  companionStyle: 'spark',
  celebrationStyle: 'burst',
  appIconStyle: 'classic',
  notificationsEnabled: false,
  autoQuietReminders: false,
  notificationCap: 4,
  reminderSnoozeMinutes: 15,
  defaultFocusMinutes: 10,
  soundscapeEnabled: false,
  soundscapeKind: 'brown',
  soundscapeVolume: 0.25,
  cloudSupportEnabled: false
};

export const defaultEntitlement: Entitlement = {
  premium: false,
  source: 'none',
  expiresAt: null,
  checkedAt: null
};
