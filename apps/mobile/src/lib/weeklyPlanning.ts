import { addCalendarDays, localDateKey } from '@spark/domain';
import type { WeeklyPlan } from '../data/models';

export function mondayKey(now: Date, timeZone: string): string {
  const local = new Date(`${localDateKey(now, timeZone)}T12:00:00`);
  const offset = (local.getDay() + 6) % 7;
  local.setDate(local.getDate() - offset);
  return localDateKey(local, timeZone);
}

export function currentWeeklyPlan(
  plans: WeeklyPlan[],
  today: string
): WeeklyPlan | undefined {
  return plans.find(
    (plan) =>
      plan.weekStart <= today && addCalendarDays(plan.weekStart, 6) >= today
  );
}

export function weeklyPlanAppliesTomorrow(
  plan: WeeklyPlan | undefined,
  today: string,
  timeZone: string
): boolean {
  if (!plan) return false;
  const createdOn = localDateKey(new Date(plan.createdAt), timeZone);
  return addCalendarDays(createdOn, 1) === today;
}
