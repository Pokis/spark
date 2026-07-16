import {
  addCalendarDays,
  isDatePaused,
  isHabitScheduledOn,
  localDateKey,
  recentDateKeys,
  type Completion,
  type Habit
} from '@spark/domain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const HABIT_CATEGORY = 'spark-habit';
export const ACTION_TINY = 'spark-tiny';
export const ACTION_SNOOZE = 'spark-snooze';
export const ACTION_QUIET_TODAY = 'spark-quiet-today';
const MAX_SCHEDULED_HABIT_NOTIFICATIONS = 56;
const HORIZON_DAYS = 14;
const REMINDER_PLAN_KEY = 'spark.reminder.plan.v1';
const REMINDER_QUIET_KEY = 'spark.reminder.quiet.v1';

interface StoredReminderPlan {
  habitId: string;
  dateKey: string;
}

interface ReminderQuietState {
  misses: number;
  quietUntil?: string;
}

export function notificationActionKind(
  identifier: string
): 'log_tiny' | 'snooze' | 'quiet_today' | 'open' {
  if (identifier === ACTION_TINY) return 'log_tiny';
  if (identifier === ACTION_SNOOZE) return 'snooze';
  if (identifier === ACTION_QUIET_TODAY) return 'quiet_today';
  return 'open';
}

export interface PlannedHabitNotification {
  habit: Habit;
  dateKey: string;
  date: Date;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export async function configureNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('gentle-reminders', {
      name: 'Gentle habit reminders',
      description: 'Low-pressure invitations for habits you chose.',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 70],
      lightColor: '#FF6B5F',
      enableVibrate: true,
      showBadge: false
    });
  }
  await Notifications.setNotificationCategoryAsync(HABIT_CATEGORY, [
    {
      identifier: ACTION_TINY,
      buttonTitle: 'Log tiny win',
      options: { opensAppToForeground: true }
    },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: 'Later',
      options: { opensAppToForeground: false }
    },
    {
      identifier: ACTION_QUIET_TODAY,
      buttonTitle: 'Quiet today',
      options: { opensAppToForeground: true }
    }
  ]);
}

export async function requestNotificationPermission(): Promise<boolean> {
  await configureNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export function parsePreferredTime(
  value?: string
): { hour: number; minute: number } | null {
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d$/.exec(value || '09:00');
  if (!match) return null;
  const [hour, minute] = (value || '09:00').split(':').map(Number);
  return { hour: hour!, minute: minute! };
}

export function isValidPreferredTime(value: string): boolean {
  return parsePreferredTime(value) !== null;
}

function localDateAt(dateKey: string, hour: number, minute: number): Date {
  const date = new Date(`${dateKey}T00:00:00`);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function reminderTime(habit: Habit): { hour: number; minute: number } | null {
  if (!habit.reminderWindow || habit.reminderWindow === 'exact') {
    return parsePreferredTime(habit.preferredTime);
  }
  const defaults = {
    morning: { hour: 9, minute: 30 },
    afternoon: { hour: 14, minute: 0 },
    evening: { hour: 19, minute: 0 }
  } as const;
  const base = defaults[habit.reminderWindow];
  const spread = [...habit.id].reduce((total, character) => total + character.charCodeAt(0), 0);
  return { hour: base.hour, minute: (base.minute + spread % 25) % 60 };
}

function completedOn(
  habit: Habit,
  completions: Completion[],
  dateKey: string
): boolean {
  return completions.some(
    (completion) =>
      completion.habitId === habit.id && completion.localDate === dateKey
  );
}

function spreadDates(dates: string[], count: number): string[] {
  if (count <= 0 || dates.length === 0) return [];
  if (count >= dates.length) return dates;
  return Array.from({ length: count }, (_, index) => {
    const position = Math.floor((index * dates.length) / count);
    return dates[position]!;
  });
}

export function nextReminderDates(
  habit: Habit,
  completions: Completion[],
  now: Date,
  timeZone: string,
  horizonDays = HORIZON_DAYS
): string[] {
  const today = localDateKey(now, timeZone);
  const candidateDates = Array.from(
    { length: horizonDays },
    (_, index) => addCalendarDays(today, index)
  );

  if (habit.schedule.type === 'timesPerWeek') {
    const recentWindow = recentDateKeys(now, timeZone, 7);
    const recentWins = new Set(
      completions
        .filter(
          (completion) =>
            completion.habitId === habit.id &&
            recentWindow.includes(completion.localDate)
        )
        .map((completion) => completion.localDate)
    ).size;
    const remaining = Math.max(0, habit.schedule.count - recentWins);
    const available = candidateDates
      .slice(0, 7)
      .filter(
        (dateKey) =>
          !isDatePaused(habit, dateKey) &&
          !completedOn(habit, completions, dateKey)
      );
    return spreadDates(available, remaining);
  }

  return candidateDates.filter((dateKey) => {
    if (completedOn(habit, completions, dateKey)) return false;
    const weekday = new Date(`${dateKey}T12:00:00`).getDay();
    return isHabitScheduledOn(habit, dateKey, weekday);
  });
}

export function planHabitNotifications(
  habits: Habit[],
  completions: Completion[],
  now: Date,
  timeZone: string,
  cap: number
): PlannedHabitNotification[] {
  const selected = habits
    .filter((habit) => habit.reminderEnabled && !habit.archivedAt)
    .sort((a, b) => b.priority - a.priority || a.sortOrder - b.sortOrder)
    .slice(0, Math.max(0, cap));

  return selected
    .flatMap((habit) => {
      const time = reminderTime(habit);
      if (!time) return [];
      return nextReminderDates(habit, completions, now, timeZone).map(
        (dateKey): PlannedHabitNotification => ({
          habit,
          dateKey,
          date: localDateAt(dateKey, time.hour, time.minute)
        })
      );
    })
    .filter((item) => item.date.getTime() > now.getTime() + 10_000)
    .sort(
      (a, b) =>
        a.date.getTime() - b.date.getTime() ||
        b.habit.priority - a.habit.priority ||
        a.habit.sortOrder - b.habit.sortOrder
    )
    .slice(0, MAX_SCHEDULED_HABIT_NOTIFICATIONS);
}

async function cancelHabitNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        (notification) =>
          notification.content.data?.sparkNotificationType === 'habit'
      )
      .map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)
      )
  );
}

