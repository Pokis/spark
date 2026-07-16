import {
  localDateKey,
  rewardForVariant,
  type Capacity,
  type Completion,
  type CompletionTag,
  type CompletionSource,
  type FocusSession,
  type Habit,
  type HabitContext,
  type HabitVariant,
  type Routine
} from '@spark/domain';
import { defaultAppConfig, type AppConfig } from '@spark/cloud-contracts';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import {
  clearSharedPayloads as clearNativeSharedPayloads,
  getSharedPayloads,
  type SharePayload
} from 'expo-sharing';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren
} from 'react';
import { AppState } from 'react-native';
import type { CaptureItem } from '@spark/domain';
import {
  deleteCaptureItem,
  deleteCompletion,
  deleteHabitDeferral,
  deleteRoutineRun,
  insertCaptureItem,
  insertCompletion,
  insertFocusSession,
  loadAppData,
  loadCompletionInsights,
  purgeExpiredHabitDeferrals,
  saveCheckIn,
  saveEntitlement,
  saveHabitDeferral,
  saveRoutineRun,
  saveSetting,
  updateCompletionTags,
  upsertHabit,
  upsertRoutine
} from '../data/database';
import {
  defaultEntitlement,
  defaultSettings,
  type AppData,
  type AppSettings,
  type DailyCheckIn,
  type Entitlement,
  type HabitDeferral,
  type RoutineRunState
} from '../data/models';
import { deviceTimeZone } from '../lib/date';
import { createId } from '../lib/id';
import { COMPLETION_GUARD_MS, tryAcquireCompletion } from '../lib/completionGuard';
import { loadAppConfig } from '../services/cloudConfig';
import { reportError, runSafely } from '../services/diagnostics';
import {
  notificationActionKind,
  rescheduleHabitNotifications,
  snoozeHabit
} from '../services/notifications';
import { syncTodayWidget } from '../services/widget';

interface SparkContextValue extends AppData {
  loading: boolean;
  error: string | null;
  remoteConfig: AppConfig;
  timeZone: string;
  refresh(): Promise<void>;
  setCheckIn(
    capacity: Capacity,
    availableMinutes?: number | null,
    context?: HabitContext | null
  ): Promise<void>;
  completeHabit(
    habit: Habit,
    variant: HabitVariant,
    source?: CompletionSource,
    options?: {
      occurredAt?: Date;
      context?: HabitContext;
      tags?: CompletionTag[];
    }
  ): Promise<Completion>;
  undoCompletion(id: string): Promise<void>;
  setCompletionTags(id: string, tags: CompletionTag[]): Promise<void>;
  saveHabit(habit: Habit): Promise<void>;
  pauseHabit(habit: Habit, pausedUntil: string | null): Promise<void>;
  archiveHabit(habit: Habit): Promise<void>;
  addCapture(text: string): Promise<void>;
  updateCapture(item: CaptureItem, text: string): Promise<void>;
  deleteCapture(item: CaptureItem): Promise<void>;
  resolveCapture(item: CaptureItem): Promise<void>;
  saveFocus(session: FocusSession): Promise<void>;
  saveRoutine(routine: Routine): Promise<void>;
  duplicateRoutine(routine: Routine): Promise<void>;
  archiveRoutine(routine: Routine): Promise<void>;
  restoreRoutine(routine: Routine): Promise<void>;
  saveRoutinePosition(run: RoutineRunState): Promise<void>;
  clearRoutinePosition(routineId: string): Promise<void>;
  deferHabit(habitId: string, kind: HabitDeferral['kind']): Promise<void>;
  clearHabitDeferral(habitId: string): Promise<void>;
  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
  updateEntitlement(value: Entitlement): Promise<void>;
  routines: Routine[];
}

const emptyData: AppData = {
  habits: [],
  completions: [],
  completionTotals: { totalWins: 0, totalSparks: 0 },
  completionDailySummaries: [],
  focusSessions: [],
  captureItems: [],
  routines: [],
  dailyCheckIns: [],
  habitDeferrals: [],
  routineRuns: [],
  settings: defaultSettings,
  entitlement: defaultEntitlement
};

const SparkContext = createContext<SparkContextValue | null>(null);

