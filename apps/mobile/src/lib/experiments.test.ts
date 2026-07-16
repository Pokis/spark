import type { Completion, Habit } from '@spark/domain';
import {
  activeExperimentForHabit,
  compareExperiment,
  habitsWithExperimentReminders
} from './experiments';
import type { PersonalExperiment } from '../data/models';

const habit: Habit = {
  id: 'habit',
  title: 'Read',
  color: '#fff',
  icon: '📚',
  variants: [
    { id: 'tiny', kind: 'tiny', label: 'One line', targetMinutes: 1, reward: 1 }
  ],
  schedule: { type: 'daily' },
  reminderEnabled: false,
  priority: 1,
  contexts: ['anywhere'],
  createdAt: '2026-07-01T00:00:00.000Z',
  sortOrder: 0
};

const experiment: PersonalExperiment = {
  id: 'experiment',
  kind: 'afternoon_reminder',
  habitId: habit.id,
  startedAt: '2026-07-08T00:00:00.000Z',
  endsAt: '2026-07-15T00:00:00.000Z',
  status: 'active',
  baselineStart: '2026-07-01',
  baselineEnd: '2026-07-07',
  note: ''
};

describe('personal experiments', () => {
  it('temporarily applies the afternoon reminder without mutating the habit', () => {
    const [adjusted] = habitsWithExperimentReminders(
      [habit],
      [experiment],
      new Date('2026-07-10T12:00:00.000Z')
    );
    expect(adjusted).toMatchObject({ reminderEnabled: true, reminderWindow: 'afternoon' });
    expect(habit.reminderEnabled).toBe(false);
  });

  it('ignores stopped, future, ended, wrong-kind, and wrong-habit experiments', () => {
    const now = new Date('2026-07-10T12:00:00.000Z');
    expect(activeExperimentForHabit([experiment], 'habit', undefined, now)).toBe(
      experiment
    );
    expect(
      activeExperimentForHabit([experiment], 'other', undefined, now)
    ).toBeUndefined();
    expect(
      activeExperimentForHabit([experiment], 'habit', 'tiny_week', now)
    ).toBeUndefined();
    expect(
      activeExperimentForHabit(
        [{ ...experiment, status: 'stopped' }],
        'habit',
        undefined,
        now
      )
    ).toBeUndefined();
    expect(
      activeExperimentForHabit(
        [{ ...experiment, startedAt: '2026-07-11T00:00:00.000Z' }],
        'habit',
        undefined,
        now
      )
    ).toBeUndefined();
    expect(
      activeExperimentForHabit(
        [{ ...experiment, endsAt: '2026-07-10T12:00:00.000Z' }],
        'habit',
        undefined,
        now
      )
    ).toBeUndefined();
  });

  it('produces a neutral local comparison', () => {
    const completions: Completion[] = [
      {
        id: 'before',
        habitId: 'habit',
        variantId: 'tiny',
        variantKind: 'tiny',
        reward: 1,
        occurredAt: '2026-07-04T13:00:00.000Z',
        loggedAt: '2026-07-04T13:00:00.000Z',
        localDate: '2026-07-04',
        source: 'today'
      },
      {
        id: 'during',
        habitId: 'habit',
        variantId: 'tiny',
        variantKind: 'tiny',
        reward: 1,
        occurredAt: '2026-07-10T14:00:00.000Z',
        loggedAt: '2026-07-10T14:00:00.000Z',
        localDate: '2026-07-10',
        source: 'today'
      }
    ];
    const result = compareExperiment(
      { ...experiment, status: 'complete' },
      completions,
      'UTC'
    );
    expect(result.baselineDays).toBe(1);
    expect(result.summary).toContain('No clear difference');
  });

  it('describes both higher and lower local comparisons without claiming causation', () => {
    const tinyExperiment = {
      ...experiment,
      kind: 'tiny_week' as const,
      status: 'complete' as const
    };
    const during: Completion = {
      id: 'during-tiny',
      habitId: 'habit',
      variantId: 'tiny',
      variantKind: 'tiny',
      reward: 1,
      occurredAt: '2026-07-10T14:00:00.000Z',
      loggedAt: '2026-07-10T14:00:00.000Z',
      localDate: '2026-07-10',
      source: 'today'
    };
    expect(compareExperiment(tinyExperiment, [during], 'UTC').summary).toContain(
      'may have fit better'
    );
    const before = {
      ...during,
      id: 'before-tiny',
      occurredAt: '2026-07-04T14:00:00.000Z',
      loggedAt: '2026-07-04T14:00:00.000Z',
      localDate: '2026-07-04'
    };
    expect(compareExperiment(tinyExperiment, [before], 'UTC').summary).toContain(
      'may not have helped'
    );
  });
});
