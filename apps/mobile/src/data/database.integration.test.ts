const mockDb = {
  execAsync: jest.fn(async (..._args: any[]) => undefined),
  getFirstAsync: jest.fn(async (..._args: any[]) => null as any),
  getAllAsync: jest.fn(async (..._args: any[]) => [] as any[]),
  runAsync: jest.fn(async (..._args: any[]) => ({
    changes: 1,
    lastInsertRowId: 0
  })),
  withTransactionAsync: jest.fn(
    async (task: () => Promise<void>, ..._args: any[]) => task()
  ),
  closeAsync: jest.fn(async (..._args: any[]) => undefined)
};

const mockSafetyDb = {
  execAsync: jest.fn(async (..._args: any[]) => undefined),
  closeAsync: jest.fn(async (..._args: any[]) => undefined)
};

const mockOpenDatabase = jest.fn();
const mockBackupDatabase = jest.fn(async () => undefined);
const mockDeleteDatabase = jest.fn(async () => undefined);
const mockReadDirectory = jest.fn(async (..._args: any[]) => [] as string[]);

jest.mock('expo-sqlite', () => ({
  defaultDatabaseDirectory: '/data/data/com.djpokis.sparkhabits.app/files/SQLite',
  openDatabaseAsync: (...args: unknown[]) => (mockOpenDatabase as any)(...args),
  backupDatabaseAsync: (...args: unknown[]) =>
    (mockBackupDatabase as any)(...args),
  deleteDatabaseAsync: (...args: unknown[]) =>
    (mockDeleteDatabase as any)(...args)
}));

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
  getItemAsync: jest.fn(async () => 'database-key'),
  setItemAsync: jest.fn(async () => undefined)
}));

jest.mock('expo-file-system/legacy', () => ({
  readDirectoryAsync: (...args: unknown[]) => (mockReadDirectory as any)(...args)
}));

jest.mock('expo-constants', () => ({
  appOwnership: 'standalone'
}));

function firstAnswers(input: {
  version: number;
  cipher?: string | null;
  seeded?: boolean;
  integrity?: string;
}) {
  mockDb.getFirstAsync.mockImplementation(async (sql: string) => {
    if (sql.includes('cipher_version')) {
      return input.cipher === null
        ? null
        : { cipher_version: input.cipher ?? '4.6.1' };
    }
    if (sql.includes("schema_version")) {
      return input.version ? { value: String(input.version) } : null;
    }
    if (sql.includes("key = 'seeded'")) {
      return input.seeded === false ? null : { value: '1' };
    }
    if (sql.includes('quick_check')) {
      return { quick_check: input.integrity ?? 'ok' };
    }
    return null;
  });
}

