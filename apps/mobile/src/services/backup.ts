import type { AppSnapshot } from '../data/models';
import { defaultSettings } from '../data/models';
import { exportSnapshot, importSnapshot } from '../data/database';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { z } from 'zod';

const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const isoSchema = z.string().datetime({ offset: true });
const nullableIsoSchema = isoSchema.nullable().optional();

const variantSchema = z.object({
  id: z.string().min(1).max(160),
  kind: z.enum(['tiny', 'standard', 'stretch']),
  label: z.string().min(1).max(200),
  targetMinutes: z.number().int().min(1).max(1440),
  reward: z.number().int().min(0).max(100)
});

const scheduleSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('daily') }),
  z.object({
    type: z.literal('weekdays'),
    days: z.array(z.number().int().min(0).max(6)).min(1).max(7)
  }),
  z.object({
    type: z.literal('timesPerWeek'),
    count: z.number().int().min(1).max(7)
  }),
  z.object({
    type: z.literal('interval'),
    everyDays: z.number().int().min(1).max(365),
    anchorDate: dateKeySchema
  }),
  z.object({ type: z.literal('anytime') })
]);

const pauseIntervalSchema = z.object({
  startedOn: dateKeySchema,
  endedOn: dateKeySchema
});

const habitSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().min(1).max(200),
  reason: z.string().max(1000).optional(),
  cue: z.string().max(1000).optional(),
  color: z.string().min(1).max(40),
  icon: z.string().min(1).max(20),
  variants: z.array(variantSchema).min(1).max(10),
  schedule: scheduleSchema,
  preferredTime: z.string().max(5).optional(),
  reminderEnabled: z.boolean(),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  contexts: z
    .array(z.enum(['anywhere', 'home', 'work', 'outside', 'phone']))
    .min(1)
    .max(5),
  createdAt: isoSchema,
  pausedAt: dateKeySchema.nullable().optional(),
  pausedUntil: dateKeySchema.nullable().optional(),
  pauseHistory: z.array(pauseIntervalSchema).max(500).optional(),
  archivedAt: nullableIsoSchema,
  sortOrder: z.number().int()
});

const completionSchema = z.object({
  id: z.string().min(1).max(160),
  habitId: z.string().min(1).max(160),
  variantId: z.string().min(1).max(160),
  variantKind: z.enum(['tiny', 'standard', 'stretch']),
  reward: z.number().int().min(0).max(100),
  occurredAt: isoSchema,
  loggedAt: isoSchema,
  localDate: dateKeySchema,
  source: z.enum(['today', 'widget', 'notification', 'history', 'routine']),
  note: z.string().max(2000).optional()
});

const focusSessionSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().min(1).max(200),
  plannedSeconds: z.number().int().min(1).max(86_400),
  startedAt: isoSchema,
  endedAt: nullableIsoSchema,
  pausedAt: nullableIsoSchema,
  pausedSeconds: z.number().int().min(0).max(86_400),
  completed: z.boolean(),
  interruptionCount: z.number().int().min(0).max(100_000)
});

const captureItemSchema = z.object({
  id: z.string().min(1).max(160),
  text: z.string().min(1).max(4000),
  createdAt: isoSchema,
  resolvedAt: nullableIsoSchema,
  convertedHabitId: z.string().max(160).nullable().optional()
});

const routineSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().min(1).max(200),
  icon: z.string().min(1).max(20),
  color: z.string().min(1).max(40),
  steps: z
    .array(
      z.object({
        id: z.string().min(1).max(160),
        title: z.string().min(1).max(300),
        tinyTitle: z.string().max(300).optional(),
        estimateMinutes: z.number().int().min(1).max(1440),
        sortOrder: z.number().int()
      })
    )
    .max(500),
  createdAt: isoSchema,
  archivedAt: nullableIsoSchema
});

const checkInSchema = z.object({
  localDate: dateKeySchema,
  capacity: z.enum(['empty', 'steady', 'ready']),
  availableMinutes: z.number().int().min(0).max(1440).nullable(),
  mood: z.number().min(0).max(10).nullable()
});

