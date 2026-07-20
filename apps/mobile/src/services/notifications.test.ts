import type { Completion, Habit } from '@spark/domain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
  configureNotifications,
  isValidPreferredTime,
  nextReminderDates,
  notificationActionKind,
  parsePreferredTime,
  planHabitNotifications,
  requestNotificationPermission,
  rescheduleHabitNotifications,
  snoozeHabit
} from './notifications';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  AndroidNotificationVisibility: {
    PUBLIC: 1,
    PRIVATE: 0,
    SECRET: -1
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
    TIME_INTERVAL: 'timeInterval'
  },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn()
}));

const habit: Habit = {
  id: 'habit',
  title: 'Read',
  color: '#000000',
  icon: '📚',
  variants: [
    { id: 'tiny', kind: 'tiny', label: 'One line', targetMinutes: 1, reward: 1 }
  ],
  schedule: { type: 'interval', everyDays: 2, anchorDate: '2026-07-16' },
  preferredTime: '09:00',
  reminderEnabled: true,
  priority: 2,
  contexts: ['anywhere'],
  createdAt: '2026-07-01T00:00:00.000Z',
  sortOrder: 0
};

describe('notification planning', () => {
  const originalPlatform = Platform.OS;

  beforeEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.clearAllMocks();
    Object.defineProperty(Platform, 'OS', {
      configurable: true,
      value: originalPlatform
    });
    await AsyncStorage.clear();
  });

  it('validates preferred times strictly', () => {
    expect(parsePreferredTime('09:30')).toEqual({ hour: 9, minute: 30 });
    expect(parsePreferredTime('99:99')).toBeNull();
    expect(parsePreferredTime('9:30')).toBeNull();
    expect(parsePreferredTime()).toEqual({ hour: 9, minute: 0 });
    expect(isValidPreferredTime('23:59')).toBe(true);
    expect(isValidPreferredTime('24:00')).toBe(false);
  });

  it('uses exact interval dates and excludes completed occurrences', () => {
    const completion: Completion = {
      id: 'done',
      habitId: habit.id,
      variantId: 'tiny',
      variantKind: 'tiny',
      reward: 1,
      occurredAt: '2026-07-16T08:00:00.000Z',
      loggedAt: '2026-07-16T08:00:00.000Z',
      localDate: '2026-07-16',
      source: 'today'
    };
    expect(
      nextReminderDates(
        habit,
        [completion],
        new Date('2026-07-16T07:00:00.000Z'),
        'UTC',
        6
      )
    ).toEqual(['2026-07-18', '2026-07-20']);
  });

  it('schedules one reminder relative to the latest completion', () => {
    const completion: Completion = {
      id: 'done-late',
      habitId: habit.id,
      variantId: 'tiny',
      variantKind: 'tiny',
      reward: 1,
      occurredAt: '2026-07-17T08:00:00.000Z',
      loggedAt: '2026-07-17T08:00:00.000Z',
      localDate: '2026-07-17',
      source: 'today'
    };
    expect(
      nextReminderDates(
        {
          ...habit,
          schedule: {
            type: 'afterCompletion',
            everyDays: 3,
            anchorDate: '2026-07-10'
          }
        },
        [completion],
        new Date('2026-07-18T07:00:00.000Z'),
        'UTC',
        7
      )
    ).toEqual(['2026-07-20']);
  });

  it('respects current and historical pause intervals', () => {
    expect(
      nextReminderDates(
        {
          ...habit,
          schedule: { type: 'daily' },
          pausedAt: '2026-07-17',
          pausedUntil: '2026-07-18',
          pauseHistory: [{ startedOn: '2026-07-15', endedOn: '2026-07-16' }]
        },
        [],
        new Date('2026-07-16T07:00:00.000Z'),
        'UTC',
        5
      )
    ).toEqual(['2026-07-19', '2026-07-20']);
  });

  it('spreads remaining times-per-week invitations without daily over-scheduling', () => {
    expect(
      nextReminderDates(
        { ...habit, schedule: { type: 'timesPerWeek', count: 3 } },
        [],
        new Date('2026-07-16T07:00:00.000Z'),
        'UTC'
      )
    ).toEqual(['2026-07-16', '2026-07-18', '2026-07-20']);
  });

  it('places reminder windows locally without requiring an exact clock time', () => {
    const planned = planHabitNotifications(
      [{ ...habit, schedule: { type: 'daily' }, reminderWindow: 'evening' }],
      [],
      new Date('2026-07-16T08:00:00'),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      1
    );
    expect(planned[0]?.date.getHours()).toBe(19);
    expect(planned[0]?.date.getMinutes()).toBeGreaterThanOrEqual(0);
  });

  it('maps every notification action without ambiguous side effects', () => {
    expect(notificationActionKind('spark-tiny')).toBe('log_tiny');
    expect(notificationActionKind('spark-snooze')).toBe('snooze');
    expect(notificationActionKind('spark-quiet-today')).toBe('quiet_today');
    expect(notificationActionKind('expo.modules.notifications.actions.DEFAULT')).toBe('open');
  });

  it('configures public, private, secret, and quiet Android channels', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const channel = Notifications.setNotificationChannelAsync as jest.Mock;
    channel.mockResolvedValue(null);
    const category = Notifications.setNotificationCategoryAsync as jest.Mock;
    category.mockResolvedValue(null);
    await configureNotifications();
    expect(channel).toHaveBeenCalledTimes(7);
    expect(channel).toHaveBeenCalledWith(
      'habit-reminders-secret',
      expect.objectContaining({
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.SECRET,
        enableVibrate: true
      })
    );
    expect(channel).toHaveBeenCalledWith(
      'habit-reminders-private-quiet',
      expect.objectContaining({ enableVibrate: false, vibrationPattern: null })
    );
    expect(category).toHaveBeenCalledWith(
      'spark-habit',
      expect.arrayContaining([
        expect.objectContaining({ identifier: 'spark-tiny' }),
        expect.objectContaining({ identifier: 'spark-quiet-today' })
      ])
    );
  });

  it('does not re-request notification permission when it is already granted', async () => {
    (Notifications.setNotificationCategoryAsync as jest.Mock).mockResolvedValue(
      null
    );
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true
    });
    const request = Notifications.requestPermissionsAsync as jest.Mock;
    request.mockResolvedValue({ granted: false });
    await expect(requestNotificationPermission()).resolves.toBe(true);
    expect(request).not.toHaveBeenCalled();
  });

  it('returns the result of a required permission prompt', async () => {
    (Notifications.setNotificationCategoryAsync as jest.Mock).mockResolvedValue(
      null
    );
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: false
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      granted: true
    });
    await expect(requestNotificationPermission()).resolves.toBe(true);
  });

  it('honors caps, priority, archives, invalid times, and past times', () => {
    const planned = planHabitNotifications(
      [
        { ...habit, id: 'low', priority: 1, sortOrder: 0 },
        { ...habit, id: 'high', priority: 3, sortOrder: 1 },
        { ...habit, id: 'archived', archivedAt: '2026-01-01', priority: 3 },
        { ...habit, id: 'invalid', preferredTime: '25:00', priority: 2 }
      ],
      [],
      new Date('2026-07-16T08:59:55'),
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      2
    );
    expect(planned.every((item) => item.habit.id === 'high')).toBe(true);
    expect(planHabitNotifications([habit], [], new Date(), 'UTC', 0)).toEqual([]);
  });

  it('cancels only Spark habit notifications when reminders are disabled', async () => {
    const cancel =
      Notifications.cancelScheduledNotificationAsync as jest.Mock;
    cancel.mockResolvedValue(undefined);
    (
      Notifications.getAllScheduledNotificationsAsync as jest.Mock
    ).mockResolvedValue([
        {
          identifier: 'habit-one',
          content: { data: { sparkNotificationType: 'habit' } }
        },
        {
          identifier: 'focus-one',
          content: { data: { sparkNotificationType: 'focus' } }
        }
      ] as never);
    await AsyncStorage.setItem('spark.reminder.plan.v1', 'saved');
    await rescheduleHabitNotifications([habit], [], false, 4, 'UTC');
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith('habit-one');
    expect(await AsyncStorage.getItem('spark.reminder.plan.v1')).toBeNull();
  });

  it('schedules hidden content on a quiet channel without leaking the habit title', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-16T07:00:00.000Z'));
    (
      Notifications.getAllScheduledNotificationsAsync as jest.Mock
    ).mockResolvedValue([]);
    (Notifications.setNotificationCategoryAsync as jest.Mock).mockResolvedValue(
      null
    );
    const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
    schedule.mockResolvedValue('scheduled');
    await rescheduleHabitNotifications(
      [{ ...habit, schedule: { type: 'daily' } }],
      [],
      true,
      1,
      'UTC',
      false,
      'secret',
      '2026-07-18T00:00:00.000Z'
    );
    expect(schedule).toHaveBeenCalled();
    const first = schedule.mock.calls[0]?.[0] as any;
    expect(first.content.title).toBe('A Spark action is ready');
    expect(first.content.body).toBe('Private reminder');
    expect(JSON.stringify(first.content)).not.toContain('Read');
    expect(first.trigger.channelId).toBe('habit-reminders-secret-quiet');
  });

  it('quietly pauses a repeatedly ignored reminder for three days', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-16T07:00:00.000Z'));
    await AsyncStorage.setItem(
      'spark.reminder.plan.v1',
      JSON.stringify([
        { habitId: 'habit', dateKey: '2026-07-13' },
        { habitId: 'habit', dateKey: '2026-07-14' },
        { habitId: 'habit', dateKey: '2026-07-15' }
      ])
    );
    (
      Notifications.getAllScheduledNotificationsAsync as jest.Mock
    ).mockResolvedValue([]);
    (Notifications.setNotificationCategoryAsync as jest.Mock).mockResolvedValue(
      null
    );
    const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
    schedule.mockResolvedValue('scheduled');
    await rescheduleHabitNotifications(
      [{ ...habit, schedule: { type: 'daily' } }],
      [],
      true,
      1,
      'UTC',
      true
    );
    expect(schedule).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('spark.reminder.quiet.v1')).toContain(
      '2026-07-19'
    );
  });

  it('snoozes with the selected privacy level, duration, and quiet channel', async () => {
    const schedule = Notifications.scheduleNotificationAsync as jest.Mock;
    schedule.mockResolvedValue('snoozed');
    await snoozeHabit('habit', 30, 'private', true);
    expect(schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: 'Habit reminder',
          data: { sparkNotificationType: 'habit', habitId: 'habit' }
        }),
        trigger: expect.objectContaining({
          seconds: 1800,
          channelId: 'habit-reminders-private-quiet'
        })
      })
    );
  });
});
