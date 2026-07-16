import { countOpportunities } from './schedule';
import { recentDateKeys } from './time';
import type { Completion, Habit, RhythmSummary } from './types';

export function rhythmForHabit(
  habit: Habit,
  completions: Completion[],
  now: Date,
  timeZone: string,
  windowDays = 14,
): RhythmSummary {
  const window = recentDateKeys(now, timeZone, windowDays);
  const relevant = completions.filter(
    (completion) => completion.habitId === habit.id && window.includes(completion.localDate),
  );
  const activeDays = new Set(relevant.map((completion) => completion.localDate)).size;
  const wins = relevant.length;
  const opportunities = Math.max(
    1,
    countOpportunities(habit, now, timeZone, windowDays),
  );

  const ordered = [...completions]
    .filter((completion) => completion.habitId === habit.id)
    .sort((a, b) => a.localDate.localeCompare(b.localDate));
  const last = ordered.at(-1);
  const previous = ordered.at(-2);
  const comeback =
    Boolean(last && previous) &&
    Math.abs(Date.parse(`${last?.localDate}T00:00:00Z`) -
      Date.parse(`${previous?.localDate}T00:00:00Z`)) >=
      3 * 86_400_000;

  return {
    wins,
    activeDays,
    opportunities,
    percentage: Math.min(100, Math.round((activeDays / opportunities) * 100)),
    comeback,
  };
}
