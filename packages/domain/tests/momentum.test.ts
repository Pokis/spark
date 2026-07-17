import { describe, expect, it } from 'vitest';
import {
  momentumForHabit,
  momentumMilestone,
  momentumWindowStart,
  type Completion,
  type Habit,
} from '../src';

const habit: Habit = {
  id: 'read',
  title: 'Read',
  color: '#8367E8',
  icon: '📚',
  variants: [{ id: 'tiny', kind: 'tiny', label: 'One line', targetMinutes: 1, reward: 1 }],
  schedule: { type: 'daily' },
  reminderEnabled: false,
  priority: 1,
  contexts: ['home'],
  createdAt: '2026-07-01T00:00:00.000Z',
  sortOrder: 0,
  momentum: {
    enabled: true,
    cadence: 'daily',
    anchorDate: '2026-07-10',
    protections: [],
  },
};

function win(date: string, id = date): Completion {
  return {
    id,
    habitId: habit.id,
    variantId: 'tiny',
    variantKind: 'tiny',
    reward: 1,
    occurredAt: `${date}T10:00:00.000Z`,
    loggedAt: `${date}T10:00:00.000Z`,
    localDate: date,
    source: 'today',
  };
}

describe('optional Momentum streaks', () => {
  it('stays absent unless a habit deliberately opts in', () => {
    expect(
      momentumForHabit(
        { ...habit, momentum: { ...habit.momentum!, enabled: false } },
        [],
        new Date('2026-07-12T12:00:00Z'),
        'UTC',
      ),
    ).toBeNull();
  });

  it('waits neutrally for a future start and recognizes protected current rest', () => {
    const future: Habit = {
      ...habit,
      momentum: { ...habit.momentum!, anchorDate: '2026-07-20' },
    };
    expect(
      momentumForHabit(future, [], new Date('2026-07-18T12:00:00Z'), 'UTC'),
    ).toMatchObject({
      status: 'not-started',
      activeWindowStart: '2026-07-20',
      nextWindowStart: '2026-07-20',
    });

    const resting: Habit = {
      ...habit,
      momentum: {
        ...habit.momentum!,
        protections: [{ windowStart: '2026-07-10', kind: 'delay' }],
      },
    };
    expect(
      momentumForHabit(resting, [], new Date('2026-07-10T12:00:00Z'), 'UTC'),
    ).toMatchObject({ status: 'resting', current: 0, nextWindowStart: '2026-07-11' });
  });
  it('counts completed daily windows and leaves the open day gently due', () => {
    const result = momentumForHabit(
      habit,
      [win('2026-07-10'), win('2026-07-11')],
      new Date('2026-07-12T12:00:00Z'),
      'UTC',
    );
    expect(result).toMatchObject({
      current: 2,
      best: 2,
      completedWindows: 2,
      status: 'due',
      mostRecentMissedWindow: undefined,
    });
  });

  it('uses one win anywhere in each forgiving two-day window', () => {
    const everyOtherDay = {
      ...habit,
      momentum: { ...habit.momentum!, cadence: 'everyOtherDay' as const },
    };
    expect(momentumWindowStart(everyOtherDay.momentum, '2026-07-13')).toBe('2026-07-12');
    expect(
      momentumForHabit(
        everyOtherDay,
        [win('2026-07-11'), win('2026-07-13')],
        new Date('2026-07-13T12:00:00Z'),
        'UTC',
      ),
    ).toMatchObject({ current: 2, best: 2, cadenceDays: 2, status: 'on-track' });
  });

  it('never inflates a streak with several completions in one window', () => {
    const result = momentumForHabit(
      habit,
      [win('2026-07-10', 'a'), win('2026-07-10', 'b')],
      new Date('2026-07-10T12:00:00Z'),
      'UTC',
    );
    expect(result).toMatchObject({ current: 1, completedWindows: 1 });
  });

  it('preserves the personal best after a gap and starts a neutral comeback', () => {
    const result = momentumForHabit(
      habit,
      [win('2026-07-10'), win('2026-07-11'), win('2026-07-13')],
      new Date('2026-07-13T12:00:00Z'),
      'UTC',
    );
    expect(result).toMatchObject({
      current: 1,
      best: 2,
      mostRecentMissedWindow: '2026-07-12',
      status: 'on-track',
    });
  });

  it('lets a Flex pass restore continuity without adding a fake win', () => {
    const protectedHabit: Habit = {
      ...habit,
      momentum: {
        ...habit.momentum!,
        protections: [{ windowStart: '2026-07-12', kind: 'flex' }],
      },
    };
    const result = momentumForHabit(
      protectedHabit,
      [win('2026-07-10'), win('2026-07-11'), win('2026-07-13')],
      new Date('2026-07-13T12:00:00Z'),
      'UTC',
    );
    expect(result).toMatchObject({
      current: 3,
      best: 3,
      completedWindows: 3,
      protectedWindows: 1,
      usedFlexPasses: 1,
      flexPassesAvailable: 1,
      mostRecentMissedWindow: undefined,
    });
  });

  it('treats a planned delay and an intentional pause as neutral bridges', () => {
    const delayed: Habit = {
      ...habit,
      pausedAt: '2026-07-12',
      pausedUntil: '2026-07-12',
      momentum: {
        ...habit.momentum!,
        protections: [{ windowStart: '2026-07-11', kind: 'delay' }],
      },
    };
    expect(
      momentumForHabit(
        delayed,
        [win('2026-07-10'), win('2026-07-13')],
        new Date('2026-07-13T12:00:00Z'),
        'UTC',
      ),
    ).toMatchObject({ current: 2, protectedWindows: 2, usedFlexPasses: 0 });
  });

  it('starts with two passes, earns one every five wins, and holds at most three', () => {
    const completions = Array.from({ length: 10 }, (_, index) =>
      win(`2026-07-${String(index + 10).padStart(2, '0')}`),
    );
    expect(
      momentumForHabit(habit, completions, new Date('2026-07-19T12:00:00Z'), 'UTC'),
    ).toMatchObject({ flexPassesAvailable: 3, completedWindows: 10 });
  });

  it('recognizes milestones without granting opaque points', () => {
    expect(momentumMilestone(2)).toBeNull();
    expect(momentumMilestone(3)).toBe('3-win beginning');
    expect(momentumMilestone(7)).toBe('7-win rhythm');
    expect(momentumMilestone(14)).toBe('14-win rhythm');
    expect(momentumMilestone(30)).toBe('30-win orbit');
    expect(momentumMilestone(60)).toBe('60-win glow');
    expect(momentumMilestone(100)).toBe('100-win constellation');
  });
});
