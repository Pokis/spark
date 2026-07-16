import type {
  CaptureItem,
  Completion,
  FocusSession,
  Habit,
  HabitVariant,
  Routine,
  RoutineStep
} from '@spark/domain';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import {
  defaultEntitlement,
  defaultSettings,
  type AppData,
  type AppSettings,
  type AppSnapshot,
  type CompletionDailySummary,
  type CompletionTotals,
  type DailyCheckIn,
  type Entitlement
} from './models';
import { starterHabits, starterRoutines } from './seed';

const DATABASE_NAME = 'spark.db';
const DATABASE_KEY_NAME = 'spark.database.key.v1';
const CURRENT_DATABASE_SCHEMA_VERSION = 4;
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let databaseSecurity = {
  encrypted: false,
  cipherVersion: null as string | null,
  expoGoPreview: false
};

function escapeSqlString(value: string): string {
  return value.replaceAll("'", "''");
}

async function databaseKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DATABASE_KEY_NAME);
  if (existing) return existing;
  const bytes = Crypto.getRandomBytes(32);
  const value = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  await SecureStore.setItemAsync(DATABASE_KEY_NAME, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
  return value;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  const key = await databaseKey();
  await db.execAsync(`PRAGMA key = '${escapeSqlString(key)}';`);
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  const cipher = await db.getFirstAsync<Record<string, string>>('PRAGMA cipher_version;');
  const cipherVersion = cipher ? Object.values(cipher)[0] ?? null : null;
  const expoGoPreview = Constants.appOwnership === 'expo';
  databaseSecurity = {
    encrypted: Boolean(cipherVersion),
    cipherVersion,
    expoGoPreview
  };
  if (!cipherVersion && !expoGoPreview) {
    await db.closeAsync();
    throw new Error(
      'Spark could not verify encrypted local storage. Reinstall a native Spark build; do not enter private data until SQLCipher is available.'
    );
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  const versionRow = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'schema_version'"
  );
  let version = Number(versionRow?.value ?? 0);

  if (version < 1) {
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      reason TEXT,
      cue TEXT,
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      schedule_json TEXT NOT NULL,
      preferred_time TEXT,
      reminder_enabled INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 1,
      contexts_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      paused_until TEXT,
      archived_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS habit_variants (
      id TEXT PRIMARY KEY NOT NULL,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      target_minutes INTEGER NOT NULL,
      reward INTEGER NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS completions (
      id TEXT PRIMARY KEY NOT NULL,
      habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      variant_id TEXT NOT NULL,
      variant_kind TEXT NOT NULL,
      reward INTEGER NOT NULL,
      occurred_at TEXT NOT NULL,
      logged_at TEXT NOT NULL,
      local_date TEXT NOT NULL,
      source TEXT NOT NULL,
      note TEXT
    );
    CREATE INDEX IF NOT EXISTS completions_habit_date
      ON completions(habit_id, local_date);
    CREATE TABLE IF NOT EXISTS focus_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      planned_seconds INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      paused_at TEXT,
      paused_seconds INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      interruption_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS capture_items (
      id TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      resolved_at TEXT,
      converted_habit_id TEXT
    );
    CREATE TABLE IF NOT EXISTS routines (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      archived_at TEXT
    );
    CREATE TABLE IF NOT EXISTS routine_steps (
      id TEXT PRIMARY KEY NOT NULL,
      routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      tiny_title TEXT,
      estimate_minutes INTEGER NOT NULL,
      sort_order INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS daily_checkins (
      local_date TEXT PRIMARY KEY NOT NULL,
      capacity TEXT NOT NULL,
      available_minutes INTEGER,
      mood INTEGER
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS entitlement (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      premium INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'none',
      expires_at TEXT,
      checked_at TEXT
    );
    `);
    version = 1;
    await db.runAsync(
      "INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', ?)",
      String(version)
    );
  }

  if (version < 2) {
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(habits);');
    const names = new Set(columns.map((column) => column.name));
    if (!names.has('paused_at')) {
      await db.execAsync('ALTER TABLE habits ADD COLUMN paused_at TEXT;');
    }
    if (!names.has('pause_history_json')) {
      await db.execAsync(
        "ALTER TABLE habits ADD COLUMN pause_history_json TEXT NOT NULL DEFAULT '[]';"
      );
    }
    const today = new Date().toISOString().slice(0, 10);
    await db.runAsync(
      'UPDATE habits SET paused_at = ? WHERE paused_until IS NOT NULL AND paused_at IS NULL',
      today
    );
    version = 2;
    await db.runAsync(
      "INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', ?)",
      String(version)
    );
  }

  if (version < 3) {
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS completions_local_date
        ON completions(local_date DESC);
      CREATE INDEX IF NOT EXISTS focus_sessions_active
        ON focus_sessions(ended_at, started_at DESC);
    `);
    version = 3;
    await db.runAsync(
      "INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', ?)",
      String(version)
    );
  }

  if (version < 4) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS completion_daily_summaries (
        local_date TEXT PRIMARY KEY NOT NULL,
        wins INTEGER NOT NULL,
        sparks INTEGER NOT NULL,
        active_habits INTEGER NOT NULL
      );
      DELETE FROM completion_daily_summaries;
      INSERT INTO completion_daily_summaries(local_date, wins, sparks, active_habits)
      SELECT local_date, COUNT(*), COALESCE(SUM(reward), 0), COUNT(DISTINCT habit_id)
      FROM completions
      GROUP BY local_date;
    `);
    version = 4;
    await db.runAsync(
      "INSERT OR REPLACE INTO meta(key, value) VALUES ('schema_version', ?)",
      String(version)
    );
  }

  if (version !== CURRENT_DATABASE_SCHEMA_VERSION) {
    throw new Error(`Unsupported local database schema version ${version}.`);
  }

  const seeded = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM meta WHERE key = 'seeded'"
  );
  if (!seeded) {
    await db.withTransactionAsync(async () => {
      for (const habit of starterHabits) await saveHabit(db, habit);
      for (const routine of starterRoutines) await saveRoutine(db, routine);
      for (const [keyName, value] of Object.entries(defaultSettings)) {
        await db.runAsync(
          'INSERT OR REPLACE INTO settings(key, value_json) VALUES (?, ?)',
          keyName,
          JSON.stringify(value)
        );
      }
      await db.runAsync(
        "INSERT OR IGNORE INTO entitlement(id, premium, source) VALUES (1, 0, 'none')"
      );
      await db.runAsync("INSERT INTO meta(key, value) VALUES ('seeded', '1')");
    });
  }
  return db;
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= openAndMigrate();
  return databasePromise;
}

export async function getDatabaseSecurityStatus(): Promise<{
  encrypted: boolean;
  cipherVersion: string | null;
  expoGoPreview: boolean;
}> {
  await getDatabase();
  return databaseSecurity;
}

function mapHabit(
  row: Record<string, string | number | null>,
  variants: HabitVariant[]
): Habit {
  return {
    id: String(row.id),
    title: String(row.title),
    reason: row.reason ? String(row.reason) : undefined,
    cue: row.cue ? String(row.cue) : undefined,
    color: String(row.color),
    icon: String(row.icon),
    schedule: JSON.parse(String(row.schedule_json)) as Habit['schedule'],
    preferredTime: row.preferred_time ? String(row.preferred_time) : undefined,
    reminderEnabled: Boolean(row.reminder_enabled),
    priority: Number(row.priority) as 1 | 2 | 3,
    contexts: JSON.parse(String(row.contexts_json)) as Habit['contexts'],
    createdAt: String(row.created_at),
    pausedAt: row.paused_at ? String(row.paused_at) : null,
    pausedUntil: row.paused_until ? String(row.paused_until) : null,
    pauseHistory: row.pause_history_json
      ? (JSON.parse(String(row.pause_history_json)) as NonNullable<Habit['pauseHistory']>)
      : [],
    archivedAt: row.archived_at ? String(row.archived_at) : null,
    sortOrder: Number(row.sort_order),
    variants
  };
}

async function saveHabit(db: SQLite.SQLiteDatabase, habit: Habit): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO habits(
      id, title, reason, cue, color, icon, schedule_json, preferred_time,
      reminder_enabled, priority, contexts_json, created_at, paused_until,
      paused_at, pause_history_json, archived_at, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    habit.id,
    habit.title,
    habit.reason ?? null,
    habit.cue ?? null,
    habit.color,
    habit.icon,
    JSON.stringify(habit.schedule),
    habit.preferredTime ?? null,
    habit.reminderEnabled ? 1 : 0,
    habit.priority,
    JSON.stringify(habit.contexts),
    habit.createdAt,
    habit.pausedUntil ?? null,
    habit.pausedAt ?? null,
    JSON.stringify(habit.pauseHistory ?? []),
    habit.archivedAt ?? null,
    habit.sortOrder
  );
  await db.runAsync('DELETE FROM habit_variants WHERE habit_id = ?', habit.id);
  for (const [index, variant] of habit.variants.entries()) {
    await db.runAsync(
      `INSERT INTO habit_variants(
        id, habit_id, kind, label, target_minutes, reward, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      variant.id,
      habit.id,
      variant.kind,
      variant.label,
      variant.targetMinutes,
      variant.reward,
      index
    );
  }
}

async function saveRoutine(db: SQLite.SQLiteDatabase, routine: Routine): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO routines(
      id, title, icon, color, created_at, archived_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    routine.id,
    routine.title,
    routine.icon,
    routine.color,
    routine.createdAt,
    routine.archivedAt ?? null
  );
  await db.runAsync('DELETE FROM routine_steps WHERE routine_id = ?', routine.id);
  for (const step of routine.steps) {
    await db.runAsync(
      `INSERT INTO routine_steps(
        id, routine_id, title, tiny_title, estimate_minutes, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      step.id,
      routine.id,
      step.title,
      step.tinyTitle ?? null,
      step.estimateMinutes,
      step.sortOrder
    );
  }
}

interface CompletionRow {
  id: string;
  habit_id: string;
  variant_id: string;
  variant_kind: Completion['variantKind'];
  reward: number;
  occurred_at: string;
  logged_at: string;
  local_date: string;
  source: Completion['source'];
  note: string | null;
}

function mapCompletion(row: CompletionRow): Completion {
  return {
    id: row.id,
    habitId: row.habit_id,
    variantId: row.variant_id,
    variantKind: row.variant_kind,
    reward: row.reward,
    occurredAt: row.occurred_at,
    loggedAt: row.logged_at,
    localDate: row.local_date,
    source: row.source,
    note: row.note ?? undefined
  };
}

function recentCompletionCutoff(days = 400): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

export async function loadCompletionInsights(): Promise<{
  completionTotals: CompletionTotals;
  completionDailySummaries: CompletionDailySummary[];
}> {
  const db = await getDatabase();
  const totals = await db.getFirstAsync<{
    total_wins: number;
    total_sparks: number;
  }>(
    `SELECT COUNT(*) AS total_wins, COALESCE(SUM(reward), 0) AS total_sparks
     FROM completions`
  );
  const summaries = await db.getAllAsync<{
    local_date: string;
    wins: number;
    sparks: number;
    active_habits: number;
  }>(
    `SELECT * FROM completion_daily_summaries
     WHERE local_date >= ?
     ORDER BY local_date DESC`,
    recentCompletionCutoff()
  );
  return {
    completionTotals: {
      totalWins: Number(totals?.total_wins ?? 0),
      totalSparks: Number(totals?.total_sparks ?? 0)
    },
    completionDailySummaries: summaries.map((row) => ({
      localDate: row.local_date,
      wins: Number(row.wins),
      sparks: Number(row.sparks),
      activeHabits: Number(row.active_habits)
    }))
  };
}

async function loadAllCompletions(db: SQLite.SQLiteDatabase): Promise<Completion[]> {
  const rows = await db.getAllAsync<CompletionRow>(
    'SELECT * FROM completions ORDER BY occurred_at DESC'
  );
  return rows.map(mapCompletion);
}

export async function loadAppData(): Promise<AppData> {
  const db = await getDatabase();
  const habitRows = await db.getAllAsync<Record<string, string | number | null>>(
    'SELECT * FROM habits ORDER BY sort_order, created_at'
  );
  const variantRows = await db.getAllAsync<Record<string, string | number>>(
    'SELECT * FROM habit_variants ORDER BY sort_order'
  );
  const habits = habitRows.map((row) =>
    mapHabit(
      row,
      variantRows
        .filter((variant) => variant.habit_id === row.id)
        .map((variant) => ({
          id: String(variant.id),
          kind: String(variant.kind) as HabitVariant['kind'],
          label: String(variant.label),
          targetMinutes: Number(variant.target_minutes),
          reward: Number(variant.reward)
        }))
    )
  );
  // Keep recent history plus the two latest records per habit in memory.
  // Lifetime totals and charts come from compact materialized summaries.
  const completions = await db.getAllAsync<CompletionRow>(
    `WITH ranked AS (
       SELECT completions.*,
         ROW_NUMBER() OVER (
           PARTITION BY habit_id
           ORDER BY local_date DESC, occurred_at DESC
         ) AS habit_rank
       FROM completions
     )
     SELECT id, habit_id, variant_id, variant_kind, reward, occurred_at,
       logged_at, local_date, source, note
     FROM ranked
     WHERE local_date >= ? OR habit_rank <= 2
     ORDER BY occurred_at DESC`,
    recentCompletionCutoff()
  );
  const completionInsights = await loadCompletionInsights();
  const sessions = await db.getAllAsync<Record<string, string | number | null>>(
    'SELECT * FROM focus_sessions ORDER BY started_at DESC'
  );
  const captures = await db.getAllAsync<Record<string, string | null>>(
    'SELECT * FROM capture_items ORDER BY created_at DESC'
  );
  const routineRows = await db.getAllAsync<Record<string, string | null>>(
    'SELECT * FROM routines ORDER BY created_at'
  );
  const stepRows = await db.getAllAsync<Record<string, string | number | null>>(
    'SELECT * FROM routine_steps ORDER BY sort_order'
  );
  const checkIns = await db.getAllAsync<{
    local_date: string;
    capacity: DailyCheckIn['capacity'];
    available_minutes: number | null;
    mood: number | null;
  }>('SELECT * FROM daily_checkins ORDER BY local_date DESC');
  const settingsRows = await db.getAllAsync<{ key: string; value_json: string }>(
    'SELECT * FROM settings'
  );
  const settings = { ...defaultSettings } as Record<string, unknown>;
  for (const row of settingsRows) settings[row.key] = JSON.parse(row.value_json);
  const entitlementRow = await db.getFirstAsync<{
    premium: number;
    source: Entitlement['source'];
    expires_at: string | null;
    checked_at: string | null;
  }>('SELECT * FROM entitlement WHERE id = 1');

  return {
    habits,
    completions: completions.map(mapCompletion),
    ...completionInsights,
    focusSessions: sessions.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      plannedSeconds: Number(row.planned_seconds),
      startedAt: String(row.started_at),
      endedAt: row.ended_at ? String(row.ended_at) : null,
      pausedAt: row.paused_at ? String(row.paused_at) : null,
      pausedSeconds: Number(row.paused_seconds),
      completed: Boolean(row.completed),
      interruptionCount: Number(row.interruption_count)
    })),
    captureItems: captures.map((row) => ({
      id: String(row.id),
      text: String(row.text),
      createdAt: String(row.created_at),
      resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
      convertedHabitId: row.converted_habit_id ? String(row.converted_habit_id) : null
    })),
    routines: routineRows.map((row) => ({
      id: String(row.id),
      title: String(row.title),
      icon: String(row.icon),
      color: String(row.color),
      createdAt: String(row.created_at),
      archivedAt: row.archived_at ? String(row.archived_at) : null,
      steps: stepRows
        .filter((step) => step.routine_id === row.id)
        .map(
          (step): RoutineStep => ({
            id: String(step.id),
            title: String(step.title),
            tinyTitle: step.tiny_title ? String(step.tiny_title) : undefined,
            estimateMinutes: Number(step.estimate_minutes),
            sortOrder: Number(step.sort_order)
          })
        )
    })),
    dailyCheckIns: checkIns.map((row) => ({
      localDate: row.local_date,
      capacity: row.capacity,
      availableMinutes: row.available_minutes,
      mood: row.mood
    })),
    settings: settings as unknown as AppSettings,
    entitlement: entitlementRow
      ? {
          premium: Boolean(entitlementRow.premium),
          source: entitlementRow.source,
          expiresAt: entitlementRow.expires_at,
          checkedAt: entitlementRow.checked_at
        }
      : defaultEntitlement
  };
}

export async function upsertHabit(habit: Habit): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(() => saveHabit(db, habit));
}

export async function upsertRoutine(routine: Routine): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(() => saveRoutine(db, routine));
}

async function rebuildCompletionSummary(
  db: SQLite.SQLiteDatabase,
  localDate: string
): Promise<void> {
  await db.runAsync(
    'DELETE FROM completion_daily_summaries WHERE local_date = ?',
    localDate
  );
  await db.runAsync(
    `INSERT INTO completion_daily_summaries(local_date, wins, sparks, active_habits)
     SELECT local_date, COUNT(*), COALESCE(SUM(reward), 0), COUNT(DISTINCT habit_id)
     FROM completions
     WHERE local_date = ?
     GROUP BY local_date`,
    localDate
  );
}

async function saveCompletion(
  db: SQLite.SQLiteDatabase,
  completion: Completion,
  updateSummary = true
): Promise<void> {
  await db.runAsync(
    `INSERT INTO completions(
      id, habit_id, variant_id, variant_kind, reward, occurred_at, logged_at,
      local_date, source, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    completion.id,
    completion.habitId,
    completion.variantId,
    completion.variantKind,
    completion.reward,
    completion.occurredAt,
    completion.loggedAt,
    completion.localDate,
    completion.source,
    completion.note ?? null
  );
  if (updateSummary) await rebuildCompletionSummary(db, completion.localDate);
}

export async function insertCompletion(completion: Completion): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(() => saveCompletion(db, completion));
}

export async function deleteCompletion(id: string): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    const existing = await db.getFirstAsync<{ local_date: string }>(
      'SELECT local_date FROM completions WHERE id = ?',
      id
    );
    await db.runAsync('DELETE FROM completions WHERE id = ?', id);
    if (existing) await rebuildCompletionSummary(db, existing.local_date);
  });
}

