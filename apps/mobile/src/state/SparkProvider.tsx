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
import type { CaptureItem } from '@spark/domain';
import {
  deleteCompletion,
  insertCaptureItem,
  insertCompletion,
  insertFocusSession,
  loadAppData,
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
  const timeZone = deviceTimeZone();

  const refresh = useCallback(async () => {
    try {
      setData(await loadAppData());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Spark could not open local data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void loadAppConfig().then(setRemoteConfig);
  }, [refresh]);

  useEffect(() => {
    if (loading) return;
    void rescheduleHabitNotifications(
      data.habits,
      data.settings.notificationsEnabled,
      Math.min(data.settings.notificationCap, remoteConfig.defaults.maxDailyHabitNotifications)
    );
  }, [
    data.habits,
    data.settings.notificationCap,
    data.settings.notificationsEnabled,
    loading,
    remoteConfig.defaults.maxDailyHabitNotifications
  ]);

  useEffect(() => {
    if (!loading) {
      void syncTodayWidget({
        habits: data.habits,
        completions: data.completions,
        timeZone
      });
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
      setData((current) => ({
        ...current,
        completions: [completion, ...current.completions]
      }));
      if (data.settings.hapticsEnabled) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return completion;
    },
    [data.settings.hapticsEnabled, timeZone]
  );

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const habitId = String(response.notification.request.content.data?.habitId || '');
      const habit = data.habits.find((candidate) => candidate.id === habitId);
      if (!habit) return;
      if (response.actionIdentifier === ACTION_TINY) {
        const variant =
          habit.variants.find((candidate) => candidate.kind === 'tiny') ?? habit.variants[0];
        if (variant) void completeHabit(habit, variant, 'notification');
      } else if (response.actionIdentifier === ACTION_SNOOZE) {
        void snoozeHabit(habit.id);
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
        setData((current) => ({
          ...current,
          completions: current.completions.filter((completion) => completion.id !== id)
        }));
      },
      async saveHabit(habit) {
        await upsertHabit(habit);
        await refresh();
      },
      async pauseHabit(habit, pausedUntil) {
        await upsertHabit({ ...habit, pausedUntil });
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
