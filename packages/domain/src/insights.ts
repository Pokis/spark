import type {
  Completion,
  FocusSession,
  Habit,
  SupportiveInsight,
} from './types';
import { recentDateKeys } from './time';

export function supportiveInsights(input: {
  habits: Habit[];
  completions: Completion[];
  focusSessions: FocusSession[];
  now: Date;
  timeZone: string;
}): SupportiveInsight[] {
  const week = new Set(recentDateKeys(input.now, input.timeZone, 7));
  const recent = input.completions.filter((completion) =>
    week.has(completion.localDate),
  );
  const insights: SupportiveInsight[] = [];

  if (recent.length >= 3) {
    const tiny = recent.filter((completion) => completion.variantKind === 'tiny').length;
    if (tiny / recent.length >= 0.5) {
      insights.push({
        id: 'week-tiny-useful',
        title: 'Tiny was useful this week.',
        body: `${tiny} of ${recent.length} recent wins used the smallest version. Resizing was part of the strategy.`,
        kind: 'habit-size',
      });
    }
  }

  for (const habit of input.habits) {
    const habitRecent = recent.filter((completion) => completion.habitId === habit.id);
    const contexts = habitRecent
      .map((completion) => completion.context)
      .filter((context): context is NonNullable<typeof context> =>
        Boolean(context && context !== 'anywhere'),
      );
    if (contexts.length < 2) continue;
    const counts = new Map<string, number>();
    for (const context of contexts) counts.set(context, (counts.get(context) ?? 0) + 1);
    const [best, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    if (best && count && count >= 2) {
      insights.push({
        id: `context-${habit.id}-${best}`,
        title: `${habit.title} often fits at ${best}.`,
        body: `${count} recent wins happened in that context. You can keep using that cue if it helps.`,
        kind: 'context',
        habitId: habit.id,
      });
    }
  }

  const completedFocus = input.focusSessions.filter(
    (session) => session.endedAt && session.completed,
  );
  if (completedFocus.length >= 3) {
    const groups = new Map<number, { completed: number; total: number }>();
    for (const session of input.focusSessions.filter((item) => item.endedAt)) {
      const minutes = Math.max(1, Math.round(session.plannedSeconds / 60));
      const group = groups.get(minutes) ?? { completed: 0, total: 0 };
      group.total += 1;
      if (session.completed) group.completed += 1;
      groups.set(minutes, group);
    }
    const ranked = [...groups.entries()]
      .filter(([, value]) => value.total >= 2)
      .sort(
        (a, b) =>
          b[1].completed / b[1].total - a[1].completed / a[1].total ||
          a[0] - b[0],
      );
    const best = ranked[0];
    if (best) {
      insights.push({
        id: `focus-${best[0]}`,
        title: `${best[0]}-minute focus blocks have fit well.`,
        body: `${best[1].completed} of ${best[1].total} recent blocks at this size reached their planned finish.`,
        kind: 'focus',
      });
    }
  }

  return insights.slice(0, 6);
}
