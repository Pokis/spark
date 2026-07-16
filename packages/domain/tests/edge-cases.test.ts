import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  buildTodayPlan,
  calendarDayDifference,
  countOpportunities,
  isDatePaused,
  isHabitDue,
  isHabitPaused,
  isHabitScheduledOn,
  localWeekday,
  recentDateKeys,
  rewardForVariant,
  rewardSummaryFromTotal,
  supportiveInsights,
  type Completion,
  type FocusSession,
  type Habit
} from '../src';

const habit: Habit = {
  id: 'habit',
  title: 'Read',
  color: '#fff',
  icon: '📚',
  variants: [
    { id: 'tiny', kind: 'tiny', label: 'One line', targetMinutes: 1, reward: 1 },
    {
      id: 'standard',
      kind: 'standard',
      label: 'Five pages',
      targetMinutes: 10,
      reward: 2
    },
    {
      id: 'stretch',
      kind: 'stretch',
      label: 'Chapter',
      targetMinutes: 30,
      reward: 3
    }
  ],
  schedule: { type: 'daily' },
  reminderEnabled: false,
  priority: 1,
  contexts: ['home'],
  createdAt: '2026-07-01T00:00:00.000Z',
  sortOrder: 0
};

function completion(
  id: string,
  date: string,
  overrides: Partial<Completion> = {}
): Completion {
  return {
    id,
    habitId: 'habit',
    variantId: 'tiny',
    variantKind: 'tiny',
    reward: 1,
    occurredAt: `${date}T12:00:00.000Z`,
    loggedAt: `${date}T12:00:00.000Z`,
    localDate: date,
    source: 'today',
    ...overrides
  };
}