export function SparkProvider({ children }: PropsWithChildren) {
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [remoteConfig, setRemoteConfig] = useState<AppConfig>(defaultAppConfig);
  const [timeZone, setTimeZone] = useState(deviceTimeZone);
  const completionLocks = useRef(new Map<string, number>());
  const [sharedPayloads, setSharedPayloads] = useState<SharePayload[]>([]);
  const refreshSharedPayloads = useCallback(() => {
    try {
      setSharedPayloads(getSharedPayloads());
    } catch {
      setSharedPayloads([]);
    }
  }, []);
  const clearSharedPayloads = useCallback(() => {
    try {
      clearNativeSharedPayloads();
    } finally {
      setSharedPayloads([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      await purgeExpiredHabitDeferrals(new Date().toISOString());
      setData(await loadAppData());
      setError(null);
    } catch (reason) {
      void reportError('data.refresh', reason);
      setError(reason instanceof Error ? reason.message : 'Spark could not open local data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runSafely('app.initial_refresh', refresh);
    runSafely('cloud.config', async () => setRemoteConfig(await loadAppConfig()));
    refreshSharedPayloads();
  }, [refresh, refreshSharedPayloads]);

  useEffect(() => {
    if (loading || sharedPayloads.length === 0) return;
    const text = sharedPayloads
      .filter((payload) => payload.shareType === 'text' || payload.shareType === 'url')
      .map((payload) => payload.value.trim())
      .filter(Boolean)
      .join('\n');
    if (!text) {
      clearSharedPayloads();
      return;
    }
    const item: CaptureItem = {
      id: createId('capture'),
      text: text.slice(0, 4000),
      createdAt: new Date().toISOString()
    };
    runSafely('capture.incoming_share', async () => {
      await insertCaptureItem(item);
      setData((current) => ({
        ...current,
        captureItems: [item, ...current.captureItems]
      }));
      clearSharedPayloads();
    });
  }, [clearSharedPayloads, loading, sharedPayloads]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setTimeZone(deviceTimeZone());
        refreshSharedPayloads();
      }
    });
    return () => subscription.remove();
  }, [refreshSharedPayloads]);

  useEffect(() => {
    if (loading) return;
    runSafely(
      'notifications.reschedule',
      () =>
        rescheduleHabitNotifications(
          data.habits.filter(
            (habit) =>
              !data.habitDeferrals.some(
                (deferral) =>
                  deferral.habitId === habit.id && Date.parse(deferral.until) > Date.now()
              )
          ),
          data.completions,
          data.settings.notificationsEnabled,
          Math.min(
            data.settings.notificationCap,
            remoteConfig.defaults.maxDailyHabitNotifications
          ),
          timeZone,
          data.settings.autoQuietReminders
        )
    );
  }, [
    data.completions,
    data.habitDeferrals,
    data.habits,
    data.settings.notificationCap,
    data.settings.notificationsEnabled,
    data.settings.autoQuietReminders,
    loading,
    remoteConfig.defaults.maxDailyHabitNotifications,
    timeZone
  ]);

  useEffect(() => {
    if (!loading) {
      runSafely('widget.sync', () =>
        syncTodayWidget({
          habits: data.habits,
          completions: data.completions,
          timeZone,
          appIconStyle: data.settings.appIconStyle
        })
      );
    }
  }, [data.completions, data.habits, data.settings.appIconStyle, loading, timeZone]);

  useEffect(() => {
    if (loading || data.habitDeferrals.length === 0) return;
    const nextExpiry = Math.min(
      ...data.habitDeferrals.map((deferral) => Date.parse(deferral.until))
    );
    const delay = Math.max(100, Math.min(2_147_000_000, nextExpiry - Date.now() + 100));
    const timeout = setTimeout(() => void refresh(), delay);
    return () => clearTimeout(timeout);
  }, [data.habitDeferrals, loading, refresh]);

  const completeHabit = useCallback(
    async (
      habit: Habit,
      variant: HabitVariant,
      source: CompletionSource = 'today',
      options: {
        occurredAt?: Date;
        context?: HabitContext;
        tags?: CompletionTag[];
      } = {}
    ) => {
      const lockKey = `${habit.id}:${variant.id}`;
      if (!tryAcquireCompletion(completionLocks.current, lockKey)) {
        throw new Error('That win is already being saved.');
      }
      try {
        const occurredAt = options.occurredAt ?? new Date();
        const loggedAt = new Date();
        const completion: Completion = {
          id: createId('completion'),
          habitId: habit.id,
          variantId: variant.id,
          variantKind: variant.kind,
          reward: variant.reward || rewardForVariant(variant.kind),
          occurredAt: occurredAt.toISOString(),
          loggedAt: loggedAt.toISOString(),
          localDate: localDateKey(occurredAt, timeZone),
          source,
          context: options.context,
          tags: options.tags ?? []
        };
        await insertCompletion(completion);
        const clearsCurrentDeferral =
          completion.localDate === localDateKey(loggedAt, timeZone);
        if (clearsCurrentDeferral) await deleteHabitDeferral(habit.id);
        const insights = await loadCompletionInsights();
        setData((current) => ({
          ...current,
          completions: [completion, ...current.completions],
          habitDeferrals: clearsCurrentDeferral
            ? current.habitDeferrals.filter((deferral) => deferral.habitId !== habit.id)
            : current.habitDeferrals,
          ...insights
        }));
        if (data.settings.hapticsEnabled) {
          try {
            if (data.settings.sensoryProfile === 'calm') {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } else {
              await Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success
              );
            }
          } catch (reason) {
            void reportError('completion.haptic', reason);
          }
        }
        return completion;
      } finally {
        setTimeout(() => completionLocks.current.delete(lockKey), COMPLETION_GUARD_MS);
      }
    },
    [data.settings.hapticsEnabled, data.settings.sensoryProfile, timeZone]
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const habitId = String(response.notification.request.content.data?.habitId || '');
      const habit = data.habits.find((candidate) => candidate.id === habitId);
      if (!habit) return;
      const action = notificationActionKind(response.actionIdentifier);
      if (action === 'log_tiny') {
        const variant =
          habit.variants.find((candidate) => candidate.kind === 'tiny') ?? habit.variants[0];
        if (variant) {
          runSafely('notifications.complete_tiny', () =>
            completeHabit(habit, variant, 'notification')
          );
        }
      } else if (action === 'snooze') {
        runSafely('notifications.snooze', () =>
          snoozeHabit(habit.id, data.settings.reminderSnoozeMinutes)
        );
      } else if (action === 'quiet_today') {
        const tomorrow = new Date();
        tomorrow.setHours(24, 0, 0, 0);
        const deferral: HabitDeferral = {
          habitId: habit.id,
          until: tomorrow.toISOString(),
          kind: 'quiet_today'
        };
        runSafely('notifications.quiet_today', async () => {
          await saveHabitDeferral(deferral);
          setData((current) => ({
            ...current,
            habitDeferrals: [
              deferral,
              ...current.habitDeferrals.filter((item) => item.habitId !== habit.id)
            ]
          }));
        });
      }
    });
    return () => subscription.remove();
  }, [completeHabit, data.habits, data.settings.reminderSnoozeMinutes]);

  const value = useMemo<SparkContextValue>(
    () => ({
      ...data,
      loading,
      error,
      remoteConfig,
      timeZone,
      refresh,
      async setCheckIn(capacity, availableMinutes = null, context = null) {
        const checkIn: DailyCheckIn = {
          localDate: localDateKey(new Date(), timeZone),
          capacity,
          availableMinutes,
          mood: null,
          context
        };
        await saveCheckIn(checkIn);
        if (context && data.settings.rememberContextByTime) {
          const hour = new Date().getHours();
          const period = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
          const contextByPeriod = {
            ...data.settings.contextByPeriod,
            [period]: context
          };
          await saveSetting('contextByPeriod', contextByPeriod);
        }
        setData((current) => ({
          ...current,
          settings:
            context && current.settings.rememberContextByTime
              ? {
                  ...current.settings,
                  contextByPeriod: {
                    ...current.settings.contextByPeriod,
                    [new Date().getHours() < 12
                      ? 'morning'
                      : new Date().getHours() < 17
                        ? 'afternoon'
                        : 'evening']: context
                  }
                }
              : current.settings,
          dailyCheckIns: [
            checkIn,
            ...current.dailyCheckIns.filter((item) => item.localDate !== checkIn.localDate)
          ]
        }));
      },
      completeHabit,
      async undoCompletion(id) {
        await deleteCompletion(id);
        const insights = await loadCompletionInsights();
        setData((current) => ({
          ...current,
          completions: current.completions.filter((completion) => completion.id !== id),
          ...insights
        }));
      },
      async setCompletionTags(id, tags) {
        await updateCompletionTags(id, tags);
        setData((current) => ({
          ...current,
          completions: current.completions.map((completion) =>
            completion.id === id ? { ...completion, tags } : completion
          )
        }));
      },
      async saveHabit(habit) {
        await upsertHabit(habit);
        await refresh();
      },
      async pauseHabit(habit, pausedUntil) {
        const today = localDateKey(new Date(), timeZone);
        const history = [...(habit.pauseHistory ?? [])];
        if (habit.pausedAt && habit.pausedUntil) {
          const endedOn =
            habit.pausedUntil < today ? habit.pausedUntil : today;
          if (endedOn >= habit.pausedAt) {
            history.push({ startedOn: habit.pausedAt, endedOn });
          }
        }
        await upsertHabit({
          ...habit,
          pausedAt: pausedUntil ? today : null,
          pausedUntil,
          pauseHistory: history
        });
        await refresh();
      },
      async archiveHabit(habit) {
        await upsertHabit({ ...habit, archivedAt: new Date().toISOString() });
        await refresh();
      },
      async addCapture(text) {
        const item: CaptureItem = {
          id: createId('capture'),
          text: text.trim(),
          createdAt: new Date().toISOString()
        };
        await insertCaptureItem(item);
        setData((current) => ({
          ...current,
          captureItems: [item, ...current.captureItems]
        }));
      },
      async updateCapture(item, text) {
        const updated = { ...item, text: text.trim() };
        await insertCaptureItem(updated);
        setData((current) => ({
          ...current,
          captureItems: current.captureItems.map((candidate) =>
            candidate.id === item.id ? updated : candidate
          )
        }));
      },
      async deleteCapture(item) {
        await deleteCaptureItem(item.id);
        setData((current) => ({
          ...current,
          captureItems: current.captureItems.filter(
            (candidate) => candidate.id !== item.id
          )
        }));
      },
      async resolveCapture(item) {
        const updated: CaptureItem = { ...item, resolvedAt: new Date().toISOString() };
        await insertCaptureItem(updated);
        setData((current) => ({
          ...current,
          captureItems: current.captureItems.map((candidate) =>
            candidate.id === item.id ? updated : candidate
          )
        }));
      },
      async saveFocus(session) {
        await insertFocusSession(session);
        setData((current) => ({
          ...current,
          focusSessions: [
            session,
            ...current.focusSessions.filter((candidate) => candidate.id !== session.id)
          ]
        }));
      },
      async saveRoutine(routine) {
        await upsertRoutine(routine);
        const currentRun = data.routineRuns.find((run) => run.routineId === routine.id);
        if (currentRun) {
          const orderedSteps = [...routine.steps].sort((a, b) => a.sortOrder - b.sortOrder);
          const stepIds = new Set(orderedSteps.map((step) => step.id));
          await saveRoutineRun({
            ...currentRun,
            stepIndex: Math.min(
              currentRun.stepIndex,
              Math.max(0, orderedSteps.length - 1)
            ),
            skippedStepIds: currentRun.skippedStepIds.filter((stepId) =>
              stepIds.has(stepId)
            ),
            updatedAt: new Date().toISOString()
          });
        }
        await refresh();
      },
      async duplicateRoutine(routine) {
        const copy: Routine = {
          ...routine,
          id: createId('routine'),
          title: `${routine.title} copy`,
          createdAt: new Date().toISOString(),
          archivedAt: undefined,
          steps: routine.steps.map((step) => ({
            ...step,
            id: createId('step')
          }))
        };
        await upsertRoutine(copy);
        await refresh();
      },
      async archiveRoutine(routine) {
        await upsertRoutine({ ...routine, archivedAt: new Date().toISOString() });
        await deleteRoutineRun(routine.id);
        await refresh();
      },
      async restoreRoutine(routine) {
        await upsertRoutine({ ...routine, archivedAt: undefined });
        await refresh();
      },
      async saveRoutinePosition(run) {
        await saveRoutineRun(run);
        setData((current) => ({
          ...current,
          routineRuns: [
            run,
            ...current.routineRuns.filter((item) => item.routineId !== run.routineId)
          ]
        }));
      },
      async clearRoutinePosition(routineId) {
        await deleteRoutineRun(routineId);
        setData((current) => ({
          ...current,
          routineRuns: current.routineRuns.filter(
            (item) => item.routineId !== routineId
          )
        }));
      },
      async deferHabit(habitId, kind) {
        const now = new Date();
        const until = new Date(now);
        if (kind === 'not_now') {
          until.setMinutes(until.getMinutes() + 60);
        } else if (kind === 'later_today') {
          until.setHours(18, 0, 0, 0);
          if (until <= now) until.setTime(now.getTime() + 90 * 60_000);
          const endOfToday = new Date(now);
          endOfToday.setHours(23, 59, 0, 0);
          if (until > endOfToday) until.setTime(endOfToday.getTime());
        } else {
          until.setHours(24, 0, 0, 0);
        }
        const deferral: HabitDeferral = {
          habitId,
          until: until.toISOString(),
          kind
        };
        await saveHabitDeferral(deferral);
        setData((current) => ({
          ...current,
          habitDeferrals: [
            deferral,
            ...current.habitDeferrals.filter((item) => item.habitId !== habitId)
          ]
        }));
      },
      async clearHabitDeferral(habitId) {
        await deleteHabitDeferral(habitId);
        setData((current) => ({
          ...current,
          habitDeferrals: current.habitDeferrals.filter(
            (item) => item.habitId !== habitId
          )
        }));
      },
      async updateSetting(key, settingValue) {
        await saveSetting(key, settingValue);
        setData((current) => ({
          ...current,
          settings: { ...current.settings, [key]: settingValue }
        }));
      },
      async updateEntitlement(entitlement) {
        await saveEntitlement(entitlement);
        setData((current) => ({ ...current, entitlement }));
      }
    }),
    [completeHabit, data, error, loading, refresh, remoteConfig, timeZone]
  );

  return <SparkContext.Provider value={value}>{children}</SparkContext.Provider>;
}

export function useSpark(): SparkContextValue {
  const context = useContext(SparkContext);
  if (!context) throw new Error('useSpark must be used inside SparkProvider.');
  return context;
}
