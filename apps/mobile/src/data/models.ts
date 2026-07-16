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
  language:
    | 'system'
    | 'en'
    | 'es'
    | 'pt-BR'
    | 'fr'
    | 'de'
    | 'it'
    | 'pl'
    | 'uk'
    | 'ru'
    | 'lt'
    | 'ja'
    | 'ko'
    | 'zh-Hans'
    | 'hi'
    | 'ar';
  simpleMode: boolean;
  progressiveHelpEnabled: boolean;
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  sensoryProfile: 'calm' | 'balanced' | 'celebratory';
  quietUntil: string | null;
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
  notificationPrivacy: 'full' | 'private' | 'secret';
  autoQuietReminders: boolean;
  notificationCap: number;
  reminderSnoozeMinutes: number;
  defaultFocusMinutes: number;
  soundscapeEnabled: boolean;
  soundscapeKind: 'brown' | 'pink' | 'soft';
  soundscapeVolume: number;
  appLockEnabled: boolean;
  appLockTimeoutMinutes: number;
  hideSensitiveAppPreview: boolean;
  automaticBackupEnabled: boolean;
  automaticBackupDirectoryUri: string | null;
  lastAutomaticBackupAt: string | null;
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

export interface WeeklyPlan {
  id: string;
  weekStart: string;
  selectedHabitIds: string[];
  reflection: string;
  tomorrowContext: HabitContext | null;
  tomorrowTinyHabitId: string | null;
  createdAt: string;
}

export interface DeparturePlan {
  id: string;
  title: string;
  targetAt: string;
  bufferMinutes: number;
  routineId: string | null;
  status: 'planned' | 'active' | 'complete' | 'cancelled';
  createdAt: string;
  completedAt: string | null;
}

export interface PersonalExperiment {
  id: string;
  kind: 'tiny_week' | 'afternoon_reminder';
  habitId: string;
  startedAt: string;
  endsAt: string;
  status: 'active' | 'complete' | 'stopped';
  baselineStart: string;
  baselineEnd: string;
  note: string;
}

export interface AppSnapshot {
  schemaVersion: 4;
  exportedAt: string;
  habits: Habit[];
  completions: Completion[];
  focusSessions: FocusSession[];
  captureItems: CaptureItem[];
  routines: Routine[];
  dailyCheckIns: DailyCheckIn[];
  habitDeferrals: HabitDeferral[];
  routineRuns: RoutineRunState[];
  weeklyPlans: WeeklyPlan[];
  departurePlans: DeparturePlan[];
  personalExperiments: PersonalExperiment[];
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
  weeklyPlans: WeeklyPlan[];
  departurePlans: DeparturePlan[];
  personalExperiments: PersonalExperiment[];
  settings: AppSettings;
  entitlement: Entitlement;
}

export const defaultSettings: AppSettings = {
  onboardingComplete: false,
  displayName: '',
  language: 'system',
  simpleMode: false,
  progressiveHelpEnabled: true,
  reducedMotion: false,
  hapticsEnabled: true,
  sensoryProfile: 'balanced',
  quietUntil: null,
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
  notificationPrivacy: 'private',
  autoQuietReminders: false,
  notificationCap: 4,
  reminderSnoozeMinutes: 15,
  defaultFocusMinutes: 10,
  soundscapeEnabled: false,
  soundscapeKind: 'brown',
  soundscapeVolume: 0.25,
  appLockEnabled: false,
  appLockTimeoutMinutes: 5,
  hideSensitiveAppPreview: false,
  automaticBackupEnabled: false,
  automaticBackupDirectoryUri: null,
  lastAutomaticBackupAt: null,
  cloudSupportEnabled: false
};

export const defaultEntitlement: Entitlement = {
  premium: false,
  source: 'none',
  expiresAt: null,
  checkedAt: null
};
