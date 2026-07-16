import type {
  Capacity,
  CaptureItem,
  Completion,
  FocusSession,
  Habit,
  Routine
} from '@spark/domain';

export interface DailyCheckIn {
  localDate: string;
  capacity: Capacity;
  availableMinutes: number | null;
  mood: number | null;
}

export interface AppSettings {
  onboardingComplete: boolean;
  displayName: string;
  reducedMotion: boolean;
  hapticsEnabled: boolean;
  sensoryProfile: 'calm' | 'balanced' | 'celebratory';
  highContrast: boolean;
  minimumViableDay: boolean;
  launchCountdownEnabled: boolean;
  transitionNudgesEnabled: boolean;
  showRewards: boolean;
  showRhythmPercentages: boolean;
  supporterThemeEnabled: boolean;
  notificationsEnabled: boolean;
  autoQuietReminders: boolean;
  notificationCap: number;
  defaultFocusMinutes: number;
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

export interface AppSnapshot {
  schemaVersion: 2;
  exportedAt: string;
  habits: Habit[];
  completions: Completion[];
  focusSessions: FocusSession[];
  captureItems: CaptureItem[];
  routines: Routine[];
  dailyCheckIns: DailyCheckIn[];
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
  launchCountdownEnabled: false,
  transitionNudgesEnabled: true,
  showRewards: true,
  showRhythmPercentages: true,
  supporterThemeEnabled: false,
  notificationsEnabled: false,
  autoQuietReminders: false,
  notificationCap: 4,
  defaultFocusMinutes: 10,
  cloudSupportEnabled: false
};

export const defaultEntitlement: Entitlement = {
  premium: false,
  source: 'none',
  expiresAt: null,
  checkedAt: null
};
