jest.mock('expo-crypto', () => ({
  getRandomBytes: (length: number) =>
    Uint8Array.from({ length }, (_, index) => (index * 13 + 7) % 256)
}));

jest.mock('../data/database', () => ({
  exportSnapshot: jest.fn(),
  importSnapshot: jest.fn()
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn()
}));

let mockCacheDirectory: string | null = 'cache://';
let mockDocumentDirectory: string | null = 'document://';

jest.mock('expo-file-system/legacy', () => ({
  get cacheDirectory() {
    return mockCacheDirectory;
  },
  get documentDirectory() {
    return mockDocumentDirectory;
  },
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
    readDirectoryAsync: jest.fn(),
    deleteAsync: jest.fn()
  }
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'when-unlocked-this-device-only',
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn()
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn()
}));

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { exportSnapshot, importSnapshot } from '../data/database';
import { defaultSettings, type AppSnapshot } from '../data/models';
import {
  chooseAutomaticBackupDirectory,
  clearRestoreSafetyCopies,
  listRestoreSafetyCopies,
  pickBackupForPreview,
  pickEncryptedBackupForPreview,
  restoreBackup,
  shareBackup,
  sharePortableCsv,
  writeAutomaticEncryptedBackup
} from './backup';

const snapshot: AppSnapshot = {
  schemaVersion: 4,
  exportedAt: '2026-07-16T12:00:00.000Z',
  habits: [
    {
      id: 'habit-1',
      title: '=SUM(1,2)',
      reason: 'A "quoted" reason',
      color: '#FF6B5F',
      icon: '✦',
      variants: [
        {
          id: 'tiny-1',
          kind: 'tiny',
          label: 'One minute',
          targetMinutes: 1,
          reward: 1
        }
      ],
      schedule: { type: 'daily' },
      reminderEnabled: false,
      priority: 1,
      contexts: ['anywhere'],
      createdAt: '2026-07-01T08:00:00.000Z',
      sortOrder: 0
    }
  ],
  completions: [
    {
      id: 'completion-1',
      habitId: 'habit-1',
      variantId: 'tiny-1',
      variantKind: 'tiny',
      reward: 1,
      occurredAt: '2026-07-16T08:01:00.000Z',
      loggedAt: '2026-07-16T08:01:00.000Z',
      localDate: '2026-07-16',
      source: 'today',
      context: 'anywhere',
      tags: ['made_it_tiny'],
      note: '@private'
    }
  ],
  focusSessions: [],
  captureItems: [],
  routines: [],
  dailyCheckIns: [],
  habitDeferrals: [],
  routineRuns: [],
  weeklyPlans: [],
  departurePlans: [],
  personalExperiments: [],
  settings: defaultSettings
};

const mockedExportSnapshot = jest.mocked(exportSnapshot);
const mockedImportSnapshot = jest.mocked(importSnapshot);
const mockedPicker = jest.mocked(DocumentPicker.getDocumentAsync);
const mockedSharingAvailable = jest.mocked(Sharing.isAvailableAsync);
const mockedShare = jest.mocked(Sharing.shareAsync);
const mockedWrite = jest.mocked(FileSystem.writeAsStringAsync);
const mockedRead = jest.mocked(FileSystem.readAsStringAsync);
const mockedReadDirectory = jest.mocked(FileSystem.readDirectoryAsync);
const mockedDelete = jest.mocked(FileSystem.deleteAsync);
const saf = FileSystem.StorageAccessFramework;

