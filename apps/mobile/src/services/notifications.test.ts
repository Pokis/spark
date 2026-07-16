import type { Completion, Habit } from '@spark/domain';
import {
  nextReminderDates,
  notificationActionKind,
  parsePreferredTime,
  planHabitNotifications
} from './notifications';

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
  it('validates preferred times strictly', () => {
    expect(parsePreferredTime('09:30')).toEqual({ hour: 9, minute: 30 });
    expect(parsePreferredTime('99:99')).toBeNull();
    expect(parsePreferredTime('9:30')).toBeNull();
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

  it('maps every gentle notification action without ambiguous side effects', () => {
    expect(notificationActionKind('spark-tiny')).toBe('log_tiny');
    expect(notificationActionKind('spark-snooze')).toBe('snooze');
    expect(notificationActionKind('spark-quiet-today')).toBe('quiet_today');
    expect(notificationActionKind('expo.modules.notifications.actions.DEFAULT')).toBe('open');
  });
});