describe('domain edge cases', () => {
  it('handles pause boundaries and every schedule kind', () => {
    const paused = {
      ...habit,
      pausedAt: '2026-07-15',
      pausedUntil: '2026-07-16',
      pauseHistory: [{ startedOn: '2026-07-10', endedOn: '2026-07-11' }]
    };
    expect(isHabitPaused(paused, '2026-07-15')).toBe(true);
    expect(isHabitPaused(paused, '2026-07-17')).toBe(false);
    expect(isDatePaused(paused, '2026-07-10')).toBe(true);
    expect(isDatePaused(paused, '2026-07-12')).toBe(false);
    expect(
      isHabitScheduledOn({ ...habit, schedule: { type: 'anytime' } }, '2026-07-16', 4)
    ).toBe(true);
    expect(
      isHabitScheduledOn(
        { ...habit, schedule: { type: 'weekdays', days: [1, 3] } },
        '2026-07-15',
        3
      )
    ).toBe(true);
    expect(
      isHabitScheduledOn(
        {
          ...habit,
          schedule: { type: 'interval', everyDays: 3, anchorDate: '2026-07-10' }
        },
        '2026-07-16',
        4
      )
    ).toBe(true);
    expect(
      isHabitScheduledOn(
        {
          ...habit,
          schedule: { type: 'interval', everyDays: 3, anchorDate: '2026-07-10' }
        },
        '2026-07-09',
        4
      )
    ).toBe(false);
    expect(
      isHabitScheduledOn(
        { ...habit, archivedAt: '2026-07-01T00:00:00.000Z' },
        '2026-07-16',
        4
      )
    ).toBe(false);
  });

  it('calculates due state for weekly frequency, intervals, weekdays, and anytime', () => {
    const now = new Date('2026-07-16T12:00:00.000Z');
    expect(
      isHabitDue(
        { ...habit, schedule: { type: 'timesPerWeek', count: 2 } },
        {
          now,
          timeZone: 'UTC',
          completions: [completion('one', '2026-07-14')]
        }
      )
    ).toBe(true);
    expect(
      isHabitDue(
        { ...habit, schedule: { type: 'timesPerWeek', count: 2 } },
        {
          now,
          timeZone: 'UTC',
          completions: [
            completion('one', '2026-07-14'),
            completion('two', '2026-07-15')
          ]
        }
      )
    ).toBe(false);
    expect(
      isHabitDue(
        {
          ...habit,
          schedule: { type: 'interval', everyDays: 2, anchorDate: '2026-07-15' }
        },
        { now, timeZone: 'UTC', completions: [] }
      )
    ).toBe(false);
    expect(
      isHabitDue(
        { ...habit, schedule: { type: 'weekdays', days: [4] } },
        { now, timeZone: 'UTC', completions: [] }
      )
    ).toBe(true);
    expect(
      isHabitDue(
        { ...habit, schedule: { type: 'anytime' } },
        { now, timeZone: 'UTC', completions: [] }
      )
    ).toBe(true);
  });

  it('scales opportunity counts across paused weekly and fixed schedules', () => {
    expect(
      countOpportunities(
        {
          ...habit,
          schedule: { type: 'timesPerWeek', count: 3 },
          pauseHistory: [{ startedOn: '2026-07-14', endedOn: '2026-07-15' }]
        },
        new Date('2026-07-16T12:00:00.000Z'),
        'UTC',
        7
      )
    ).toBe(3);
    expect(
      countOpportunities(
        { ...habit, schedule: { type: 'weekdays', days: [1, 3, 5] } },
        new Date('2026-07-16T12:00:00.000Z'),
        'UTC',
        7
      )
    ).toBe(3);
  });

  it('selects variants by capacity/time and uses deterministic tie ordering', () => {
    const second = { ...habit, id: 'second', sortOrder: 2 };
    const first = { ...habit, id: 'first', sortOrder: 1 };
    expect(
      buildTodayPlan({
        habits: [second, first],
        completions: [],
        now: new Date('2026-07-16T12:00:00.000Z'),
        timeZone: 'UTC',
        capacity: 'ready',
        availableMinutes: 12,
        context: 'home',
        limit: 1
      })[0]
    ).toMatchObject({
      habit: { id: 'first' },
      variant: { kind: 'standard' },
      explanation: 'Fits home'
    });
    expect(
      buildTodayPlan({
        habits: [{ ...habit, variants: [] }],
        completions: [],
        now: new Date('2026-07-16T12:00:00.000Z'),
        timeZone: 'UTC',
        capacity: 'steady'
      })[0]?.variant.label
    ).toBe('Read');
  });

  it('derives a useful focus-duration observation only with enough evidence', () => {
    const sessions: FocusSession[] = [
      [5, true],
      [5, true],
      [25, true],
      [25, false]
    ].map(([minutes, completed], index) => ({
      id: `focus-${index}`,
      title: 'Work',
      plannedSeconds: Number(minutes) * 60,
      startedAt: `2026-07-1${index}T10:00:00.000Z`,
      endedAt: `2026-07-1${index}T10:05:00.000Z`,
      pausedAt: null,
      pausedSeconds: 0,
      completed: Boolean(completed),
      interruptionCount: 0
    }));
    const insight = supportiveInsights({
      habits: [],
      completions: [],
      focusSessions: sessions,
      now: new Date('2026-07-16T12:00:00.000Z'),
      timeZone: 'UTC'
    });
    expect(insight[0]).toMatchObject({
      id: 'focus-5',
      kind: 'focus'
    });
  });

  it('keeps time and reward helpers stable at boundaries', () => {
    expect(addCalendarDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(calendarDayDifference('2026-03-01', '2026-02-28')).toBe(-1);
    expect(recentDateKeys(new Date('2026-07-16T12:00:00.000Z'), 'UTC', 3)).toEqual(
      ['2026-07-14', '2026-07-15', '2026-07-16']
    );
    expect(localWeekday(new Date('2026-07-16T12:00:00.000Z'), 'UTC')).toBe(4);
    expect(rewardForVariant('tiny')).toBe(1);
    expect(rewardForVariant('standard')).toBe(2);
    expect(rewardForVariant('stretch')).toBe(3);
    expect(rewardSummaryFromTotal(0)).toMatchObject({
      level: 1,
      levelProgress: 0,
      nextLevelAt: 10
    });
    expect(rewardSummaryFromTotal(40)).toMatchObject({
      level: 3,
      levelProgress: 0,
      nextLevelAt: 90
    });
  });
});
