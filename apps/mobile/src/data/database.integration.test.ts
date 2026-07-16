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

jest.mock('expo-sqlite', () => ({
  defaultDatabaseDirectory: 'db/',
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
  readDirectoryAsync: jest.fn(async () => [])
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
    expect(schemaVersions).toEqual(['1', '2', '3', '4', '5', '6']);
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
    expect(
      mockDb.execAsync.mock.calls.some(([sql]) =>
        String(sql).includes('weekly_plans')
      )
    ).toBe(true);
  });

  it('refuses a native database when SQLCipher cannot be verified', async () => {
    firstAnswers({ version: 6, cipher: null });
    const database = require('./database') as typeof import('./database');
    await expect(database.getDatabase()).rejects.toThrow(
      'could not verify encrypted local storage'
    );
    expect(mockDb.closeAsync).toHaveBeenCalled();
  });

  it('reports a failed SQLite integrity result without hiding it', async () => {
    firstAnswers({ version: 6, integrity: 'database disk image is malformed' });
    const database = require('./database') as typeof import('./database');
    await expect(database.getDatabaseSecurityStatus()).resolves.toMatchObject({
      integrity: 'failed',
      integrityMessage: 'database disk image is malformed'
    });
  });
});
