import { describe, expect, it } from 'vitest';
import {
  buildTodayPlan,
  isHabitDue,
  localDateKey,
  rewardSummary,
  rhythmForHabit,
  type Completion,
  type Habit,
} from '../src';

const habit: Habit = {
  id: 'water',
  title: 'Drink water',
  color: '#20B8B2',
  icon: '💧',
  variants: [
    { id: 'tiny', kind: 'tiny', label: 'Take one sip', targetMinutes: 1, reward: 1 },
    { id: 'standard', kind: 'standard', label: 'Drink a glass', targetMinutes: 3, reward: 2 },
    { id: 'stretch', kind: 'stretch', label: 'Refill bottle', targetMinutes: 5, reward: 3 },
  ],
  schedule: { type: 'daily' },
  reminderEnabled: true,
  priority: 2,
  contexts: ['anywhere'],
  createdAt: '2026-01-01T00:00:00.000Z',
  sortOrder: 0,
};

describe('domain behavior', () => {
  it('uses an IANA timezone for the logical date', () => {
    expect(localDateKey(new Date('2026-01-01T00:30:00Z'), 'America/Los_Angeles')).toBe(
      '2025-12-31',
    );
  });

  it('does not reset progress and only hides a habit after a win today', () => {
    const now = new Date('2026-07-16T10:00:00Z');
    expect(isHabitDue(habit, { now, timeZone: 'UTC', completions: [] })).toBe(true);
    const completion: Completion = {
      id: 'c1',
      habitId: habit.id,
      variantId: 'tiny',
      variantKind: 'tiny',
      reward: 1,
      occurredAt: now.toISOString(),
      loggedAt: now.toISOString(),
      localDate: '2026-07-16',
      source: 'today',
    };
    expect(isHabitDue(habit, { now, timeZone: 'UTC', completions: [completion] })).toBe(false);
  });

  it('prefers a tiny action on an empty-capacity day', () => {
    const plan = buildTodayPlan({
      habits: [habit],
      completions: [],
      now: new Date('2026-07-16T10:00:00Z'),
      timeZone: 'UTC',
      capacity: 'empty',
      availableMinutes: 2,
    });
    expect(plan[0]?.variant.kind).toBe('tiny');
  });

  it('calculates rolling rhythm and rewards without penalties', () => {
    const completions: Completion[] = ['2026-07-14', '2026-07-16'].map((date, index) => ({
      id: `c${index}`,
      habitId: habit.id,
      variantId: 'standard',
      variantKind: 'standard',
      reward: 2,
      occurredAt: `${date}T10:00:00.000Z`,
      loggedAt: `${date}T10:00:00.000Z`,
      localDate: date,
      source: 'today',
    }));
    expect(rhythmForHabit(habit, completions, new Date('2026-07-16T12:00:00Z'), 'UTC').wins).toBe(
      2,
    );
    expect(rewardSummary(completions).totalSparks).toBe(4);
  });
});
