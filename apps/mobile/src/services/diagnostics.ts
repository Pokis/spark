import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const DIAGNOSTICS_KEY = 'spark.diagnostics.v1';
const MAX_ENTRIES = 100;

export interface DiagnosticEntry {
  at: string;
  context: string;
  message: string;
}

function errorMessage(reason: unknown): string {
  if (reason instanceof Error) return reason.message.slice(0, 500);
  return String(reason).slice(0, 500);
}

export async function reportError(context: string, reason: unknown): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DIAGNOSTICS_KEY);
    const current = raw ? (JSON.parse(raw) as DiagnosticEntry[]) : [];
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

export async function shareDiagnostics(): Promise<void> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('A temporary folder is not available.');
  const raw = await AsyncStorage.getItem(DIAGNOSTICS_KEY);
  const entries = raw ? (JSON.parse(raw) as DiagnosticEntry[]) : [];
  const report = {
    generatedAt: new Date().toISOString(),
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    platform: Platform.OS,
    platformVersion: String(Platform.Version),
    executionEnvironment: Constants.executionEnvironment,
    entries
  };
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
