import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  buildDiagnosticsReport,
  clearDiagnostics,
  reportError,
  runSafely,
  shareDiagnostics
} from './diagnostics';

jest.mock('../data/database', () => ({
  getDatabaseSecurityStatus: jest.fn(async () => ({
    encrypted: true,
    integrity: 'ok',
    driver: 'sqlcipher'
  })),
  listDatabaseSafetyCopies: jest.fn(async () => [
    { uri: 'private-one', createdAt: '2026-07-16T00:00:00.000Z', size: 10 }
  ]),
  loadAppData: jest.fn(async () => {
    const { defaultSettings } = require('../data/models');
    return {
      habits: [{ id: 'secret habit' }],
      completions: [{ id: 'secret completion' }],
      focusSessions: [],
      captureItems: [],
      routines: [],
      dailyCheckIns: [],
      habitDeferrals: [],
      routineRuns: [],
      weeklyPlans: [],
      departurePlans: [],
      personalExperiments: [],
      completionTotals: { totalWins: 1, totalSparks: 1 },
      completionInsights: [],
      settings: defaultSettings,
      entitlement: { premium: false, source: 'free', expiresAt: null, updatedAt: '' }
    };
  })
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn()
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => true),
  isEnrolledAsync: jest.fn(async () => true)
}));

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(async () => undefined)
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined)
}));

describe('privacy-safe diagnostics', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
      granted: true
    });
  });

  it('redacts quoted content, paths, and content URIs before storage', async () => {
    await reportError(
      'capture.save',
      new Error(
        'Could not save “private thought” or ‘another secret’ from C:\\Users\\Me\\note.txt content://provider/private'
      )
    );
    const report = await buildDiagnosticsReport();
    expect(report.entries[0]?.message).toContain('“[redacted]”');
    expect(report.entries[0]?.message).toContain('‘[redacted]’');
    expect(report.entries[0]?.message).toContain('[local path]');
    expect(report.entries[0]?.message).toContain('[content URI]');
    expect(JSON.stringify(report)).not.toContain('private thought');
    expect(JSON.stringify(report)).not.toContain('another secret');
    expect(JSON.stringify(report)).not.toContain('note.txt');
  });

  it('ignores malformed stored entries and contains counts, not user content', async () => {
    await AsyncStorage.setItem('spark.diagnostics.v1', '{broken');
    const report = await buildDiagnosticsReport();
    expect(report.entries).toEqual([]);
    expect(report.counts.habits).toBe(1);
    expect(report.counts.completionsLoaded).toBe(1);
    expect(report.counts.databaseSafetyCopies).toBe(1);
    expect(report.permissions).toEqual({
      notifications: 'granted',
      localAuthenticationHardware: true,
      localAuthenticationEnrolled: true
    });
    expect(JSON.stringify(report)).not.toContain('secret habit');
    expect(report.contentExcluded).toContain('Capture text');
  });

  it('bounds the error ring and truncates unsafe context/message sizes', async () => {
    for (let index = 0; index < 105; index += 1) {
      await reportError(`context-${index}-${'x'.repeat(200)}`, 'm'.repeat(700));
    }
    const report = await buildDiagnosticsReport();
    expect(report.entries).toHaveLength(100);
    expect(report.entries[0]?.context).toContain('context-5');
    expect(report.entries.at(-1)?.context).toHaveLength(120);
    expect(report.entries.at(-1)?.message).toHaveLength(500);
  });

  it('records rejected safe tasks and gives callers the redacted message', async () => {
    const onError = jest.fn();
    runSafely(
      'test.task',
      async () => {
        throw new Error('"private value"');
      },
      onError
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(onError).toHaveBeenCalledWith('"[redacted]"');
    expect((await buildDiagnosticsReport()).entries).toHaveLength(1);
  });

  it('shares only a generated diagnostics JSON file and can clear the ring', async () => {
    await reportError('test', 'safe');
    await shareDiagnostics();
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^cache\/spark-diagnostics-\d+\.json$/),
      expect.stringContaining('"contentExcluded"'),
      { encoding: 'utf8' }
    );
    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      expect.stringContaining('spark-diagnostics-'),
      expect.objectContaining({ mimeType: 'application/json' })
    );
    await clearDiagnostics();
    expect((await buildDiagnosticsReport()).entries).toEqual([]);
  });

  it('does not fail report creation when biometric capability checks reject', async () => {
    (
      LocalAuthentication.hasHardwareAsync as jest.MockedFunction<
        typeof LocalAuthentication.hasHardwareAsync
      >
    ).mockRejectedValueOnce(new Error('not available'));
    (
      LocalAuthentication.isEnrolledAsync as jest.MockedFunction<
        typeof LocalAuthentication.isEnrolledAsync
      >
    ).mockRejectedValueOnce(new Error('not available'));
    const report = await buildDiagnosticsReport();
    expect(report.permissions.localAuthenticationHardware).toBe(false);
    expect(report.permissions.localAuthenticationEnrolled).toBe(false);
  });

  it('fails clearly when sharing is unavailable', async () => {
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    await expect(shareDiagnostics()).rejects.toThrow('Sharing is not available');
  });
});
