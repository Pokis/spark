import { describe, expect, it } from 'vitest';
import {
  buildTodayPlan,
  isHabitDue,
  localDateKey,
  rewardSummary,
  rhythmForHabit,
  supportiveInsights,
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

  it('never lets available time override a low-capacity ceiling', () => {
    const plan = buildTodayPlan({
      habits: [habit],
      completions: [],
      now: new Date('2026-07-16T10:00:00Z'),
      timeZone: 'UTC',
      capacity: 'empty',
      availableMinutes: 60,
    });
    expect(plan[0]?.variant.kind).toBe('tiny');
  });

  it('uses elapsed calendar days for comeback recommendation scoring', () => {
    const oldCompletion: Completion = {
      id: 'old',
      habitId: habit.id,
      variantId: 'tiny',
      variantKind: 'tiny',
      reward: 1,
      occurredAt: '2026-07-01T10:00:00.000Z',
      loggedAt: '2026-07-01T10:00:00.000Z',
      localDate: '2026-07-01',
      source: 'today',
    };
    const plan = buildTodayPlan({
      habits: [habit],
      completions: [oldCompletion],
      now: new Date('2026-07-16T10:00:00Z'),
      timeZone: 'UTC',
      capacity: 'steady',
    });
    expect(plan[0]?.explanation).toBe('Ready for a gentle comeback');
    expect(plan[0]?.score).toBeGreaterThan(habit.priority * 20);
  });

  it('excludes only actual pause intervals from rhythm opportunities', () => {
    const paused: Habit = {
      ...habit,
      pausedAt: '2026-07-14',
      pausedUntil: '2026-07-15',
      pauseHistory: [{ startedOn: '2026-07-10', endedOn: '2026-07-11' }],
    };
    expect(
      rhythmForHabit(paused, [], new Date('2026-07-16T12:00:00Z'), 'UTC', 7)
        .opportunities,
    ).toBe(3);
  });

  it('detects a comeback from distinct days when several wins share a day', () => {
    const completions: Completion[] = [
      ['a', '2026-07-10'],
      ['b', '2026-07-10'],
      ['c', '2026-07-16'],
    ].map(([id, date]) => ({
      id: id!,
      habitId: habit.id,
      variantId: 'tiny',
      variantKind: 'tiny',
      reward: 1,
      occurredAt: `${date}T10:00:00.000Z`,
      loggedAt: `${date}T10:00:00.000Z`,
      localDate: date!,
      source: 'today',
    }));
    expect(
      rhythmForHabit(habit, completions, new Date('2026-07-16T12:00:00Z'), 'UTC')
        .comeback,
    ).toBe(true);
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

  it('derives supportive observations locally without grading blank days', () => {
    const completions: Completion[] = ['2026-07-14', '2026-07-15', '2026-07-16'].map(
      (date, index) => ({
        id: `tiny-${index}`,
        habitId: habit.id,
        variantId: 'tiny',
        variantKind: 'tiny',
        reward: 1,
        occurredAt: `${date}T10:00:00.000Z`,
        loggedAt: `${date}T10:00:00.000Z`,
        localDate: date,
        source: 'today',
        context: 'work',
      }),
    );
    const insights = supportiveInsights({
      habits: [habit],
      completions,
      focusSessions: [],
      now: new Date('2026-07-16T12:00:00Z'),
      timeZone: 'UTC',
    });
    expect(insights.map((item) => item.kind)).toEqual(
      expect.arrayContaining(['habit-size', 'context']),
    );
    expect(insights.every((item) => !item.body.toLowerCase().includes('missed'))).toBe(true);
  });

  it('keeps logical dates stable across the spring DST transition', () => {
    expect(localDateKey(new Date('2026-03-08T06:59:00Z'), 'America/New_York')).toBe(
      '2026-03-08',
    );
    expect(localDateKey(new Date('2026-03-08T07:01:00Z'), 'America/New_York')).toBe(
      '2026-03-08',
    );
  });
});
