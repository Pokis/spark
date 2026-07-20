import type { Completion, Habit } from './types';
import {
  addCalendarDays,
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

function habitCompletionDates(habit: Habit, completions: Completion[], through?: string): string[] {
  return [
    ...new Set(
      completions
        .filter(
          (completion) =>
            completion.habitId === habit.id &&
            (!through || completion.localDate <= through),
        )
        .map((completion) => completion.localDate),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

/** The next date for a completion-shifted schedule. A later completion moves this date. */
export function nextHabitDueDate(
  habit: Habit,
  completions: Completion[],
  through?: string,
): string | null {
  if (habit.schedule.type !== 'afterCompletion') return null;
  const completedDates = habitCompletionDates(habit, completions, through);
  const latest = completedDates.at(-1);
  return latest
    ? addCalendarDays(latest, habit.schedule.everyDays)
    : habit.schedule.anchorDate;
}

export function scheduleLabel(schedule: Habit['schedule']): string {
  switch (schedule.type) {
    case 'daily':
      return 'Every day';
    case 'weekdays': {
      const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return schedule.days.length === 7
        ? 'Every day'
        : schedule.days.map((day) => labels[day]).filter(Boolean).join(', ');
    }
    case 'timesPerWeek':
      return `${schedule.count} ${schedule.count === 1 ? 'time' : 'times'} each week`;
    case 'interval':
      return `Every ${schedule.everyDays} ${schedule.everyDays === 1 ? 'day' : 'days'} on the calendar`;
    case 'afterCompletion':
      return `${schedule.everyDays} ${schedule.everyDays === 1 ? 'day' : 'days'} after completion`;
    case 'anytime':
      return 'Whenever you want';
  }
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
  completions: Completion[] = [],
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
    case 'afterCompletion':
      return nextHabitDueDate(habit, completions, dateKey) === dateKey;
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
    case 'afterCompletion': {
      const nextDue = nextHabitDueDate(habit, context.completions, today);
      return Boolean(nextDue && today >= nextDue);
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
  completions: Completion[] = [],
): number {
  if (habit.schedule.type === 'timesPerWeek') {
    const activeDays = recentDateKeys(now, timeZone, windowDays).filter(
      (dateKey) => !isDatePaused(habit, dateKey),
    ).length;
    return Math.ceil((activeDays / 7) * habit.schedule.count);
  }

  if (habit.schedule.type === 'afterCompletion') {
    const days = recentDateKeys(now, timeZone, windowDays);
    const completedDays = new Set(
      completions
        .filter(
          (completion) =>
            completion.habitId === habit.id && days.includes(completion.localDate),
        )
        .map((completion) => completion.localDate),
    ).size;
    return completedDays + (isHabitDue(habit, { now, timeZone, completions }) ? 1 : 0);
  }

  const days = recentDateKeys(now, timeZone, windowDays);
  return days.filter((dateKey) => {
    const date = new Date(`${dateKey}T12:00:00Z`);
    return isHabitScheduledOn(habit, dateKey, date.getUTCDay(), completions);
  }).length;
}
