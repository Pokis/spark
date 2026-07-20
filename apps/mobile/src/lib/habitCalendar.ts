import {
  addCalendarDays,
  isDatePaused,
  isHabitScheduledOn,
  nextHabitDueDate,
  type Completion,
  type Habit
} from '@spark/domain';

export type HabitDayStatus = 'outside' | 'completed' | 'scheduled' | 'flexible' | 'none';

export interface CalendarDay {
  dateKey: string;
  day: number;
  inMonth: boolean;
}

function utcDate(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00.000Z`);
}

export function monthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year!, monthNumber! - 1 + amount, 1));
  return date.toISOString().slice(0, 7);
}

export function monthTitle(month: string, locale = 'en'): string {
  return new Date(`${month}-01T12:00:00.000Z`).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export function monthCalendarDays(month: string, weekStartsOn = 1): CalendarDay[] {
  const first = `${month}-01`;
  const firstWeekday = utcDate(first).getUTCDay();
  const leading = (firstWeekday - weekStartsOn + 7) % 7;
  const start = addCalendarDays(first, -leading);
  return Array.from({ length: 42 }, (_, index) => {
    const dateKey = addCalendarDays(start, index);
    return {
      dateKey,
      day: Number(dateKey.slice(8, 10)),
      inMonth: dateKey.startsWith(month)
    };
  });
}

export function weekCalendarDays(dateKey: string, weekStartsOn = 1): CalendarDay[] {
  const weekday = utcDate(dateKey).getUTCDay();
  const leading = (weekday - weekStartsOn + 7) % 7;
  const start = addCalendarDays(dateKey, -leading);
  return Array.from({ length: 7 }, (_, index) => {
    const item = addCalendarDays(start, index);
    return { dateKey: item, day: Number(item.slice(8, 10)), inMonth: true };
  });
}

export function habitDayStatus(
  habit: Habit,
  dateKey: string,
  completions: Array<Pick<Completion, 'habitId' | 'localDate'>>,
  inRange = true
): HabitDayStatus {
  if (!inRange) return 'outside';
  if (completions.some((completion) => completion.habitId === habit.id && completion.localDate === dateKey)) {
    return 'completed';
  }
  if (isDatePaused(habit, dateKey)) return 'none';
  if (habit.schedule.type === 'timesPerWeek' || habit.schedule.type === 'anytime') {
    return 'flexible';
  }
  if (habit.schedule.type === 'afterCompletion') {
    return nextHabitDueDate(habit, completions as Completion[], dateKey) === dateKey
      ? 'scheduled'
      : 'none';
  }
  return isHabitScheduledOn(habit, dateKey, utcDate(dateKey).getUTCDay(), completions as Completion[])
    ? 'scheduled'
    : 'none';
}