describe('native database migration and safety boundary', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockOpenDatabase.mockResolvedValue(mockDb);
    mockDb.getAllAsync.mockResolvedValue([]);
    firstAnswers({ version: 0 });
  });

  it('creates every released schema in order and verifies SQLCipher/integrity', async () => {
    const database = require('./database') as typeof import('./database');
    await expect(database.getDatabase()).resolves.toBe(mockDb);
    const schemaVersions = mockDb.runAsync.mock.calls
      .filter(([sql]) => String(sql).includes('schema_version'))
      .map((call) => call[1]);
    expect(schemaVersions).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    const executed = mockDb.execAsync.mock.calls
      .map(([sql]) => String(sql))
      .join('\n');
    expect(executed).toContain('CREATE TABLE IF NOT EXISTS habits');
    expect(executed).toContain('completion_daily_summaries');
    expect(executed).toContain('habit_deferrals');
    expect(executed).toContain('friction_json');
    expect(executed).toContain('weekly_plans');
    expect(executed).toContain('departure_plans');
    expect(executed).toContain('personal_experiments');
    expect(executed).toContain('momentum_json');
    await expect(database.getDatabaseSecurityStatus()).resolves.toMatchObject({
      encrypted: true,
      cipherVersion: '4.6.1',
      integrity: 'ok'
    });
  });

  it('backs up an existing database before applying an upgrade', async () => {
    firstAnswers({ version: 5 });
    mockOpenDatabase
      .mockResolvedValueOnce(mockDb)
      .mockResolvedValueOnce(mockSafetyDb);
    const database = require('./database') as typeof import('./database');
    await database.getDatabase();
    expect(mockBackupDatabase).toHaveBeenCalledWith({
      sourceDatabase: mockDb,
      destDatabase: mockSafetyDb
    });
    expect(mockSafetyDb.execAsync).toHaveBeenCalledWith(
      "PRAGMA key = 'database-key';"
    );
    expect(mockSafetyDb.closeAsync).toHaveBeenCalled();
    expect(mockReadDirectory).toHaveBeenCalledWith(
      'file:///data/data/com.djpokis.sparkhabits.app/files/SQLite'
    );
    expect(
      mockDb.execAsync.mock.calls.some(([sql]) =>
        String(sql).includes('weekly_plans')
      )
    ).toBe(true);
  });

  it('normalizes Android raw SQLite paths for Expo FileSystem safety-copy listing', async () => {
    mockReadDirectory.mockResolvedValueOnce([
      'spark-safety-v6-to-v7-2026-07-17T10-00-00.000Z.db',
      'spark.db'
    ]);
    const database = require('./database') as typeof import('./database');
    await expect(database.listDatabaseSafetyCopies()).resolves.toEqual([
      {
        name: 'spark-safety-v6-to-v7-2026-07-17T10-00-00.000Z.db',
        createdAt: '2026-07-17T10:00:00.000Z'
      }
    ]);
    expect(mockReadDirectory).toHaveBeenCalledWith(
      'file:///data/data/com.djpokis.sparkhabits.app/files/SQLite'
    );
  });

  it('refuses a native database when SQLCipher cannot be verified', async () => {
    firstAnswers({ version: 7, cipher: null });
    const database = require('./database') as typeof import('./database');
    await expect(database.getDatabase()).rejects.toThrow(
      'could not verify encrypted local storage'
    );
    expect(mockDb.closeAsync).toHaveBeenCalled();
  });

  it('reports a failed SQLite integrity result without hiding it', async () => {
    firstAnswers({ version: 7, integrity: 'database disk image is malformed' });
    const database = require('./database') as typeof import('./database');
    await expect(database.getDatabaseSecurityStatus()).resolves.toMatchObject({
      integrity: 'failed',
      integrityMessage: 'database disk image is malformed'
    });
  });

  it('persists optional Momentum configuration inside the encrypted habit row', async () => {
    firstAnswers({ version: 7 });
    const database = require('./database') as typeof import('./database');
    await database.upsertHabit({
      id: 'read',
      title: 'Read',
      color: '#8367E8',
      icon: '📚',
      variants: [
        { id: 'tiny', kind: 'tiny', label: 'One line', targetMinutes: 1, reward: 1 }
      ],
      schedule: { type: 'daily' },
      reminderEnabled: false,
      priority: 1,
      contexts: ['home'],
      createdAt: '2026-07-17T00:00:00.000Z',
      sortOrder: 0,
      momentum: {
        enabled: true,
        cadence: 'everyOtherDay',
        anchorDate: '2026-07-17',
        protections: [{ windowStart: '2026-07-19', kind: 'delay' }]
      }
    });
    const habitWrite = mockDb.runAsync.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT OR REPLACE INTO habits')
    );
    expect(habitWrite?.[0]).toContain('momentum_json');
    expect(habitWrite).toContain(
      JSON.stringify({
        enabled: true,
        cadence: 'everyOtherDay',
        anchorDate: '2026-07-17',
        protections: [{ windowStart: '2026-07-19', kind: 'delay' }]
      })
    );
  });

  it('loads compact lifetime completion dates for accurate Momentum history', async () => {
    firstAnswers({ version: 7 });
    mockDb.getAllAsync.mockResolvedValueOnce([
      { habit_id: 'read', local_date: '2026-07-15' },
      { habit_id: 'read', local_date: '2026-07-17' }
    ]);
    const database = require('./database') as typeof import('./database');
    await expect(database.loadHabitCompletionDates('read')).resolves.toEqual([
      { habitId: 'read', localDate: '2026-07-15' },
      { habitId: 'read', localDate: '2026-07-17' }
    ]);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('GROUP BY habit_id, local_date'),
      'read'
    );
  });
});