const currentSettingsSchema = z.object({
  onboardingComplete: z.boolean(),
  displayName: z.string().max(80),
  reducedMotion: z.boolean(),
  hapticsEnabled: z.boolean(),
  sensoryProfile: z.enum(['calm', 'balanced', 'celebratory']),
  highContrast: z.boolean(),
  minimumViableDay: z.boolean(),
  launchCountdownEnabled: z.boolean().default(defaultSettings.launchCountdownEnabled),
  transitionNudgesEnabled: z
    .boolean()
    .default(defaultSettings.transitionNudgesEnabled),
  showRewards: z.boolean(),
  showRhythmPercentages: z.boolean(),
  supporterThemeEnabled: z.boolean(),
  notificationsEnabled: z.boolean(),
  autoQuietReminders: z.boolean().default(defaultSettings.autoQuietReminders),
  notificationCap: z.number().int().min(0).max(8),
  defaultFocusMinutes: z.number().int().min(1).max(180),
  cloudSupportEnabled: z.boolean()
});

const legacySettingsSchema = currentSettingsSchema
  .omit({
    sensoryProfile: true,
    minimumViableDay: true,
    showRewards: true,
    showRhythmPercentages: true
  })
  .extend({ soundsEnabled: z.boolean().optional() });

const snapshotBody = {
  exportedAt: isoSchema,
  habits: z.array(habitSchema).max(10_000),
  completions: z.array(completionSchema).max(250_000),
  focusSessions: z.array(focusSessionSchema).max(100_000),
  captureItems: z.array(captureItemSchema).max(100_000),
  routines: z.array(routineSchema).max(10_000),
  dailyCheckIns: z.array(checkInSchema).max(100_000)
};

const currentSnapshotSchema = z.object({
  schemaVersion: z.literal(2),
  ...snapshotBody,
  settings: currentSettingsSchema
});

const legacySnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  ...snapshotBody,
  settings: legacySettingsSchema
});

export interface BackupPreview {
  snapshot: AppSnapshot;
  fileName: string;
  counts: {
    habits: number;
    completions: number;
    focusSessions: number;
    captureItems: number;
    routines: number;
  };
}

function assertUniqueIds(label: string, values: { id: string }[]): void {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) throw new Error(`The backup contains a duplicate ${label} ID.`);
    ids.add(value.id);
  }
}

function validateReferences(snapshot: AppSnapshot): void {
  assertUniqueIds('habit', snapshot.habits);
  assertUniqueIds('completion', snapshot.completions);
  assertUniqueIds('focus session', snapshot.focusSessions);
  assertUniqueIds('capture item', snapshot.captureItems);
  assertUniqueIds('routine', snapshot.routines);

  const habitIds = new Set(snapshot.habits.map((habit) => habit.id));
  const variantIds = new Set<string>();
  const variantOwners = new Map<string, { habitId: string; kind: string }>();
  for (const habit of snapshot.habits) {
    if (
      habit.pausedAt &&
      habit.pausedUntil &&
      habit.pausedAt > habit.pausedUntil
    ) {
      throw new Error(`The pause dates for “${habit.title}” are reversed.`);
    }
    for (const interval of habit.pauseHistory ?? []) {
      if (interval.startedOn > interval.endedOn) {
        throw new Error(`A saved pause interval for “${habit.title}” is reversed.`);
      }
    }
    for (const variant of habit.variants) {
      if (variantIds.has(variant.id)) {
        throw new Error('The backup contains a duplicate habit-variant ID.');
      }
      variantIds.add(variant.id);
      variantOwners.set(variant.id, { habitId: habit.id, kind: variant.kind });
    }
  }
  for (const completion of snapshot.completions) {
    if (!habitIds.has(completion.habitId)) {
      throw new Error('A completion refers to a habit that is missing from the backup.');
    }
    const variant = variantOwners.get(completion.variantId);
    if (
      !variant ||
      variant.habitId !== completion.habitId ||
      variant.kind !== completion.variantKind
    ) {
      throw new Error(
        'A completion refers to a habit version that is missing or belongs to another habit.'
      );
    }
  }
}

