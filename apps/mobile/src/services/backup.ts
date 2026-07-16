import type { AppSnapshot } from '../data/models';
import { defaultSettings } from '../data/models';
import { exportSnapshot, importSnapshot } from '../data/database';
import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToUtf8, utf8ToBytes } from '@noble/hashes/utils';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { z } from 'zod';

const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const MAX_RESTORE_SAFETY_COPIES = 3;
const MAX_AUTOMATIC_BACKUPS = 7;
const RECOVERY_CODE_KEY = 'spark.backup.recovery-code.v1';
const ENCRYPTION_ITERATIONS = 150_000;
const ENCRYPTED_BACKUP_FORMAT = 'spark.encrypted-backup.v1';

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
  friction: z
    .object({
      environment: z.string().max(1000).optional(),
      materials: z.string().max(1000).optional(),
      firstStep: z.string().max(1000).optional(),
      obstacle: z.string().max(1000).optional(),
      fallback: z.string().max(1000).optional(),
      futureNote: z.string().max(1000).optional()
    })
    .optional(),
  color: z.string().min(1).max(40),
  icon: z.string().min(1).max(20),
  variants: z.array(variantSchema).min(1).max(10),
  schedule: scheduleSchema,
  preferredTime: z.string().max(5).optional(),
  reminderWindow: z
    .enum(['exact', 'morning', 'afternoon', 'evening'])
    .default('exact'),
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
  context: z
    .enum(['anywhere', 'home', 'work', 'outside', 'phone'])
    .optional(),
  tags: z
    .array(z.enum(['timer_helped', 'made_it_tiny', 'body_double', 'good_cue']))
    .max(4)
    .default([]),
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
        sortOrder: z.number().int(),
        linkedHabitId: z.string().max(160).optional(),
        focusMinutes: z.number().int().min(1).max(180).optional()
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
  mood: z.number().min(0).max(10).nullable(),
  context: z
    .enum(['anywhere', 'home', 'work', 'outside', 'phone'])
    .nullable()
    .optional()
});