export async function insertFocusSession(session: FocusSession): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO focus_sessions(
      id, title, planned_seconds, started_at, ended_at, paused_at,
      paused_seconds, completed, interruption_count
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    session.id,
    session.title,
    session.plannedSeconds,
    session.startedAt,
    session.endedAt ?? null,
    session.pausedAt ?? null,
    session.pausedSeconds,
    session.completed ? 1 : 0,
    session.interruptionCount
  );
}

export async function insertCaptureItem(item: CaptureItem): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO capture_items(
      id, text, created_at, resolved_at, converted_habit_id
    ) VALUES (?, ?, ?, ?, ?)`,
    item.id,
    item.text,
    item.createdAt,
    item.resolvedAt ?? null,
    item.convertedHabitId ?? null
  );
}

export async function saveCheckIn(checkIn: DailyCheckIn): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO daily_checkins(
      local_date, capacity, available_minutes, mood
    ) VALUES (?, ?, ?, ?)`,
    checkIn.localDate,
    checkIn.capacity,
    checkIn.availableMinutes,
    checkIn.mood
  );
}

export async function saveSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings(key, value_json) VALUES (?, ?)',
    key,
    JSON.stringify(value)
  );
}

export async function saveEntitlement(entitlement: Entitlement): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO entitlement(
      id, premium, source, expires_at, checked_at
    ) VALUES (1, ?, ?, ?, ?)`,
    entitlement.premium ? 1 : 0,
    entitlement.source,
    entitlement.expiresAt,
    entitlement.checkedAt
  );
}

export async function exportSnapshot(): Promise<AppSnapshot> {
  const data = await loadAppData();
  const db = await getDatabase();
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    habits: data.habits,
    completions: await loadAllCompletions(db),
    focusSessions: data.focusSessions,
    captureItems: data.captureItems,
    routines: data.routines,
    dailyCheckIns: data.dailyCheckIns,
    settings: data.settings
  };
}

export async function importSnapshot(snapshot: AppSnapshot): Promise<void> {
  if (snapshot.schemaVersion !== 2) throw new Error('This backup version is not supported.');
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM completions;
      DELETE FROM completion_daily_summaries;
      DELETE FROM habit_variants;
      DELETE FROM habits;
      DELETE FROM focus_sessions;
      DELETE FROM capture_items;
      DELETE FROM routine_steps;
      DELETE FROM routines;
      DELETE FROM daily_checkins;
      DELETE FROM settings;
    `);
    for (const habit of snapshot.habits) await saveHabit(db, habit);
    for (const completion of snapshot.completions) {
      await saveCompletion(db, completion, false);
    }
    await db.execAsync(`
      INSERT INTO completion_daily_summaries(local_date, wins, sparks, active_habits)
      SELECT local_date, COUNT(*), COALESCE(SUM(reward), 0), COUNT(DISTINCT habit_id)
      FROM completions
      GROUP BY local_date;
    `);
    for (const session of snapshot.focusSessions) await insertFocusSession(session);
    for (const item of snapshot.captureItems) await insertCaptureItem(item);
    for (const routine of snapshot.routines) await saveRoutine(db, routine);
    for (const checkIn of snapshot.dailyCheckIns) await saveCheckIn(checkIn);
    for (const [keyName, value] of Object.entries(snapshot.settings)) {
      await db.runAsync(
        'INSERT INTO settings(key, value_json) VALUES (?, ?)',
        keyName,
        JSON.stringify(value)
      );
    }
  });
}
