import type { WeeklyPlan } from '../data/models';
import {
  currentWeeklyPlan,
  mondayKey,
  weeklyPlanAppliesTomorrow
} from './weeklyPlanning';

const plan: WeeklyPlan = {
  id: 'week',
  weekStart: '2026-07-13',
  selectedHabitIds: ['habit'],
  reflection: '',
  tomorrowContext: 'home',
  tomorrowTinyHabitId: 'habit',
  createdAt: '2026-07-16T10:00:00.000Z'
};

describe('weekly planning', () => {
  it('finds Monday for every part of a week', () => {
    expect(mondayKey(new Date('2026-07-13T12:00:00.000Z'), 'UTC')).toBe(
      '2026-07-13'
    );
    expect(mondayKey(new Date('2026-07-19T12:00:00.000Z'), 'UTC')).toBe(
      '2026-07-13'
    );
  });

  it('selects only a plan whose seven-day window contains today', () => {
    expect(currentWeeklyPlan([plan], '2026-07-19')?.id).toBe('week');
    expect(currentWeeklyPlan([plan], '2026-07-20')).toBeUndefined();
  });

  it('applies tomorrow context only on the next logical local day', () => {
    expect(weeklyPlanAppliesTomorrow(plan, '2026-07-17', 'UTC')).toBe(true);
    expect(weeklyPlanAppliesTomorrow(plan, '2026-07-18', 'UTC')).toBe(false);
    expect(weeklyPlanAppliesTomorrow(undefined, '2026-07-17', 'UTC')).toBe(
      false
    );
  });
});
