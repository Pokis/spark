import type { Habit } from '@spark/domain';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const HABIT_CATEGORY = 'spark-habit';
export const ACTION_TINY = 'spark-tiny';
export const ACTION_SNOOZE = 'spark-snooze';

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
      buttonTitle: 'Tiny version',
      options: { opensAppToForeground: true }
    },
    {
      identifier: ACTION_SNOOZE,
      buttonTitle: 'Later',
      options: { opensAppToForeground: false }
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

function parsePreferredTime(value?: string): { hour: number; minute: number } {
  const [hour, minute] = (value || '09:00').split(':').map(Number);
  return {
    hour: Number.isFinite(hour) ? hour : 9,
    minute: Number.isFinite(minute) ? minute : 0
  };
}

async function scheduleHabit(habit: Habit): Promise<void> {
  const { hour, minute } = parsePreferredTime(habit.preferredTime);
  const content: Notifications.NotificationContentInput = {
    title: `${habit.icon} A small Spark?`,
    body: habit.variants.find((variant) => variant.kind === 'tiny')?.label ?? habit.title,
    data: { habitId: habit.id },
    categoryIdentifier: HABIT_CATEGORY,
    sound: false
  };

  if (habit.schedule.type === 'weekdays') {
    for (const day of habit.schedule.days) {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day === 0 ? 1 : day + 1,
          hour,
          minute,
          channelId: 'gentle-reminders'
        }
      });
    }
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'gentle-reminders'
    }
  });
}

export async function rescheduleHabitNotifications(
  habits: Habit[],
  enabled: boolean,
  cap: number
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled || cap <= 0) return;
  await configureNotifications();
  const candidates = habits
    .filter((habit) => habit.reminderEnabled && !habit.archivedAt && !habit.pausedUntil)
    .sort((a, b) => b.priority - a.priority || a.sortOrder - b.sortOrder)
    .slice(0, cap);
  for (const habit of candidates) await scheduleHabit(habit);
}

export async function snoozeHabit(habitId: string, minutes = 15): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your Spark is still here',
      body: 'No rush. The tiny version still counts.',
      data: { habitId },
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