describe('backup file operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCacheDirectory = 'cache://';
    mockDocumentDirectory = 'document://';
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'android'
    });
    mockedExportSnapshot.mockResolvedValue(snapshot);
    mockedImportSnapshot.mockResolvedValue(undefined);
    mockedSharingAvailable.mockResolvedValue(true);
    mockedReadDirectory.mockResolvedValue([]);
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(
      'ABCD-EFGH-JKLM-NPQR'
    );
    jest.mocked(saf.requestDirectoryPermissionsAsync).mockResolvedValue({
      granted: true,
      directoryUri: 'content://backups'
    } as Awaited<
      ReturnType<typeof saf.requestDirectoryPermissionsAsync>
    >);
    jest.mocked(saf.createFileAsync).mockResolvedValue(
      'content://backups/spark-auto-new'
    );
    jest.mocked(saf.writeAsStringAsync).mockResolvedValue(undefined);
    jest.mocked(saf.readDirectoryAsync).mockResolvedValue([]);
    jest.mocked(saf.deleteAsync).mockResolvedValue(undefined);
  });

  it('lists restore safety copies newest first and clears only those copies', async () => {
    mockedReadDirectory.mockResolvedValue([
      'notes.txt',
      'spark-before-restore-2026-07-14.json',
      'spark-before-restore-2026-07-16.json'
    ]);

    await expect(listRestoreSafetyCopies()).resolves.toEqual([
      {
        name: 'spark-before-restore-2026-07-16.json',
        uri: 'document://spark-before-restore-2026-07-16.json'
      },
      {
        name: 'spark-before-restore-2026-07-14.json',
        uri: 'document://spark-before-restore-2026-07-14.json'
      }
    ]);

    await clearRestoreSafetyCopies();
    expect(mockedDelete).toHaveBeenCalledTimes(2);
    expect(mockedDelete).not.toHaveBeenCalledWith(
      'document://notes.txt',
      expect.anything()
    );
  });

  it('shares a JSON backup and a spreadsheet-safe portable CSV', async () => {
    await shareBackup();
    expect(mockedWrite).toHaveBeenCalledWith(
      expect.stringMatching(/^cache:\/\/spark-backup-.*\.json$/),
      expect.stringContaining('"schemaVersion": 4'),
      { encoding: 'utf8' }
    );
    expect(mockedShare).toHaveBeenCalledWith(
      expect.stringMatching(/spark-backup-.*\.json$/),
      expect.objectContaining({ mimeType: 'application/json' })
    );

    await sharePortableCsv();
    const csvCall = mockedWrite.mock.calls.find(([path]) =>
      String(path).endsWith('.csv')
    );
    expect(csvCall).toBeDefined();
    expect(csvCall?.[1]).toContain('"\'=SUM(1,2)"');
    expect(csvCall?.[1]).toContain('"A ""quoted"" reason"');
    expect(csvCall?.[1]).toContain('"\'@private"');
    expect(mockedShare).toHaveBeenLastCalledWith(
      expect.stringMatching(/spark-portable-history-.*\.csv$/),
      expect.objectContaining({ mimeType: 'text/csv' })
    );
  });

  it('fails safely when temporary storage or device sharing is unavailable', async () => {
    mockCacheDirectory = null;
    await expect(shareBackup()).rejects.toThrow('temporary folder');

    mockCacheDirectory = 'cache://';
    mockedSharingAvailable.mockResolvedValue(false);
    await expect(sharePortableCsv()).rejects.toThrow(
      'Sharing is not available'
    );
  });

  it('requires Android and explicit directory permission for automatic backups', async () => {
    await expect(chooseAutomaticBackupDirectory()).resolves.toBe(
      'content://backups'
    );

    jest.mocked(saf.requestDirectoryPermissionsAsync).mockResolvedValue({
      granted: false
    } as Awaited<ReturnType<typeof saf.requestDirectoryPermissionsAsync>>);
    await expect(chooseAutomaticBackupDirectory()).rejects.toThrow(
      'No backup folder'
    );

    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: 'ios'
    });
    await expect(chooseAutomaticBackupDirectory()).rejects.toThrow(
      'currently available on Android'
    );
  });

  it('writes an encrypted automatic backup and retains only the newest seven', async () => {
    jest.mocked(saf.readDirectoryAsync).mockResolvedValue(
      Array.from(
        { length: 9 },
        (_, index) => `content://backups/spark-auto-0${index + 1}`
      )
    );

    await expect(
      writeAutomaticEncryptedBackup('content://backups')
    ).resolves.toBe('content://backups/spark-auto-new');
    expect(saf.writeAsStringAsync).toHaveBeenCalledWith(
      'content://backups/spark-auto-new',
      expect.stringContaining('"format":"spark.encrypted-backup.v1"'),
      { encoding: 'utf8' }
    );
    expect(saf.deleteAsync).toHaveBeenCalledTimes(2);
    expect(saf.deleteAsync).toHaveBeenCalledWith(
      'content://backups/spark-auto-02',
      { idempotent: true }
    );
    expect(saf.deleteAsync).toHaveBeenCalledWith(
      'content://backups/spark-auto-01',
      { idempotent: true }
    );
  });

  it('previews a selected backup and enforces file-size limits before reading', async () => {
    mockedPicker.mockResolvedValueOnce({
      canceled: true,
      assets: null
    });
    await expect(pickBackupForPreview()).resolves.toBeNull();

    mockedPicker.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'cache://too-large.json',
          name: 'too-large.json',
          mimeType: 'application/json',
          size: 10 * 1024 * 1024 + 1,
          lastModified: 0
        }
      ]
    });
    await expect(pickBackupForPreview()).rejects.toThrow('10 MB safety limit');
    expect(mockedRead).not.toHaveBeenCalled();

    mockedPicker.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          uri: 'cache://spark.json',
          name: 'spark.json',
          mimeType: 'application/json',
          size: 100,
          lastModified: 0
        }
      ]
    });
    mockedRead.mockResolvedValue(JSON.stringify(snapshot));
    await expect(pickBackupForPreview()).resolves.toMatchObject({
      fileName: 'spark.json',
      counts: {
        habits: 1,
        completions: 1,
        focusSessions: 0,
        captureItems: 0,
        routines: 0
      }
    });
  });

  it('rejects oversized encrypted backups before attempting decryption', async () => {
    mockedPicker.mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: 'cache://too-large.sparkbackup',
          name: 'too-large.sparkbackup',
          mimeType: 'application/octet-stream',
          size: 20 * 1024 * 1024 + 1,
          lastModified: 0
        }
      ]
    });
    await expect(
      pickEncryptedBackupForPreview('correct horse battery staple')
    ).rejects.toThrow('larger than Spark’s safety limit');
    expect(mockedRead).not.toHaveBeenCalled();
  });

  it('creates a pre-restore safety copy, prunes older copies, and imports', async () => {
    mockedReadDirectory.mockResolvedValue([
      'spark-before-restore-04.json',
      'spark-before-restore-03.json',
      'spark-before-restore-02.json',
      'spark-before-restore-01.json'
    ]);

    const safetyCopy = await restoreBackup({
      snapshot,
      fileName: 'selected.json',
      counts: {
        habits: 1,
        completions: 1,
        focusSessions: 0,
        captureItems: 0,
        routines: 0
      }
    });

    expect(safetyCopy).toMatch(
      /^document:\/\/spark-before-restore-.*\.json$/
    );
    expect(mockedDelete).toHaveBeenCalledWith(
      'document://spark-before-restore-01.json',
      { idempotent: true }
    );
    expect(mockedImportSnapshot).toHaveBeenCalledWith(snapshot);
  });
});
