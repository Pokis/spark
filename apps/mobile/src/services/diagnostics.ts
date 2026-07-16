import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  getDatabaseSecurityStatus,
  listDatabaseSafetyCopies,
  loadAppData
} from '../data/database';

const DIAGNOSTICS_KEY = 'spark.diagnostics.v1';
const MAX_ENTRIES = 100;

export interface DiagnosticEntry {
  at: string;
  context: string;
  message: string;
}

function errorMessage(reason: unknown): string {
  const message = reason instanceof Error ? reason.message : String(reason);
  return message
    .replace(/“[^”]{1,300}”/g, '“[redacted]”')
    .replace(/‘[^’]{1,300}’/g, '‘[redacted]’')
    .replace(/"[^"]{1,300}"/g, '"[redacted]"')
    .replace(/[A-Z]:\\[^\s]+/gi, '[local path]')
    .replace(/content:\/\/[^\s]+/gi, '[content URI]')
    .slice(0, 500);
}

function parsedEntries(raw: string | null): DiagnosticEntry[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (entry): entry is DiagnosticEntry =>
          Boolean(
            entry &&
              typeof entry === 'object' &&
              typeof (entry as DiagnosticEntry).at === 'string' &&
              typeof (entry as DiagnosticEntry).context === 'string' &&
              typeof (entry as DiagnosticEntry).message === 'string'
          )
      )
      .slice(-MAX_ENTRIES);
  } catch {
    return [];
  }
}

export async function reportError(context: string, reason: unknown): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DIAGNOSTICS_KEY);
    const current = parsedEntries(raw);
    const next = [
      ...current,
      {
        at: new Date().toISOString(),
        context: context.slice(0, 120),
        message: errorMessage(reason)
      }
    ].slice(-MAX_ENTRIES);
    await AsyncStorage.setItem(DIAGNOSTICS_KEY, JSON.stringify(next));
  } catch {
    // Diagnostics must never cause another user-visible failure.
  }
}

export function runSafely(
  context: string,
  task: () => Promise<unknown>,
  onError?: (message: string) => void
): void {
  void task().catch((reason: unknown) => {
    void reportError(context, reason);
    onError?.(errorMessage(reason));
  });
}

export async function clearDiagnostics(): Promise<void> {
  await AsyncStorage.removeItem(DIAGNOSTICS_KEY);
}

export interface DiagnosticsReport {
  generatedAt: string;
  appVersion: string;
  platform: string;
  platformVersion: string;
  executionEnvironment: string;
  storage: Awaited<ReturnType<typeof getDatabaseSecurityStatus>>;
  permissions: {
    notifications: string;
    localAuthenticationHardware: boolean;
    localAuthenticationEnrolled: boolean;
  };
  counts: {
    habits: number;
    completionsLoaded: number;
    focusSessions: number;
    captureItems: number;
    routines: number;
    weeklyPlans: number;
    departurePlans: number;
    personalExperiments: number;
    databaseSafetyCopies: number;
  };
  safeSettings: {
    language: string;
    simpleMode: boolean;
    reducedMotion: boolean;
    highContrast: boolean;
    notificationPrivacy: string;
    automaticBackupEnabled: boolean;
    appLockEnabled: boolean;
    hideSensitiveAppPreview: boolean;
    cloudSupportEnabled: boolean;
  };
  entries: DiagnosticEntry[];
  contentExcluded: string[];
}

export async function buildDiagnosticsReport(): Promise<DiagnosticsReport> {
  const raw = await AsyncStorage.getItem(DIAGNOSTICS_KEY);
  const entries = parsedEntries(raw).map((entry) => ({
        ...entry,
        message: errorMessage(entry.message)
      }));
  const [data, storage, notificationPermission, safetyCopies, authHardware, authEnrolled] =
    await Promise.all([
      loadAppData(),
      getDatabaseSecurityStatus(),
      Notifications.getPermissionsAsync(),
      listDatabaseSafetyCopies(),
      LocalAuthentication.hasHardwareAsync().catch(() => false),
      LocalAuthentication.isEnrolledAsync().catch(() => false)
    ]);
  return {
    generatedAt: new Date().toISOString(),
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    platform: Platform.OS,
    platformVersion: String(Platform.Version),
    executionEnvironment: String(Constants.executionEnvironment),
    storage,
    permissions: {
      notifications: notificationPermission.status,
      localAuthenticationHardware: authHardware,
      localAuthenticationEnrolled: authEnrolled
    },
    counts: {
      habits: data.habits.length,
      completionsLoaded: data.completions.length,
      focusSessions: data.focusSessions.length,
      captureItems: data.captureItems.length,
      routines: data.routines.length,
      weeklyPlans: data.weeklyPlans.length,
      departurePlans: data.departurePlans.length,
      personalExperiments: data.personalExperiments.length,
      databaseSafetyCopies: safetyCopies.length
    },
    safeSettings: {
      language: data.settings.language,
      simpleMode: data.settings.simpleMode,
      reducedMotion: data.settings.reducedMotion,
      highContrast: data.settings.highContrast,
      notificationPrivacy: data.settings.notificationPrivacy,
      automaticBackupEnabled: data.settings.automaticBackupEnabled,
      appLockEnabled: data.settings.appLockEnabled,
      hideSensitiveAppPreview: data.settings.hideSensitiveAppPreview,
      cloudSupportEnabled: data.settings.cloudSupportEnabled
    },
    entries,
    contentExcluded: [
      'habit titles, reasons, cues, and friction plans',
      'completion notes',
      'focus titles',
      'Capture text',
      'routine titles and steps',
      'weekly reflections',
      'departure titles',
      'experiment notes',
      'display name'
    ]
  };
}

export async function shareDiagnostics(): Promise<void> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('A temporary folder is not available.');
  const report = await buildDiagnosticsReport();
  const path = `${directory}spark-diagnostics-${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(report, null, 2), {
    encoding: FileSystem.EncodingType.UTF8
  });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'Share Spark diagnostics'
  });
}