const currentSettingsSchema = z.object({
  onboardingComplete: z.boolean(),
  displayName: z.string().max(80),
  language: z
    .enum([
      'system',
      'en',
      'es',
      'pt-BR',
      'fr',
      'de',
      'it',
      'pl',
      'uk',
      'ru',
      'lt',
      'ja',
      'ko',
      'zh-Hans',
      'hi',
      'ar'
    ])
    .default(defaultSettings.language),
  simpleMode: z.boolean().default(defaultSettings.simpleMode),
  progressiveHelpEnabled: z.boolean().default(defaultSettings.progressiveHelpEnabled),
  reducedMotion: z.boolean(),
  hapticsEnabled: z.boolean(),
  sensoryProfile: z.enum(['calm', 'balanced', 'celebratory']),
  quietUntil: isoSchema.nullable().default(defaultSettings.quietUntil),
  highContrast: z.boolean(),
  minimumViableDay: z.boolean(),
  rememberContextByTime: z.boolean().default(defaultSettings.rememberContextByTime),
  contextByPeriod: z
    .object({
      morning: z.enum(['anywhere', 'home', 'work', 'outside', 'phone']).nullable(),
      afternoon: z.enum(['anywhere', 'home', 'work', 'outside', 'phone']).nullable(),
      evening: z.enum(['anywhere', 'home', 'work', 'outside', 'phone']).nullable()
    })
    .default(defaultSettings.contextByPeriod),
  launchCountdownEnabled: z.boolean().default(defaultSettings.launchCountdownEnabled),
  transitionNudgesEnabled: z
    .boolean()
    .default(defaultSettings.transitionNudgesEnabled),
  showRewards: z.boolean(),
  showRhythmPercentages: z.boolean(),
  insightsEnabled: z.boolean().default(defaultSettings.insightsEnabled),
  hiddenInsightIds: z.array(z.string().max(240)).max(100).default([]),
  supporterThemeEnabled: z.boolean(),
  supporterTheme: z
    .enum(['aurora', 'ocean', 'forest'])
    .default(defaultSettings.supporterTheme),
  supporterBadgeVisible: z.boolean().default(defaultSettings.supporterBadgeVisible),
  companionStyle: z
    .enum(['spark', 'owl', 'cloud'])
    .default(defaultSettings.companionStyle),
  celebrationStyle: z
    .enum(['burst', 'ripple', 'confetti'])
    .default(defaultSettings.celebrationStyle),
  appIconStyle: z
    .enum(['classic', 'calm', 'midnight'])
    .default(defaultSettings.appIconStyle),
  notificationsEnabled: z.boolean(),
  notificationPrivacy: z
    .enum(['full', 'private', 'secret'])
    .default(defaultSettings.notificationPrivacy),
  autoQuietReminders: z.boolean().default(defaultSettings.autoQuietReminders),
  notificationCap: z.number().int().min(0).max(8),
  reminderSnoozeMinutes: z
    .number()
    .int()
    .min(5)
    .max(180)
    .default(defaultSettings.reminderSnoozeMinutes),
  defaultFocusMinutes: z.number().int().min(1).max(180),
  soundscapeEnabled: z.boolean().default(defaultSettings.soundscapeEnabled),
  soundscapeKind: z
    .enum(['brown', 'pink', 'soft'])
    .default(defaultSettings.soundscapeKind),
  soundscapeVolume: z.number().min(0).max(1).default(defaultSettings.soundscapeVolume),
  appLockEnabled: z.boolean().default(defaultSettings.appLockEnabled),
  appLockTimeoutMinutes: z
    .number()
    .int()
    .min(0)
    .max(1440)
    .default(defaultSettings.appLockTimeoutMinutes),
  hideSensitiveAppPreview: z
    .boolean()
    .default(defaultSettings.hideSensitiveAppPreview),
  automaticBackupEnabled: z
    .boolean()
    .default(defaultSettings.automaticBackupEnabled),
  automaticBackupDirectoryUri: z
    .string()
    .max(4000)
    .nullable()
    .default(defaultSettings.automaticBackupDirectoryUri),
  lastAutomaticBackupAt: isoSchema
    .nullable()
    .default(defaultSettings.lastAutomaticBackupAt),
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

const deferralSchema = z.object({
  habitId: z.string().min(1).max(160),
  until: isoSchema,
  kind: z.enum(['not_now', 'later_today', 'tomorrow', 'quiet_today'])
});

const routineRunSchema = z.object({
  routineId: z.string().min(1).max(160),
  stepIndex: z.number().int().min(0).max(10_000),
  tiny: z.boolean(),
  paused: z.boolean(),
  skippedStepIds: z.array(z.string().max(160)).max(500),
  startedAt: isoSchema,
  updatedAt: isoSchema
});

const weeklyPlanSchema = z.object({
  id: z.string().min(1).max(160),
  weekStart: dateKeySchema,
  selectedHabitIds: z.array(z.string().min(1).max(160)).max(20),
  reflection: z.string().max(4000),
  tomorrowContext: z
    .enum(['anywhere', 'home', 'work', 'outside', 'phone'])
    .nullable(),
  tomorrowTinyHabitId: z.string().max(160).nullable(),
  createdAt: isoSchema
});

const departurePlanSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().min(1).max(200),
  targetAt: isoSchema,
  bufferMinutes: z.number().int().min(0).max(1440),
  routineId: z.string().max(160).nullable(),
  status: z.enum(['planned', 'active', 'complete', 'cancelled']),
  createdAt: isoSchema,
  completedAt: isoSchema.nullable()
});

const personalExperimentSchema = z.object({
  id: z.string().min(1).max(160),
  kind: z.enum(['tiny_week', 'afternoon_reminder']),
  habitId: z.string().min(1).max(160),
  startedAt: isoSchema,
  endsAt: isoSchema,
  status: z.enum(['active', 'complete', 'stopped']),
  baselineStart: dateKeySchema,
  baselineEnd: dateKeySchema,
  note: z.string().max(2000)
});

const currentSnapshotSchema = z.object({
  schemaVersion: z.literal(4),
  ...snapshotBody,
  habitDeferrals: z.array(deferralSchema).max(10_000),
  routineRuns: z.array(routineRunSchema).max(10_000),
  weeklyPlans: z.array(weeklyPlanSchema).max(10_000),
  departurePlans: z.array(departurePlanSchema).max(10_000),
  personalExperiments: z.array(personalExperimentSchema).max(10_000),
  settings: currentSettingsSchema
});

const versionThreeSnapshotSchema = z.object({
  schemaVersion: z.literal(3),
  ...snapshotBody,
  habitDeferrals: z.array(deferralSchema).max(10_000),
  routineRuns: z.array(routineRunSchema).max(10_000),
  settings: currentSettingsSchema
});

