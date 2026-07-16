import type {
  CaptureItem,
  Completion,
  FocusSession,
  Habit,
  HabitVariant,
  Routine,
  RoutineStep
} from '@spark/domain';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import {
  defaultEntitlement,
  defaultSettings,
  type AppData,
  type AppSettings,
  type AppSnapshot,
  type DailyCheckIn,
  type Entitlement
} from './models';
import { starterHabits, starterRoutines } from './seed';

const DATABASE_NAME = 'spark.db';
const DATABASE_KEY_NAME = 'spark.database.key.v1';
let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

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
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
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
    pausedUntil: row.paused_until ? String(row.paused_until) : null,
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
      archived_at, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  const completions = await db.getAllAsync<{
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
  }>('SELECT * FROM completions ORDER BY occurred_at DESC');
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
    completions: completions.map((row) => ({
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
    })),
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

export async function insertCompletion(completion: Completion): Promise<void> {
  const db = await getDatabase();
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
}

export async function deleteCompletion(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM completions WHERE id = ?', id);
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
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    habits: data.habits,
    completions: data.completions,
    focusSessions: data.focusSessions,
    captureItems: data.captureItems,
    routines: data.routines,
    dailyCheckIns: data.dailyCheckIns,
    settings: data.settings
  };
}

export async function importSnapshot(snapshot: AppSnapshot): Promise<void> {
  if (snapshot.schemaVersion !== 1) throw new Error('This backup version is not supported.');
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM completions;
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
    for (const completion of snapshot.completions) await insertCompletion(completion);
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
