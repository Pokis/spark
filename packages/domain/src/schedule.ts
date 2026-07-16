import type { Completion, Habit } from './types';
import {
  calendarDayDifference,
  localDateKey,
  localWeekday,
  recentDateKeys,
} from './time';

export interface DueContext {
  now: Date;
  timeZone: string;
  completions: Completion[];
}

export function isHabitPaused(habit: Habit, today: string): boolean {
  return Boolean(habit.pausedUntil && habit.pausedUntil >= today);
}

export function isHabitDue(habit: Habit, context: DueContext): boolean {
  const today = localDateKey(context.now, context.timeZone);
  if (habit.archivedAt || isHabitPaused(habit, today)) return false;

  const completedToday = context.completions.some(
    (completion) => completion.habitId === habit.id && completion.localDate === today,
  );
  if (completedToday) return false;

  switch (habit.schedule.type) {
    case 'daily':
      return true;
    case 'weekdays':
      return habit.schedule.days.includes(localWeekday(context.now, context.timeZone));
    case 'timesPerWeek': {
      const currentWindow = recentDateKeys(context.now, context.timeZone, 7);
      const wins = new Set(
        context.completions
          .filter(
            (completion) =>
              completion.habitId === habit.id &&
              currentWindow.includes(completion.localDate),
          )
          .map((completion) => completion.localDate),
      ).size;
      return wins < habit.schedule.count;
    }
    case 'interval': {
      const difference = calendarDayDifference(habit.schedule.anchorDate, today);
      return difference >= 0 && difference % habit.schedule.everyDays === 0;
    }
    case 'anytime':
      return true;
  }
}

export function countOpportunities(
  habit: Habit,
  now: Date,
  timeZone: string,
  windowDays: number,
): number {
  if (habit.schedule.type === 'timesPerWeek') {
    return Math.ceil((windowDays / 7) * habit.schedule.count);
  }
  if (habit.schedule.type === 'anytime') return windowDays;

  const days = recentDateKeys(now, timeZone, windowDays);
  return days.filter((dateKey) => {
    if (habit.pausedUntil && dateKey <= habit.pausedUntil) return false;
    if (habit.schedule.type === 'daily') return true;
    if (habit.schedule.type === 'interval') {
      const difference = calendarDayDifference(habit.schedule.anchorDate, dateKey);
      return difference >= 0 && difference % habit.schedule.everyDays === 0;
    }
    if (habit.schedule.type === 'weekdays') {
      const date = new Date(`${dateKey}T12:00:00Z`);
      return habit.schedule.days.includes(date.getUTCDay());
    }
    return false;
  }).length;
}