const versionTwoSnapshotSchema = z.object({
  schemaVersion: z.literal(2),
  ...snapshotBody,
  settings: currentSettingsSchema
});

const versionOneSnapshotSchema = z.object({
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

interface EncryptedBackupEnvelope {
  format: typeof ENCRYPTED_BACKUP_FORMAT;
  createdAt: string;
  kdf: {
    name: 'PBKDF2-SHA256';
    iterations: number;
    salt: string;
  };
  cipher: {
    name: 'AES-256-GCM';
    nonce: string;
    ciphertext: string;
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 16_384;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return globalThis.btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function humanRecoveryCode(bytes: Uint8Array): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  let accumulator = 0;
  let bits = 0;
  for (const byte of bytes) {
    accumulator = (accumulator << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      value += alphabet[(accumulator >>> bits) & 31];
    }
  }
  if (bits > 0) value += alphabet[(accumulator << (5 - bits)) & 31];
  return value.match(/.{1,4}/g)?.join('-') ?? value;
}

export async function ensureBackupRecoveryCode(): Promise<string> {
  const existing = await SecureStore.getItemAsync(RECOVERY_CODE_KEY);
  if (existing) return existing;
  const code = humanRecoveryCode(Crypto.getRandomBytes(20));
  await SecureStore.setItemAsync(RECOVERY_CODE_KEY, code, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
  return code;
}

export async function getBackupRecoveryCode(): Promise<string | null> {
  return SecureStore.getItemAsync(RECOVERY_CODE_KEY);
}

export async function rotateBackupRecoveryCode(): Promise<string> {
  await SecureStore.deleteItemAsync(RECOVERY_CODE_KEY);
  return ensureBackupRecoveryCode();
}

async function encryptSnapshot(
  snapshot: AppSnapshot,
  secret: string
): Promise<EncryptedBackupEnvelope> {
  if (secret.trim().length < 10) {
    throw new Error('Use at least 10 characters, or use Spark’s generated recovery code.');
  }
  const salt = Crypto.getRandomBytes(16);
  const nonce = Crypto.getRandomBytes(12);
  const key = await pbkdf2Async(sha256, secret.trim(), salt, {
    c: ENCRYPTION_ITERATIONS,
    dkLen: 32,
    asyncTick: 10
  });
  const createdAt = new Date().toISOString();
  const authenticatedHeader = utf8ToBytes(
    `${ENCRYPTED_BACKUP_FORMAT}|${createdAt}|${ENCRYPTION_ITERATIONS}`
  );
  const ciphertext = gcm(key, nonce, authenticatedHeader).encrypt(
    utf8ToBytes(JSON.stringify(snapshot))
  );
  key.fill(0);
  return {
    format: ENCRYPTED_BACKUP_FORMAT,
    createdAt,
    kdf: {
      name: 'PBKDF2-SHA256',
      iterations: ENCRYPTION_ITERATIONS,
      salt: bytesToBase64(salt)
    },
    cipher: {
      name: 'AES-256-GCM',
      nonce: bytesToBase64(nonce),
      ciphertext: bytesToBase64(ciphertext)
    }
  };
}

async function decryptEnvelope(raw: string, secret: string): Promise<AppSnapshot> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('That file is not a Spark encrypted backup.');
  }
  const schema = z.object({
    format: z.literal(ENCRYPTED_BACKUP_FORMAT),
    createdAt: isoSchema,
    kdf: z.object({
      name: z.literal('PBKDF2-SHA256'),
      iterations: z.number().int().min(50_000).max(1_000_000),
      salt: z.string().min(16).max(200)
    }),
    cipher: z.object({
      name: z.literal('AES-256-GCM'),
      nonce: z.string().min(12).max(200),
      ciphertext: z.string().min(24).max(MAX_BACKUP_BYTES * 2)
    })
  });
  const envelope = schema.parse(parsed);
  const key = await pbkdf2Async(
    sha256,
    secret.trim(),
    base64ToBytes(envelope.kdf.salt),
    {
      c: envelope.kdf.iterations,
      dkLen: 32,
      asyncTick: 10
    }
  );
  try {
    const authenticatedHeader = utf8ToBytes(
      `${ENCRYPTED_BACKUP_FORMAT}|${envelope.createdAt}|${envelope.kdf.iterations}`
    );
    const plaintext = gcm(
      key,
      base64ToBytes(envelope.cipher.nonce),
      authenticatedHeader
    ).decrypt(base64ToBytes(envelope.cipher.ciphertext));
    return parseBackupText(bytesToUtf8(plaintext));
  } catch {
    throw new Error('The password or recovery code did not unlock this backup.');
  } finally {
    key.fill(0);
  }
}

export async function createEncryptedBackupText(
  snapshot: AppSnapshot,
  secret: string
): Promise<string> {
  return JSON.stringify(await encryptSnapshot(snapshot, secret));
}

export async function parseEncryptedBackupText(
  raw: string,
  secret: string
): Promise<AppSnapshot> {
  return decryptEnvelope(raw, secret);
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
  assertUniqueIds('weekly plan', snapshot.weeklyPlans);
  assertUniqueIds('departure plan', snapshot.departurePlans);
  assertUniqueIds('personal experiment', snapshot.personalExperiments);

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
  const routineIds = new Set(snapshot.routines.map((routine) => routine.id));
  const routineStepIds = new Map(
    snapshot.routines.map((routine) => [
      routine.id,
      new Set(routine.steps.map((step) => step.id))
    ])
  );
  for (const step of snapshot.routines.flatMap((routine) => routine.steps)) {
    if (step.linkedHabitId && !habitIds.has(step.linkedHabitId)) {
      throw new Error('A routine step refers to a habit that is missing from the backup.');
    }
  }
  for (const deferral of snapshot.habitDeferrals) {
    if (!habitIds.has(deferral.habitId)) {
      throw new Error('A deferral refers to a habit that is missing from the backup.');
    }
  }
  for (const run of snapshot.routineRuns) {
    if (!routineIds.has(run.routineId)) {
      throw new Error('A saved routine position refers to a missing routine.');
    }
    const validSteps = routineStepIds.get(run.routineId);
    if (!validSteps || run.stepIndex >= validSteps.size) {
      throw new Error('A saved routine position is outside the routine steps.');
    }
    if (run.skippedStepIds.some((stepId) => !validSteps?.has(stepId))) {
      throw new Error('A saved routine position refers to a missing step.');
    }
  }
  for (const plan of snapshot.weeklyPlans) {
    if (plan.selectedHabitIds.some((habitId) => !habitIds.has(habitId))) {
      throw new Error('A weekly plan refers to a habit that is missing from the backup.');
    }
    if (plan.tomorrowTinyHabitId && !habitIds.has(plan.tomorrowTinyHabitId)) {
      throw new Error('A weekly plan refers to a missing tiny habit.');
    }
  }
  for (const plan of snapshot.departurePlans) {
    if (plan.routineId && !routineIds.has(plan.routineId)) {
      throw new Error('A departure plan refers to a routine that is missing from the backup.');
    }
    if (plan.completedAt && plan.completedAt < plan.createdAt) {
      throw new Error('A departure plan has reversed completion dates.');
    }
  }
  for (const experiment of snapshot.personalExperiments) {
    if (!habitIds.has(experiment.habitId)) {
      throw new Error('A personal experiment refers to a habit that is missing from the backup.');
    }
    if (
      experiment.endsAt <= experiment.startedAt ||
      experiment.baselineEnd < experiment.baselineStart
    ) {
      throw new Error('A personal experiment has reversed dates.');
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
  if (version === 4) {
    snapshot = currentSnapshotSchema.parse(value) as AppSnapshot;
  } else if (version === 3) {
    const legacy = versionThreeSnapshotSchema.parse(value);
    snapshot = {
      ...legacy,
      schemaVersion: 4,
      weeklyPlans: [],
      departurePlans: [],
      personalExperiments: [],
      settings: {
        ...defaultSettings,
        ...legacy.settings
      }
    };
  } else if (version === 2) {
    const legacy = versionTwoSnapshotSchema.parse(value);
    snapshot = {
      ...legacy,
      schemaVersion: 4,
      habitDeferrals: [],
      routineRuns: [],
      weeklyPlans: [],
      departurePlans: [],
      personalExperiments: [],
      settings: {
        ...defaultSettings,
        ...legacy.settings
      }
    };
  } else if (version === 1) {
    const legacy = versionOneSnapshotSchema.parse(value);
    const exportedDate = legacy.exportedAt.slice(0, 10);
    snapshot = {
      ...legacy,
      schemaVersion: 4,
      habits: legacy.habits.map((habit) => ({
        ...habit,
        pausedAt:
          habit.pausedUntil && habit.pausedUntil >= exportedDate ? exportedDate : null,
        pauseHistory: []
      })),
      settings: {
        ...defaultSettings,
        ...legacy.settings
      },
      habitDeferrals: [],
      routineRuns: [],
      weeklyPlans: [],
      departurePlans: [],
      personalExperiments: []
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

export async function listRestoreSafetyCopies(): Promise<
  { name: string; uri: string }[]
> {
  const directory = FileSystem.documentDirectory;
  if (!directory) return [];
  return (await FileSystem.readDirectoryAsync(directory))
    .filter((name) => name.startsWith('spark-before-restore-') && name.endsWith('.json'))
    .sort((a, b) => b.localeCompare(a))
    .map((name) => ({ name, uri: `${directory}${name}` }));
}

async function pruneRestoreSafetyCopies(): Promise<void> {
  const copies = await listRestoreSafetyCopies();
  await Promise.all(
    copies
      .slice(MAX_RESTORE_SAFETY_COPIES)
      .map((copy) => FileSystem.deleteAsync(copy.uri, { idempotent: true }))
  );
}

export async function clearRestoreSafetyCopies(): Promise<void> {
  await Promise.all(
    (await listRestoreSafetyCopies()).map((copy) =>
      FileSystem.deleteAsync(copy.uri, { idempotent: true })
    )
  );
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

export async function shareEncryptedBackup(secret: string): Promise<void> {
  const directory = FileSystem.cacheDirectory;
  if (!directory) throw new Error('A temporary folder is not available.');
  const encryptedText = await createEncryptedBackupText(
    await exportSnapshot(),
    secret
  );
  const path = `${directory}spark-encrypted-${new Date()
    .toISOString()
    .replaceAll(':', '-')}.sparkbackup`;
  await FileSystem.writeAsStringAsync(path, encryptedText, {
    encoding: FileSystem.EncodingType.UTF8
  });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(path, {
    mimeType: 'application/json',
    dialogTitle: 'Save your encrypted Spark backup'
  });
}

export async function chooseAutomaticBackupDirectory(): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('Automatic folder backups are currently available on Android.');
  }
  const result =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!result.granted) throw new Error('No backup folder was selected.');
  return result.directoryUri;
}

export async function writeAutomaticEncryptedBackup(
  directoryUri: string
): Promise<string> {
  if (Platform.OS !== 'android') {
    throw new Error('Automatic folder backups are currently available on Android.');
  }
  const recoveryCode = await ensureBackupRecoveryCode();
  const encryptedText = await createEncryptedBackupText(
    await exportSnapshot(),
    recoveryCode
  );
  const name = `spark-auto-${new Date().toISOString().replaceAll(':', '-')}`;
  const uri = await FileSystem.StorageAccessFramework.createFileAsync(
    directoryUri,
    name,
    'application/json'
  );
  await FileSystem.StorageAccessFramework.writeAsStringAsync(
    uri,
    encryptedText,
    { encoding: FileSystem.EncodingType.UTF8 }
  );
  const automaticFiles = (
    await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri).catch(
      () => [] as string[]
    )
  )
    .filter((fileUri) => {
      try {
        return decodeURIComponent(fileUri).includes('spark-auto-');
      } catch {
        return fileUri.includes('spark-auto-');
      }
    })
    .sort((a, b) => b.localeCompare(a));
  await Promise.all(
    automaticFiles
      .slice(MAX_AUTOMATIC_BACKUPS)
      .map((fileUri) =>
        FileSystem.StorageAccessFramework.deleteAsync(fileUri, {
          idempotent: true
        }).catch(() => undefined)
      )
  );
  return uri;
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
    'context',
    'tags',
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
      '',
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
      completion.context ?? '',
      (completion.tags ?? []).join('|'),
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

export async function pickEncryptedBackupForPreview(
  secret: string
): Promise<BackupPreview | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'application/octet-stream'],
    copyToCacheDirectory: true,
    multiple: false
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) throw new Error('Spark could not read the selected file.');
  if (asset.size != null && asset.size > MAX_BACKUP_BYTES * 2) {
    throw new Error('That encrypted backup is larger than Spark’s safety limit.');
  }
  const raw = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8
  });
  const snapshot = await parseEncryptedBackupText(raw, secret);
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
  await pruneRestoreSafetyCopies();
  await importSnapshot(preview.snapshot);
  return safetyCopy;
}
