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
  return Boolean(
    habit.pausedAt &&
      habit.pausedUntil &&
      habit.pausedAt <= today &&
      habit.pausedUntil >= today,
  );
}

export function isDatePaused(habit: Habit, dateKey: string): boolean {
  if (
    habit.pausedAt &&
    habit.pausedUntil &&
    habit.pausedAt <= dateKey &&
    dateKey <= habit.pausedUntil
  ) {
    return true;
  }
  return Boolean(
    habit.pauseHistory?.some(
      (interval) => interval.startedOn <= dateKey && dateKey <= interval.endedOn,
    ),
  );
}

export function isHabitScheduledOn(
  habit: Habit,
  dateKey: string,
  weekday: number,
): boolean {
  if (habit.archivedAt || isDatePaused(habit, dateKey)) return false;
  switch (habit.schedule.type) {
    case 'daily':
    case 'anytime':
    case 'timesPerWeek':
      return true;
    case 'weekdays':
      return habit.schedule.days.includes(weekday);
    case 'interval': {
      const difference = calendarDayDifference(habit.schedule.anchorDate, dateKey);
      return difference >= 0 && difference % habit.schedule.everyDays === 0;
    }
  }
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
    const activeDays = recentDateKeys(now, timeZone, windowDays).filter(
      (dateKey) => !isDatePaused(habit, dateKey),
    ).length;
    return Math.ceil((activeDays / 7) * habit.schedule.count);
  }

  const days = recentDateKeys(now, timeZone, windowDays);
  return days.filter((dateKey) => {
    const date = new Date(`${dateKey}T12:00:00Z`);
    return isHabitScheduledOn(habit, dateKey, date.getUTCDay());
  }).length;
}