async function applyAutomaticQuieting(
  planned: PlannedHabitNotification[],
  completions: Completion[],
  now: Date,
  timeZone: string,
  enabled: boolean
): Promise<PlannedHabitNotification[]> {
  if (!enabled) {
    await AsyncStorage.removeItem(REMINDER_PLAN_KEY);
    return planned;
  }
  const today = localDateKey(now, timeZone);
  let previous: StoredReminderPlan[] = [];
  let quiet: Record<string, ReminderQuietState> = {};
  try {
    const parsedPrevious: unknown = JSON.parse(
      (await AsyncStorage.getItem(REMINDER_PLAN_KEY)) ?? '[]'
    );
    const parsedQuiet: unknown = JSON.parse(
      (await AsyncStorage.getItem(REMINDER_QUIET_KEY)) ?? '{}'
    );
    previous = Array.isArray(parsedPrevious)
      ? parsedPrevious.filter(
          (item): item is StoredReminderPlan =>
            Boolean(
              item &&
                typeof item === 'object' &&
                typeof (item as StoredReminderPlan).habitId === 'string' &&
                typeof (item as StoredReminderPlan).dateKey === 'string'
            )
        )
      : [];
    quiet =
      parsedQuiet && typeof parsedQuiet === 'object' && !Array.isArray(parsedQuiet)
        ? (parsedQuiet as Record<string, ReminderQuietState>)
        : {};
  } catch {
    previous = [];
    quiet = {};
  }

  for (const item of previous.filter((candidate) => candidate.dateKey < today)) {
    const storedState = quiet[item.habitId];
    const state: ReminderQuietState =
      storedState && Number.isFinite(storedState.misses)
        ? {
            misses: storedState.misses,
            quietUntil:
              typeof storedState.quietUntil === 'string'
                ? storedState.quietUntil
                : undefined
          }
        : { misses: 0 };
    const completed = completions.some(
      (completion) =>
        completion.habitId === item.habitId &&
        completion.localDate === item.dateKey
    );
    state.misses = completed ? 0 : state.misses + 1;
    if (state.misses >= 3) {
      state.misses = 0;
      state.quietUntil = addCalendarDays(today, 3);
    }
    quiet[item.habitId] = state;
  }

  const filtered = planned.filter((item) => {
    const quietUntil = quiet[item.habit.id]?.quietUntil;
    return !quietUntil || quietUntil < today;
  });
  await Promise.all([
    AsyncStorage.setItem(
      REMINDER_PLAN_KEY,
      JSON.stringify(
        filtered.map(({ habit, dateKey }) => ({ habitId: habit.id, dateKey }))
      )
    ),
    AsyncStorage.setItem(REMINDER_QUIET_KEY, JSON.stringify(quiet))
  ]);
  return filtered;
}

export async function rescheduleHabitNotifications(
  habits: Habit[],
  completions: Completion[],
  enabled: boolean,
  cap: number,
  timeZone: string,
  autoQuietReminders = false
): Promise<void> {
  await cancelHabitNotifications();
  if (!enabled || cap <= 0) {
    await AsyncStorage.removeItem(REMINDER_PLAN_KEY);
    return;
  }
  await configureNotifications();
  const now = new Date();
  const planned = await applyAutomaticQuieting(
    planHabitNotifications(habits, completions, now, timeZone, cap),
    completions,
    now,
    timeZone,
    autoQuietReminders
  );
  for (const item of planned) {
    const tiny =
      item.habit.variants.find((variant) => variant.kind === 'tiny') ??
      item.habit.variants[0];
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${item.habit.icon} A small Spark?`,
        body: tiny?.label ?? item.habit.title,
        data: {
          sparkNotificationType: 'habit',
          habitId: item.habit.id,
          dateKey: item.dateKey
        },
        categoryIdentifier: HABIT_CATEGORY,
        sound: false
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: item.date,
        channelId: 'gentle-reminders'
      }
    });
  }
}

export async function snoozeHabit(habitId: string, minutes = 15): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your Spark is still here',
      body: 'No rush. The tiny version still counts.',
      data: { sparkNotificationType: 'habit', habitId },
      categoryIdentifier: HABIT_CATEGORY,
      sound: false
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: minutes * 60,
      channelId: 'gentle-reminders'
    }
  });
}
