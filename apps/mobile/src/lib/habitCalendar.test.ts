import type { Completion, Habit } from '@spark/domain';
import {
  habitDayStatus,
  monthCalendarDays,
  monthTitle,
  shiftMonth,
  weekCalendarDays
} from './habitCalendar';

const habit: Habit = {
  id: 'vitamins',
  title: 'Take vitamins',
  color: '#FFC857',
  icon: '💊',
  variants: [{ id: 'done', kind: 'standard', label: 'Take vitamins', targetMinutes: 1, reward: 1 }],
  schedule: { type: 'weekdays', days: [1, 3, 5] },
  reminderEnabled: false,
  priority: 1,
  contexts: ['anywhere'],
  createdAt: '2026-07-01T00:00:00.000Z',
  sortOrder: 0
};

describe('habit calendar', () => {
  it('builds stable Monday-first month and week grids', () => {
    const month = monthCalendarDays('2026-07');
    expect(month).toHaveLength(42);
    expect(month[0]?.dateKey).toBe('2026-06-29');
    expect(month[41]?.dateKey).toBe('2026-08-09');
    expect(weekCalendarDays('2026-07-16').map((day) => day.dateKey)).toEqual([
      '2026-07-13', '2026-07-14', '2026-07-15', '2026-07-16',
      '2026-07-17', '2026-07-18', '2026-07-19'
    ]);
  });

  it('moves between calendar months and formats a title', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(monthTitle('2026-07', 'en')).toBe('July 2026');
  });

  it('shows completions, scheduled days, and flexible schedules without a missed state', () => {
    const completion = { habitId: 'vitamins', localDate: '2026-07-15' } as Completion;
    expect(habitDayStatus(habit, '2026-07-15', [completion])).toBe('completed');
    expect(habitDayStatus(habit, '2026-07-17', [])).toBe('scheduled');
    expect(habitDayStatus(habit, '2026-07-16', [])).toBe('none');
    expect(habitDayStatus({ ...habit, schedule: { type: 'timesPerWeek', count: 2 } }, '2026-07-16', [])).toBe('flexible');
    expect(habitDayStatus(habit, '2026-06-30', [], false)).toBe('outside');
  });

  it('marks a completion-shifted next date from the latest completion', () => {
    const rolling: Habit = {
      ...habit,
      schedule: { type: 'afterCompletion', everyDays: 3, anchorDate: '2026-07-01' }
    };
    const completions = [{ habitId: 'vitamins', localDate: '2026-07-12' }] as Completion[];
    expect(habitDayStatus(rolling, '2026-07-15', completions)).toBe('scheduled');
    expect(habitDayStatus(rolling, '2026-07-14', completions)).toBe('none');
  });
});
