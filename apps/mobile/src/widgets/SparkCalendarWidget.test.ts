import type { Completion, Habit } from '@spark/domain';
import { buildCalendarWidgetSnapshot } from './SparkCalendarWidget';

const habit: Habit = {
  id: 'vitamins', title: 'Take vitamins', color: '#FFC857', icon: '💊',
  variants: [{ id: 'done', kind: 'standard', label: 'Take vitamins', targetMinutes: 1, reward: 1 }],
  schedule: { type: 'daily' }, reminderEnabled: false, priority: 1,
  contexts: ['anywhere'], createdAt: '2026-07-01T00:00:00.000Z', sortOrder: 0
};

describe('calendar widget snapshot', () => {
  it('keeps two active habits and a 42-day month grid', () => {
    const completion = { habitId: 'vitamins', localDate: '2026-07-16' } as Completion;
    const snapshot = buildCalendarWidgetSnapshot({
      habits: [habit, { ...habit, id: 'second', title: 'Stretch', sortOrder: 1 }, { ...habit, id: 'third', sortOrder: 2 }],
      completions: [completion],
      today: '2026-07-16',
      locale: 'en'
    });
    expect(snapshot.title).toBe('July 2026');
    expect(snapshot.habits).toHaveLength(2);
    expect(snapshot.habits[0]?.days).toHaveLength(42);
    expect(snapshot.habits[0]?.days).toContain('completed');
  });
});