export function parseBackupText(raw: string): AppSnapshot {
  if (raw.length > MAX_BACKUP_BYTES) {
    throw new Error('That backup is larger than Spark’s 10 MB safety limit.');
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }

  const version =
    value && typeof value === 'object' && 'schemaVersion' in value
      ? (value as { schemaVersion?: unknown }).schemaVersion
      : undefined;
  let snapshot: AppSnapshot;
  if (version === 2) {
    snapshot = currentSnapshotSchema.parse(value) as AppSnapshot;
  } else if (version === 1) {
    const legacy = legacySnapshotSchema.parse(value);
    const exportedDate = legacy.exportedAt.slice(0, 10);
    snapshot = {
      ...legacy,
      schemaVersion: 2,
      habits: legacy.habits.map((habit) => ({
        ...habit,
        pausedAt:
          habit.pausedUntil && habit.pausedUntil >= exportedDate ? exportedDate : null,
        pauseHistory: []
      })),
      settings: {
        ...defaultSettings,
        ...legacy.settings
      }
    };
  } else {
    throw new Error('This Spark backup version is not supported.');
  }
  validateReferences(snapshot);
  return snapshot;
}

async function writeSnapshot(
  snapshot: AppSnapshot,
  directory: string,
  prefix: string
): Promise<string> {
  const path = `${directory}${prefix}-${new Date().toISOString().replaceAll(':', '-')}.json`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(snapshot, null, 2), {
    encoding: FileSystem.EncodingType.UTF8
  });
  return path;
}

export async function shareBackup(): Promise<void> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('A temporary folder is not available.');
  const path = await writeSnapshot(await exportSnapshot(), directory, 'spark-backup');
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'Save your private Spark backup'
  });
}

function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function sharePortableCsv(): Promise<void> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('A temporary folder is not available.');
  const snapshot = await exportSnapshot();
  const habits = new Map(snapshot.habits.map((habit) => [habit.id, habit]));
  const header = [
    'record_type',
    'habit_id',
    'habit_title',
    'schedule',
    'variant',
    'local_date',
    'occurred_at',
    'reward',
    'note'
  ];
  const rows: unknown[][] = [
    header,
    ...snapshot.habits.map((habit) => [
      'habit',
      habit.id,
      habit.title,
      JSON.stringify(habit.schedule),
      '',
      '',
      habit.createdAt,
      '',
      habit.reason ?? ''
    ]),
    ...snapshot.completions.map((completion) => [
      'completion',
      completion.habitId,
      habits.get(completion.habitId)?.title ?? '',
      '',
      completion.variantKind,
      completion.localDate,
      completion.occurredAt,
      completion.reward,
      completion.note ?? ''
    ])
  ];
  const path = `${directory}spark-portable-history-${new Date()
    .toISOString()
    .replaceAll(':', '-')}.csv`;
  await FileSystem.writeAsStringAsync(
    path,
    rows.map((row) => row.map(csvCell).join(',')).join('\r\n'),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(path, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Spark data as portable CSV'
  });
}

export async function pickBackupForPreview(): Promise<BackupPreview | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
    multiple: false
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error('Spark could not read the selected file.');
  if (asset.size != null && asset.size > MAX_BACKUP_BYTES) {
    throw new Error('That backup is larger than Spark’s 10 MB safety limit.');
  }
  const raw = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8
  });
  const snapshot = parseBackupText(raw);
  return {
    snapshot,
    fileName: asset.name,
    counts: {
      habits: snapshot.habits.length,
      completions: snapshot.completions.length,
      focusSessions: snapshot.focusSessions.length,
      captureItems: snapshot.captureItems.length,
      routines: snapshot.routines.length
    }
  };
}

export async function restoreBackup(preview: BackupPreview): Promise<string | null> {
  const directory = FileSystem.documentDirectory;
  const safetyCopy = directory
    ? await writeSnapshot(
        await exportSnapshot(),
        directory,
        'spark-before-restore'
      )
    : null;
  await importSnapshot(preview.snapshot);
  return safetyCopy;
}
