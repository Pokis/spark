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
  soundsEnabled: boolean;
  highContrast: boolean;
  supporterThemeEnabled: boolean;
  notificationsEnabled: boolean;
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

export interface AppSnapshot {
  schemaVersion: 1;
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
  soundsEnabled: true,
  highContrast: false,
  supporterThemeEnabled: false,
  notificationsEnabled: false,
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
