import {
  localDateKey,
  rewardForVariant,
  type Capacity,
  type Completion,
  type CompletionSource,
  type FocusSession,
  type Habit,
  type HabitVariant,
  type Routine
} from '@spark/domain';
import { defaultAppConfig, type AppConfig } from '@spark/cloud-contracts';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from 'react';
import { AppState } from 'react-native';
import type { CaptureItem } from '@spark/domain';
import {
  deleteCompletion,
  insertCaptureItem,
  insertCompletion,
  insertFocusSession,
  loadAppData,
  loadCompletionInsights,
  saveCheckIn,
  saveEntitlement,
  saveSetting,
  upsertHabit,
  upsertRoutine
} from '../data/database';
import {
  defaultEntitlement,
  defaultSettings,
  type AppData,
  type AppSettings,
  type DailyCheckIn,
  type Entitlement
} from '../data/models';
import { deviceTimeZone } from '../lib/date';
import { createId } from '../lib/id';
import { loadAppConfig } from '../services/cloudConfig';
import { reportError, runSafely } from '../services/diagnostics';
import {
  ACTION_SNOOZE,
  ACTION_TINY,
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
  setCheckIn(capacity: Capacity, availableMinutes?: number | null): Promise<void>;
  completeHabit(
    habit: Habit,
    variant: HabitVariant,
    source?: CompletionSource
  ): Promise<Completion>;
  undoCompletion(id: string): Promise<void>;
  saveHabit(habit: Habit): Promise<void>;
  pauseHabit(habit: Habit, pausedUntil: string | null): Promise<void>;
  archiveHabit(habit: Habit): Promise<void>;
  addCapture(text: string): Promise<void>;
  resolveCapture(item: CaptureItem): Promise<void>;
  saveFocus(session: FocusSession): Promise<void>;
  saveRoutine(routine: Routine): Promise<void>;
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

  const refresh = useCallback(async () => {
    try {
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
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTimeZone(deviceTimeZone());
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (loading) return;
    runSafely(
      'notifications.reschedule',
      () =>
        rescheduleHabitNotifications(
          data.habits,
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
          timeZone
        })
      );
    }
  }, [data.completions, data.habits, loading, timeZone]);

  const completeHabit = useCallback(
    async (
      habit: Habit,
      variant: HabitVariant,
      source: CompletionSource = 'today'
    ) => {
      const now = new Date();
      const completion: Completion = {
        id: createId('completion'),
        habitId: habit.id,
        variantId: variant.id,
        variantKind: variant.kind,
        reward: variant.reward || rewardForVariant(variant.kind),
        occurredAt: now.toISOString(),
        loggedAt: now.toISOString(),
        localDate: localDateKey(now, timeZone),
        source
      };
      await insertCompletion(completion);
      const insights = await loadCompletionInsights();
      setData((current) => ({
        ...current,
        completions: [completion, ...current.completions],
        ...insights
      }));
      if (data.settings.hapticsEnabled) {
        if (data.settings.sensoryProfile === 'calm') {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
      return completion;
    },
    [data.settings.hapticsEnabled, data.settings.sensoryProfile, timeZone]
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const habitId = String(response.notification.request.content.data?.habitId || '');
      const habit = data.habits.find((candidate) => candidate.id === habitId);
      if (!habit) return;
      if (response.actionIdentifier === ACTION_TINY) {
        const variant =
          habit.variants.find((candidate) => candidate.kind === 'tiny') ?? habit.variants[0];
        if (variant) {
          runSafely('notifications.complete_tiny', () =>
            completeHabit(habit, variant, 'notification')
          );
        }
      } else if (response.actionIdentifier === ACTION_SNOOZE) {
        runSafely('notifications.snooze', () => snoozeHabit(habit.id));
      }
    });
    return () => subscription.remove();
  }, [completeHabit, data.habits]);

  const value = useMemo<SparkContextValue>(
    () => ({
      ...data,
      loading,
      error,
      remoteConfig,
      timeZone,
      refresh,
      async setCheckIn(capacity, availableMinutes = null) {
        const checkIn: DailyCheckIn = {
          localDate: localDateKey(new Date(), timeZone),
          capacity,
          availableMinutes,
          mood: null
        };
        await saveCheckIn(checkIn);
        setData((current) => ({
          ...current,
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
        await refresh();
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
