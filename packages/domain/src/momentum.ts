import { isDatePaused } from './schedule';
import { addCalendarDays, calendarDayDifference, localDateKey } from './time';
import type { Completion, Habit, HabitMomentum, MomentumSummary } from './types';

export type MomentumCompletion = Pick<Completion, 'habitId' | 'localDate'>;

export const MOMENTUM_STARTER_FLEX_PASSES = 2;
export const MOMENTUM_FLEX_EARN_EVERY = 5;
export const MOMENTUM_MAX_FLEX_PASSES = 3;

export function momentumCadenceDays(momentum: HabitMomentum): 1 | 2 {
  return momentum.cadence === 'everyOtherDay' ? 2 : 1;
}

export function momentumWindowStart(momentum: HabitMomentum, dateKey: string): string {
  const cadenceDays = momentumCadenceDays(momentum);
  const difference = calendarDayDifference(momentum.anchorDate, dateKey);
  if (difference < 0) return momentum.anchorDate;
  return addCalendarDays(
    momentum.anchorDate,
    Math.floor(difference / cadenceDays) * cadenceDays,
  );
}

function windowDates(windowStart: string, cadenceDays: number): string[] {
  return Array.from({ length: cadenceDays }, (_, index) =>
    addCalendarDays(windowStart, index),
  );
}

export function momentumForHabit(
  habit: Habit,
  completions: MomentumCompletion[],
  now: Date,
  timeZone: string,
): MomentumSummary | null {
  const momentum = habit.momentum;
  if (!momentum?.enabled) return null;

  const cadenceDays = momentumCadenceDays(momentum);
  const today = localDateKey(now, timeZone);
  const difference = calendarDayDifference(momentum.anchorDate, today);
  const activeWindowStart = momentumWindowStart(momentum, today);
  const usedFlexPasses = new Set(
    momentum.protections
      .filter((protection) => protection.kind === 'flex')
      .map((protection) => protection.windowStart),
  ).size;
  const completedDates = new Set(
    completions
      .filter(
        (completion) =>
          completion.habitId === habit.id &&
          completion.localDate >= momentum.anchorDate &&
          completion.localDate <= today,
      )
      .map((completion) => completion.localDate),
  );
  const protectionByWindow = new Map(
    momentum.protections.map((protection) => [protection.windowStart, protection.kind]),
  );

  let current = 0;
  let best = 0;
  let completedWindows = 0;
  let protectedWindows = 0;
  let mostRecentMissedWindow: string | undefined;
  let activeWindowCompleted = false;
  let activeWindowProtected = false;

  if (difference >= 0) {
    const activeWindowIndex = Math.floor(difference / cadenceDays);
    for (let index = 0; index <= activeWindowIndex; index += 1) {
      const windowStart = addCalendarDays(momentum.anchorDate, index * cadenceDays);
      const dates = windowDates(windowStart, cadenceDays);
      const completed = dates.some((date) => completedDates.has(date));
      const explicitlyProtected = protectionByWindow.has(windowStart);
      const paused = dates.some((date) => isDatePaused(habit, date));
      const protectedWindow = explicitlyProtected || paused;
      const active = index === activeWindowIndex;

      if (active) {
        activeWindowCompleted = completed;
        activeWindowProtected = protectedWindow;
      }
      if (completed) {
        current += 1;
        completedWindows += 1;
        best = Math.max(best, current);
      } else if (protectedWindow) {
        protectedWindows += 1;
      } else if (!active) {
        current = 0;
        mostRecentMissedWindow = windowStart;
      }
    }
  }

  const earnedFlexPasses = Math.floor(completedWindows / MOMENTUM_FLEX_EARN_EVERY);
  const flexPassesAvailable = Math.max(
    0,
    Math.min(
      MOMENTUM_MAX_FLEX_PASSES,
      MOMENTUM_STARTER_FLEX_PASSES + earnedFlexPasses - usedFlexPasses,
    ),
  );
  const notStarted = difference < 0;
  const status: MomentumSummary['status'] = notStarted
    ? 'not-started'
    : activeWindowCompleted
      ? 'on-track'
      : activeWindowProtected
        ? 'resting'
        : 'due';

  return {
    cadence: momentum.cadence,
    cadenceDays,
    current,
    best,
    completedWindows,
    protectedWindows,
    usedFlexPasses,
    flexPassesAvailable,
    activeWindowStart,
    nextWindowStart:
      notStarted || (!activeWindowCompleted && !activeWindowProtected)
        ? activeWindowStart
        : addCalendarDays(activeWindowStart, cadenceDays),
    activeWindowCompleted,
    activeWindowProtected,
    mostRecentMissedWindow,
    status,
  };
}

export function momentumMilestone(current: number): string | null {
  if (current >= 100) return '100-win constellation';
  if (current >= 60) return '60-win glow';
  if (current >= 30) return '30-win orbit';
  if (current >= 14) return '14-win rhythm';
  if (current >= 7) return '7-win rhythm';
  if (current >= 3) return '3-win beginning';
  return null;
}
